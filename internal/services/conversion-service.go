package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ConversionService struct{ db *gorm.DB }

const estatusCanceladoGuid = "86968037-975a-43ce-880c-043003010103"

type conversionMetadata struct {
	ReglaGuid                string          `json:"reglaGuid"`
	NivelDestinoGuid         string          `json:"nivelDestinoGuid"`
	CantidadDestino          decimal.Decimal `json:"cantidadDestino"`
	FactorConversion         decimal.Decimal `json:"factorConversion"`
	PrecioVentaOrigen        decimal.Decimal `json:"precioVentaOrigen"`
	PrecioVentaDestino       decimal.Decimal `json:"precioVentaDestino"`
	ValorVentaOrigen         decimal.Decimal `json:"valorVentaOrigen"`
	ValorVentaDestino        decimal.Decimal `json:"valorVentaDestino"`
	ExistenciaDestinoInicial decimal.Decimal `json:"existenciaDestinoInicial"`
	ExistenciaDestinoFinal   decimal.Decimal `json:"existenciaDestinoFinal"`
}

func NewConversionService(db *gorm.DB) *ConversionService { return &ConversionService{db: db} }

func (s *ConversionService) ConsultarProductos(busqueda string) ([]dto.ConversionProductoDto, error) {
	var productos []dto.ConversionProductoDto
	termino := "%" + strings.TrimSpace(busqueda) + "%"
	err := s.db.Raw(`
		SELECT DISTINCT
			r.id AS regla_id, r.guid::text AS regla_guid,
			nv.id AS nivel_origen_id, nv.guid::text AS nivel_origen_guid,
			COALESCE(nv.codigo, '') AS codigo_origen,
			COALESCE(p.descripcion, '') AS producto_origen,
			COALESCE(e.empaque, '') AS empaque_origen,
			COALESCE(e.contenido, 0) AS contenido_origen,
			COALESCE(uo.nombre_unidad, '') AS unidad_origen,
			COALESCE(nv.img_referencia, '') AS imagen_origen,
			COALESCE(sp.existencia, 0) AS existencia_origen,
			nvb.id AS nivel_destino_id, nvb.guid::text AS nivel_destino_guid,
			COALESCE(nvb.codigo, '') AS codigo_destino,
			COALESCE(pd.descripcion, '') AS producto_destino,
			COALESCE(eb.empaque, '') AS empaque_destino,
			COALESCE(eb.contenido, 0) AS contenido_destino,
			COALESCE(ud.nombre_unidad, '') AS unidad_destino,
			COALESCE(nvb.img_referencia, '') AS imagen_destino,
			COALESCE(spd.existencia, 0) AS existencia_destino,
			r.factor_sugerido, r.factor_conversion
		FROM reglas_conversion_producto r
		INNER JOIN nivel_empaque nv ON nv.id = r.nivel_empaque_origen_id
		LEFT JOIN sucursal_producto sp ON sp.nivel_id = nv.id AND sp.deleted_at IS NULL
		INNER JOIN productos p ON p.id = nv.producto_id
		INNER JOIN empaques e ON e.id = nv.empaque_id
		INNER JOIN nivel_empaque nvb ON nvb.id = r.nivel_empaque_destino_id
		INNER JOIN productos pd ON pd.id = nvb.producto_id
		LEFT JOIN sucursal_producto spd ON spd.nivel_id = nvb.id AND spd.deleted_at IS NULL
		INNER JOIN empaques eb ON eb.id = nvb.empaque_id
		LEFT JOIN sat_unidades_medida uo ON uo.id = e.unidad_sat_id
		LEFT JOIN sat_unidades_medida ud ON ud.id = eb.unidad_sat_id
		WHERE r.activo = TRUE
		  AND nv.activo = TRUE AND nvb.activo = TRUE
		  AND r.deleted_at IS NULL AND p.deleted_at IS NULL AND pd.deleted_at IS NULL
		  AND nv.deleted_at IS NULL AND nvb.deleted_at IS NULL
		  AND (p.descripcion ILIKE ? OR nv.codigo ILIKE ? OR pd.descripcion ILIKE ? OR nvb.codigo ILIKE ?)
		ORDER BY producto_origen, empaque_origen, producto_destino, empaque_destino
	`, termino, termino, termino, termino).Scan(&productos).Error
	return productos, err
}

func (s *ConversionService) EjecutarConversion(datos dto.EjecutarConversionDto) (*dto.ResultadoConversionDto, error) {
	reglaGuid, err := uuid.Parse(strings.TrimSpace(datos.ReglaGuid))
	if err != nil {
		return nil, fmt.Errorf("la regla de conversión no es válida")
	}
	cantidad := decimal.NewFromFloat(datos.Cantidad)
	if cantidad.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("la cantidad a convertir debe ser mayor que cero")
	}

	resultado := &dto.ResultadoConversionDto{}
	err = s.db.Transaction(func(tx *gorm.DB) error {
		var regla models.ReglaConversionProducto
		if err := tx.Preload("NivelEmpaqueOrigen.Producto").Preload("NivelEmpaqueDestino.Producto").Where("guid = ? AND activo = TRUE", reglaGuid).First(&regla).Error; err != nil {
			return fmt.Errorf("la regla de conversión ya no está disponible")
		}
		if datos.OperacionCajeroID == nil || *datos.OperacionCajeroID == 0 {
			return fmt.Errorf("se requiere un turno de caja activo para registrar la conversión")
		}
		var operacion models.OperacionCajero
		if err := tx.Preload("Operacion").Where("id = ? AND fecha_fin IS NULL", *datos.OperacionCajeroID).First(&operacion).Error; err != nil {
			return fmt.Errorf("el turno de caja ya no se encuentra activo")
		}
		var tipo models.TipoPedido
		if err := tx.Where("guid = ? AND deleted_at IS NULL", models.TipoPedidoConversionGuid).First(&tipo).Error; err != nil {
			return fmt.Errorf("sincroniza el tipo de pedido Conversión de producto antes de continuar")
		}
		var completado models.Estatus
		if err := tx.Where("LOWER(nombre) = 'completado' AND deleted_at IS NULL").First(&completado).Error; err != nil {
			return fmt.Errorf("estatus Completado no encontrado")
		}
		var origen, destino models.SucursalProducto
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("nivel_id = ?", regla.NivelEmpaqueOrigenID).First(&origen).Error; err != nil {
			return fmt.Errorf("no se encontró la existencia del producto origen")
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("nivel_id = ?", regla.NivelEmpaqueDestinoID).First(&destino).Error; err != nil {
			return fmt.Errorf("no se encontró la existencia del producto destino")
		}
		if origen.Existencia.LessThan(cantidad) {
			return fmt.Errorf("existencia insuficiente: hay %s unidades disponibles y solicitaste %s", origen.Existencia.String(), cantidad.String())
		}

		cantidadDestino := cantidad.Mul(regla.FactorConversion)
		existenciaDestinoInicial := destino.Existencia
		origen.Existencia = origen.Existencia.Sub(cantidad)
		destino.Existencia = destino.Existencia.Add(cantidadDestino)
		if err := tx.Model(&origen).Updates(map[string]any{"existencia": origen.Existencia, "sync": false}).Error; err != nil {
			return fmt.Errorf("no se pudo descontar la existencia origen: %w", err)
		}
		if err := tx.Model(&destino).Updates(map[string]any{"existencia": destino.Existencia, "sync": false}).Error; err != nil {
			return fmt.Errorf("no se pudo incrementar la existencia destino: %w", err)
		}

		var folio int
		if err := tx.Raw("SELECT nextval('consecutivo_folio_conversion')").Scan(&folio).Error; err != nil {
			return fmt.Errorf("no se pudo generar el folio de la conversión: %w", err)
		}
		tipoID, estatusID, operacionID, sucursalID := tipo.ID, completado.ID, operacion.ID, operacion.Operacion.SucursalID
		pedido := models.Pedido{TipoPedidoID: &tipoID, EstatusID: &estatusID, OperacionCajeroID: &operacionID, SucursalOrigenID: &sucursalID, Folio: folio, Fecha: time.Now(), Sync: false}
		if err := tx.Create(&pedido).Error; err != nil {
			return fmt.Errorf("no se pudo registrar la conversión: %w", err)
		}
		metadata, _ := json.Marshal(conversionMetadata{
			ReglaGuid: regla.Guid.String(), NivelDestinoGuid: regla.NivelEmpaqueDestino.Guid.String(),
			CantidadDestino: cantidadDestino, FactorConversion: regla.FactorConversion,
			PrecioVentaOrigen: origen.PrecioVenta, PrecioVentaDestino: destino.PrecioVenta,
			ValorVentaOrigen: cantidad.Mul(origen.PrecioVenta), ValorVentaDestino: cantidadDestino.Mul(destino.PrecioVenta),
			ExistenciaDestinoInicial: existenciaDestinoInicial, ExistenciaDestinoFinal: destino.Existencia,
		})
		detalle := models.PedidoDetalle{PedidoID: pedido.ID, NivelID: regla.NivelEmpaqueOrigenID, Cantidad: cantidad, PrecioCompra: origen.PrecioCompra, PrecioVenta: origen.PrecioVenta, Descuento: decimal.Zero, TrasladoIVA: decimal.Zero, TasaIVA: decimal.Zero, RetencionISR: decimal.Zero, TasaISR: decimal.Zero, InfoAdicional: string(metadata)}
		if err := tx.Create(&detalle).Error; err != nil {
			return fmt.Errorf("no se pudo registrar el detalle de la conversión: %w", err)
		}
		*resultado = dto.ResultadoConversionDto{CantidadOrigen: cantidad, CantidadDestino: cantidadDestino, ExistenciaOrigen: origen.Existencia, ExistenciaDestino: destino.Existencia, PedidoGuid: pedido.Guid.String(), Folio: folio}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return resultado, nil
}

func (s *ConversionService) ConsultarConversiones() ([]dto.ConversionHistorialDto, error) {
	var items []dto.ConversionHistorialDto
	err := s.db.Raw(`
		SELECT p.guid::text pedido_guid, p.folio, p.fecha::text fecha,
		       es.nombre estatus, es.guid::text estatus_guid, oc.operacion_sucursal_id,
		       no.codigo codigo_origen, po.descripcion producto_origen, eo.empaque empaque_origen,
		       no.img_referencia imagen_origen, pd.cantidad cantidad_origen,
		       nd.codigo codigo_destino, pdest.descripcion producto_destino, ed.empaque empaque_destino,
		       nd.img_referencia imagen_destino,
		       (pd.info_adicional::jsonb->>'cantidadDestino')::numeric cantidad_destino,
		       rc.factor_conversion
		FROM pedidos p
		JOIN tipos_pedido tp ON tp.id=p.tipo_pedido_id AND tp.guid=?
		JOIN estatus es ON es.id=p.estatus_id
		JOIN pedido_detalle pd ON pd.pedido_id=p.id AND pd.deleted_at IS NULL
		JOIN nivel_empaque no ON no.id=pd.nivel_id
		JOIN productos po ON po.id=no.producto_id
		LEFT JOIN empaques eo ON eo.id=no.empaque_id
		JOIN reglas_conversion_producto rc ON rc.guid=(pd.info_adicional::jsonb->>'reglaGuid')::uuid
		JOIN nivel_empaque nd ON nd.id=rc.nivel_empaque_destino_id
		JOIN productos pdest ON pdest.id=nd.producto_id
		LEFT JOIN empaques ed ON ed.id=nd.empaque_id
		LEFT JOIN operacion_cajero oc ON oc.id=p.operacion_cajero_id
		WHERE p.deleted_at IS NULL
		ORDER BY p.fecha DESC, p.folio DESC`, models.TipoPedidoConversionGuid).Scan(&items).Error
	return items, err
}

func (s *ConversionService) CancelarConversion(pedidoGuid string) error {
	guid, err := uuid.Parse(strings.TrimSpace(pedidoGuid))
	if err != nil {
		return fmt.Errorf("identificador de conversión inválido")
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		var pedido models.Pedido
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("TipoPedido").Preload("Estatus").Where("guid = ? AND deleted_at IS NULL", guid).First(&pedido).Error; err != nil {
			return fmt.Errorf("conversión no encontrada")
		}
		if pedido.TipoPedido.Guid.String() != models.TipoPedidoConversionGuid {
			return fmt.Errorf("el pedido no corresponde a una conversión")
		}
		if pedido.Estatus.Guid.String() == estatusCanceladoGuid || strings.EqualFold(pedido.Estatus.Nombre, "Cancelado") {
			return fmt.Errorf("la conversión ya está cancelada")
		}
		var detalle models.PedidoDetalle
		if err := tx.Where("pedido_id = ? AND deleted_at IS NULL", pedido.ID).First(&detalle).Error; err != nil {
			return fmt.Errorf("detalle de conversión no encontrado")
		}
		var metadata conversionMetadata
		if err := json.Unmarshal([]byte(detalle.InfoAdicional), &metadata); err != nil {
			return fmt.Errorf("la conversión no contiene datos para revertirse")
		}
		destinoGuid, err := uuid.Parse(metadata.NivelDestinoGuid)
		if err != nil {
			return fmt.Errorf("nivel destino inválido")
		}
		var origen, destino models.SucursalProducto
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("nivel_id = ?", detalle.NivelID).First(&origen).Error; err != nil {
			return fmt.Errorf("existencia origen no encontrada")
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Joins("JOIN nivel_empaque ne ON ne.id=sucursal_producto.nivel_id").Where("ne.guid = ?", destinoGuid).First(&destino).Error; err != nil {
			return fmt.Errorf("existencia destino no encontrada")
		}
		if destino.Existencia.LessThan(metadata.CantidadDestino) {
			return fmt.Errorf("no es posible cancelar: el producto destino requiere %s unidades y solo dispone de %s", metadata.CantidadDestino.String(), destino.Existencia.String())
		}
		if err := tx.Model(&origen).Updates(map[string]any{"existencia": origen.Existencia.Add(detalle.Cantidad), "sync": false}).Error; err != nil {
			return err
		}
		if err := tx.Model(&destino).Updates(map[string]any{"existencia": destino.Existencia.Sub(metadata.CantidadDestino), "sync": false}).Error; err != nil {
			return err
		}
		var cancelado models.Estatus
		if err := tx.Where("guid = ? AND deleted_at IS NULL", estatusCanceladoGuid).First(&cancelado).Error; err != nil {
			return fmt.Errorf("estatus Cancelado no encontrado")
		}
		actualizacion := tx.Model(&models.Pedido{}).
			Where("id = ? AND deleted_at IS NULL", pedido.ID).
			UpdateColumns(map[string]any{
				"estatus_id": cancelado.ID,
				"sync":       false,
				"updated_at": time.Now(),
			})
		if actualizacion.Error != nil {
			return fmt.Errorf("no se pudo actualizar el estatus de la conversión: %w", actualizacion.Error)
		}
		if actualizacion.RowsAffected != 1 {
			return fmt.Errorf("no se actualizó el estatus de la conversión")
		}
		var estatusID uint
		if err := tx.Model(&models.Pedido{}).Where("id = ?", pedido.ID).Pluck("estatus_id", &estatusID).Error; err != nil {
			return fmt.Errorf("no se pudo confirmar el estatus de la conversión: %w", err)
		}
		if estatusID != cancelado.ID {
			return fmt.Errorf("el estatus Cancelado no fue aplicado a la conversión")
		}
		return nil
	})
}
