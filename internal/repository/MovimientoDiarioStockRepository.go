package repository

import (
	"BitComercio/internal/models"
	"encoding/json"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type MovimientoDiarioStockRepository struct{ db *gorm.DB }

func NewMovimientoDiarioStockRepository(db *gorm.DB) *MovimientoDiarioStockRepository {
	return &MovimientoDiarioStockRepository{db: db}
}

func fechaLocal(fecha time.Time) time.Time {
	y, m, d := fecha.In(time.Local).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.Local)
}

// Inicializar captura una sola vez el saldo inicial de cada nivel para el dia.
func (r *MovimientoDiarioStockRepository) Inicializar(tx *gorm.DB, fecha time.Time) error {
	if tx == nil {
		tx = r.db
	}
	dia := fechaLocal(fecha)
	var inventario []models.SucursalProducto
	if err := tx.Where("deleted_at IS NULL").Find(&inventario).Error; err != nil {
		return fmt.Errorf("no se pudo leer el inventario inicial diario: %w", err)
	}
	for _, item := range inventario {
		registro := models.MovimientoDiarioStock{
			FechaRegistro: dia, NivelID: item.NivelID,
			InventarioInicial: item.Existencia, InventarioFinal: item.Existencia,
		}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&registro).Error; err != nil {
			return fmt.Errorf("no se pudo crear el saldo diario del nivel %d: %w", item.NivelID, err)
		}
	}
	return nil
}

type acumuladoNivel struct {
	NivelID                                                      uint
	Compras, Ventas, TransferenciasEntrada, TransferenciasSalida decimal.Decimal
	BajasMercancia, Conversiones, AjustesAuditoria               decimal.Decimal
}

type conversionInfo struct {
	NivelDestinoGuid string          `json:"nivelDestinoGuid"`
	CantidadDestino  decimal.Decimal `json:"cantidadDestino"`
}

// Recalcular sobrescribe exclusivamente el registro del dia indicado a partir
// de documentos confirmados y transferencias aceptadas.
func (r *MovimientoDiarioStockRepository) Recalcular(fecha time.Time, sucursalID uint) error {
	dia := fechaLocal(fecha)
	if !dia.Equal(fechaLocal(time.Now())) {
		return fmt.Errorf("solo se puede recalcular el movimiento de la fecha actual")
	}
	inicio, fin := dia, dia.AddDate(0, 0, 1)
	return r.db.Transaction(func(tx *gorm.DB) error {
		acumulados := map[uint]*acumuladoNivel{}
		get := func(id uint) *acumuladoNivel {
			if acumulados[id] == nil {
				acumulados[id] = &acumuladoNivel{NivelID: id}
			}
			return acumulados[id]
		}

		type pedidoRow struct {
			NivelID  uint
			TipoGuid string
			Cantidad decimal.Decimal
		}
		var pedidos []pedidoRow
		if err := tx.Raw(`
			SELECT pd.nivel_id, tp.guid::text tipo_guid,
			       COALESCE(SUM(pd.cantidad), 0) cantidad
			FROM pedidos p
			JOIN tipos_pedido tp ON tp.id=p.tipo_pedido_id AND tp.deleted_at IS NULL
			JOIN estatus es ON es.id=p.estatus_id AND es.deleted_at IS NULL
			JOIN pedido_detalle pd ON pd.pedido_id=p.id AND pd.deleted_at IS NULL
			WHERE p.deleted_at IS NULL AND p.fecha>=? AND p.fecha<?
			  AND (?=0 OR p.sucursal_origen_id=?)
			  AND es.guid::text IN ?
			  AND tp.guid::text IN ?
			GROUP BY pd.nivel_id, tp.guid`, inicio, fin,
			sucursalID, sucursalID,
			[]string{models.EstatusConfirmadoGuid, models.EstatusCompletadoGuid},
			[]string{models.TipoPedidoVentaGuid, models.TipoPedidoCompraGuid, models.TipoPedidoBajaMercanciaGuid},
		).Scan(&pedidos).Error; err != nil {
			return fmt.Errorf("no se pudieron calcular los pedidos diarios: %w", err)
		}

		for _, row := range pedidos {
			a := get(row.NivelID)
			switch row.TipoGuid {
			case models.TipoPedidoVentaGuid:
				a.Ventas = a.Ventas.Add(row.Cantidad)
			case models.TipoPedidoCompraGuid:
				a.Compras = a.Compras.Add(row.Cantidad)
			case models.TipoPedidoBajaMercanciaGuid:
				a.BajasMercancia = a.BajasMercancia.Add(row.Cantidad)
			}
		}
		type conversionRow struct {
			NivelID       uint
			Cantidad      decimal.Decimal
			InfoAdicional string
		}
		var conversiones []conversionRow
		if err := tx.Raw(`
			SELECT pd.nivel_id, pd.cantidad, pd.info_adicional
			FROM pedidos p JOIN tipos_pedido tp ON tp.id=p.tipo_pedido_id AND tp.deleted_at IS NULL
			JOIN estatus es ON es.id=p.estatus_id AND es.deleted_at IS NULL
			JOIN pedido_detalle pd ON pd.pedido_id=p.id AND pd.deleted_at IS NULL
			WHERE p.deleted_at IS NULL AND p.fecha>=? AND p.fecha<?
			 AND (?=0 OR p.sucursal_origen_id=?) AND tp.guid::text=? AND es.guid::text IN ?`,
			inicio, fin, sucursalID, sucursalID, models.TipoPedidoConversionGuid,
			[]string{models.EstatusConfirmadoGuid, models.EstatusCompletadoGuid}).Scan(&conversiones).Error; err != nil {
			return fmt.Errorf("no se pudieron calcular las conversiones diarias: %w", err)
		}
		for _, row := range conversiones {
			get(row.NivelID).Conversiones = get(row.NivelID).Conversiones.Sub(row.Cantidad)
			var metadata conversionInfo
			if json.Unmarshal([]byte(row.InfoAdicional), &metadata) == nil && metadata.NivelDestinoGuid != "" {
				var destino models.NivelEmpaque
				if err := tx.Select("id").Where("guid = ?", metadata.NivelDestinoGuid).First(&destino).Error; err == nil {
					get(destino.ID).Conversiones = get(destino.ID).Conversiones.Add(metadata.CantidadDestino)
				}
			}
		}

		type transferRow struct {
			NivelID         uint
			Entrada, Salida decimal.Decimal
		}
		var transferencias []transferRow
		if err := tx.Raw(`
			SELECT pd.nivel_id,
			 COALESCE(SUM(CASE WHEN t.sucursal_destino_id=? THEN pd.cantidad ELSE 0 END),0) entrada,
			 COALESCE(SUM(CASE WHEN t.sucursal_origen_id=? THEN pd.cantidad ELSE 0 END),0) salida
			FROM traspasos t JOIN estatus es ON es.id=t.estatus_id AND es.deleted_at IS NULL
			JOIN pedido_detalle pd ON pd.pedido_id=t.pedido_id AND pd.deleted_at IS NULL
			WHERE t.deleted_at IS NULL AND es.guid::text=?
			 AND COALESCE(t.fecha_recepcion,t.fecha_envio)>=? AND COALESCE(t.fecha_recepcion,t.fecha_envio)<?
			 AND (t.sucursal_origen_id=? OR t.sucursal_destino_id=?)
			GROUP BY pd.nivel_id`, sucursalID, sucursalID, estatusTraspasoAceptadoGuid,
			inicio, fin, sucursalID, sucursalID).Scan(&transferencias).Error; err != nil {
			return fmt.Errorf("no se pudieron calcular las transferencias diarias: %w", err)
		}
		for _, row := range transferencias {
			a := get(row.NivelID)
			a.TransferenciasEntrada = row.Entrada
			a.TransferenciasSalida = row.Salida
		}

		type auditRow struct {
			NivelID uint
			Ajuste  decimal.Decimal
		}
		var ajustes []auditRow
		if err := tx.Raw(`
			SELECT ap.nivel_id, COALESCE(SUM(ap.conteo_fisico-ap.en_existencia),0) ajuste
			FROM auditoria_producto ap JOIN auditoria a ON a.id=ap.auditoria_id AND a.deleted_at IS NULL
			JOIN estatus es ON es.id=a.estatus_id AND es.deleted_at IS NULL
			WHERE ap.deleted_at IS NULL AND COALESCE(a.fecha,a.updated_at)>=? AND COALESCE(a.fecha,a.updated_at)<?
			 AND (?=0 OR a.centro_id=?) AND es.guid::text IN ? GROUP BY ap.nivel_id`, inicio, fin,
			sucursalID, sucursalID, []string{models.EstatusConfirmadoGuid, models.EstatusCompletadoGuid}).Scan(&ajustes).Error; err != nil {
			return fmt.Errorf("no se pudieron calcular los ajustes de auditoria: %w", err)
		}
		for _, row := range ajustes {
			get(row.NivelID).AjustesAuditoria = row.Ajuste
		}

		var existencias []models.SucursalProducto
		if err := tx.Where("deleted_at IS NULL").Find(&existencias).Error; err != nil {
			return err
		}
		finales := map[uint]decimal.Decimal{}
		for _, item := range existencias {
			finales[item.NivelID] = item.Existencia
			get(item.NivelID)
		}

		for nivelID, a := range acumulados {
			var registro models.MovimientoDiarioStock
			err := tx.Where("fecha_registro=? AND nivel_id=?", dia, nivelID).First(&registro).Error
			if err == gorm.ErrRecordNotFound {
				final := finales[nivelID]
				inicial := final.Sub(a.Compras).Add(a.Ventas).Sub(a.TransferenciasEntrada).Add(a.TransferenciasSalida).Add(a.BajasMercancia).Sub(a.Conversiones).Sub(a.AjustesAuditoria)
				registro = models.MovimientoDiarioStock{FechaRegistro: dia, NivelID: nivelID, InventarioInicial: inicial}
			} else if err != nil {
				return err
			}
			registro.Compras, registro.Ventas = a.Compras, a.Ventas
			registro.TransferenciasEntrada, registro.TransferenciasSalida = a.TransferenciasEntrada, a.TransferenciasSalida
			registro.BajasMercancia, registro.Conversiones = a.BajasMercancia, a.Conversiones
			registro.AjustesAuditoria, registro.InventarioFinal = a.AjustesAuditoria, finales[nivelID]
			if err := tx.Save(&registro).Error; err != nil {
				return fmt.Errorf("no se pudo actualizar el movimiento diario del nivel %d: %w", nivelID, err)
			}
		}
		return nil
	})
}
