package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository"
	reportmodels "BitComercio/internal/usecases/reports/models"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

const (
	estatusAceptadoGuid = "86968037-975a-43ce-880c-043003010105"
)

type ReportsService struct {
	db *gorm.DB
}

func (s *ReportsService) SearchKardexProducts(search string) ([]reportmodels.KardexProductOption, error) {
	term := "%" + strings.TrimSpace(search) + "%"
	var products []reportmodels.KardexProductOption
	err := s.db.Raw(`
		SELECT ne.id AS nivel_id, COALESCE(ne.codigo,'') AS codigo,
		 COALESCE(p.descripcion,'') AS producto, COALESCE(e.empaque,'') AS empaque,
		 COALESCE(ne.img_referencia,'') AS imagen
		FROM nivel_empaque ne JOIN productos p ON p.id=ne.producto_id AND p.deleted_at IS NULL
		LEFT JOIN empaques e ON e.id=ne.empaque_id AND e.deleted_at IS NULL
		WHERE ne.deleted_at IS NULL
		 AND (?='' OR CAST(ne.id AS TEXT) ILIKE ? OR ne.codigo ILIKE ? OR p.descripcion ILIKE ? OR e.empaque ILIKE ?)
		ORDER BY CASE WHEN CAST(ne.id AS TEXT)=? THEN 0 ELSE 1 END,p.descripcion,e.empaque
		LIMIT 60`, strings.TrimSpace(search), term, term, term, term, strings.TrimSpace(search)).Scan(&products).Error
	return products, err
}

func (s *ReportsService) RefreshTodayStock(sucursalID uint) error {
	return repository.NewMovimientoDiarioStockRepository(s.db).Recalcular(time.Now(), sucursalID)
}

func (s *ReportsService) BuildKardexReport(request reportmodels.KardexReportRequest) (reportmodels.KardexReport, error) {
	var report reportmodels.KardexReport
	start, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(request.FechaInicio), time.Local)
	if err != nil {
		return report, fmt.Errorf("la fecha inicial no es valida")
	}
	end, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(request.FechaFin), time.Local)
	if err != nil {
		return report, fmt.Errorf("la fecha final no es valida")
	}
	if end.Before(start) {
		return report, fmt.Errorf("la fecha final no puede ser anterior a la fecha inicial")
	}
	if request.NivelID == 0 {
		return report, fmt.Errorf("selecciona un producto para consultar su kardex")
	}

	report.FechaInicio, report.FechaFin = start.Format("2006-01-02"), end.Format("2006-01-02")
	report.GeneradoEn = time.Now().Format(time.RFC3339)
	report.Resumen = make([]reportmodels.KardexDailyRow, 0)
	report.Movimientos = make([]reportmodels.KardexMovementRow, 0)
	if err := s.db.Raw(`SELECT ne.id AS nivel_id, COALESCE(ne.codigo,'') AS codigo,
		COALESCE(p.descripcion,'') AS producto, COALESCE(e.empaque,'') AS empaque,
		COALESCE(ne.img_referencia,'') AS imagen FROM nivel_empaque ne
		JOIN productos p ON p.id=ne.producto_id AND p.deleted_at IS NULL
		LEFT JOIN empaques e ON e.id=ne.empaque_id AND e.deleted_at IS NULL
		WHERE ne.id=? AND ne.deleted_at IS NULL`, request.NivelID).Scan(&report.Producto).Error; err != nil {
		return report, err
	}
	if report.Producto.NivelID == 0 {
		return report, fmt.Errorf("el nivel de empaque seleccionado no existe")
	}

	if end.Format("2006-01-02") >= time.Now().Format("2006-01-02") {
		if err := s.RefreshTodayStock(request.SucursalID); err != nil {
			return report, fmt.Errorf("no se pudo actualizar el movimiento diario actual: %w", err)
		}
	}
	if err := s.db.Raw(`
		SELECT TO_CHAR(fecha_registro,'YYYY-MM-DD') fecha,
		 inventario_inicial::double precision, compras::double precision, ventas::double precision,
		 transferencias_entrada::double precision, transferencias_salida::double precision,
		 bajas_mercancia::double precision, conversiones::double precision,
		 ajustes_auditoria::double precision, inventario_final::double precision
		FROM movimiento_diario_stock WHERE nivel_id=? AND deleted_at IS NULL
		 AND fecha_registro>=? AND fecha_registro<? ORDER BY fecha_registro`, request.NivelID, start, end.AddDate(0, 0, 1)).Scan(&report.Resumen).Error; err != nil {
		return report, fmt.Errorf("no se pudo consultar el resumen diario: %w", err)
	}
	if len(report.Resumen) > 0 {
		report.SaldoInicial = report.Resumen[0].InventarioInicial
		report.SaldoFinal = report.Resumen[len(report.Resumen)-1].InventarioFinal
		for _, day := range report.Resumen {
			report.Entradas += day.Compras + day.TransferenciasEntrada
			report.Salidas += day.Ventas + day.TransferenciasSalida + day.BajasMercancia
			if day.Conversiones >= 0 {
				report.Entradas += day.Conversiones
			} else {
				report.Salidas -= day.Conversiones
			}
			if day.AjustesAuditoria >= 0 {
				report.Entradas += day.AjustesAuditoria
			} else {
				report.Salidas -= day.AjustesAuditoria
			}
		}
	}

	type rawMovement struct {
		Fecha                 time.Time
		Tipo, Documento, Nota string
		Entrada, Salida       float64
	}
	var raw []rawMovement
	if err := s.db.Raw(`
		WITH movimientos AS (
		 SELECT p.fecha fecha,
		  CASE tp.guid::text WHEN ? THEN 'VENTA' WHEN ? THEN 'COMPRA' WHEN ? THEN 'BAJA' END tipo,
		  LPAD(p.folio::text,8,'0') documento,
		  CASE WHEN tp.guid::text=? THEN pd.cantidad ELSE 0 END entrada,
		  CASE WHEN tp.guid::text IN (?,?) THEN pd.cantidad ELSE 0 END salida,
		  COALESCE(p.comentarios,'') nota
		 FROM pedidos p JOIN tipos_pedido tp ON tp.id=p.tipo_pedido_id AND tp.deleted_at IS NULL
		 JOIN estatus es ON es.id=p.estatus_id AND es.deleted_at IS NULL
		 JOIN pedido_detalle pd ON pd.pedido_id=p.id AND pd.deleted_at IS NULL
		 WHERE p.deleted_at IS NULL AND pd.nivel_id=? AND p.fecha>=? AND p.fecha<?
		  AND (?=0 OR p.sucursal_origen_id=?) AND es.guid::text IN ?
		  AND tp.guid::text IN (?,?,?)
		 UNION ALL
		 SELECT COALESCE(t.fecha_recepcion,t.fecha_envio), 'TRANSFERENCIA', LPAD(p.folio::text,8,'0'),
		  CASE WHEN t.sucursal_destino_id=? THEN pd.cantidad ELSE 0 END,
		  CASE WHEN t.sucursal_origen_id=? THEN pd.cantidad ELSE 0 END, COALESCE(p.comentarios,'')
		 FROM traspasos t JOIN pedidos p ON p.id=t.pedido_id AND p.deleted_at IS NULL
		 JOIN pedido_detalle pd ON pd.pedido_id=p.id AND pd.deleted_at IS NULL
		 JOIN estatus es ON es.id=t.estatus_id AND es.deleted_at IS NULL
		 WHERE t.deleted_at IS NULL AND pd.nivel_id=? AND es.guid::text=?
		  AND COALESCE(t.fecha_recepcion,t.fecha_envio)>=? AND COALESCE(t.fecha_recepcion,t.fecha_envio)<?
		  AND (t.sucursal_origen_id=? OR t.sucursal_destino_id=?)
		 UNION ALL
		 SELECT p.fecha, 'CONVERSION', LPAD(p.folio::text,8,'0'), 0, pd.cantidad, 'Salida por conversion'
		 FROM pedidos p JOIN tipos_pedido tp ON tp.id=p.tipo_pedido_id
		 JOIN estatus es ON es.id=p.estatus_id JOIN pedido_detalle pd ON pd.pedido_id=p.id
		 WHERE p.deleted_at IS NULL AND pd.deleted_at IS NULL AND pd.nivel_id=? AND tp.guid::text=?
		  AND es.guid::text IN ? AND p.fecha>=? AND p.fecha<? AND (?=0 OR p.sucursal_origen_id=?)
		 UNION ALL
		 SELECT p.fecha, 'CONVERSION', LPAD(p.folio::text,8,'0'),
		  COALESCE((pd.info_adicional::jsonb->>'cantidadDestino')::numeric,0), 0, 'Entrada por conversion'
		 FROM pedidos p JOIN tipos_pedido tp ON tp.id=p.tipo_pedido_id
		 JOIN estatus es ON es.id=p.estatus_id JOIN pedido_detalle pd ON pd.pedido_id=p.id
		 JOIN nivel_empaque nd ON nd.guid::text=pd.info_adicional::jsonb->>'nivelDestinoGuid'
		 WHERE p.deleted_at IS NULL AND pd.deleted_at IS NULL AND nd.id=? AND tp.guid::text=?
		  AND es.guid::text IN ? AND p.fecha>=? AND p.fecha<? AND (?=0 OR p.sucursal_origen_id=?)
		 UNION ALL
		 SELECT COALESCE(a.fecha,a.updated_at), 'AJUSTE', 'AUD-'||LPAD(a.id::text,6,'0'),
		  GREATEST(ap.conteo_fisico-ap.en_existencia,0), GREATEST(ap.en_existencia-ap.conteo_fisico,0), COALESCE(ap.nota,'')
		 FROM auditoria_producto ap JOIN auditoria a ON a.id=ap.auditoria_id AND a.deleted_at IS NULL
		 JOIN estatus es ON es.id=a.estatus_id AND es.deleted_at IS NULL
		 WHERE ap.deleted_at IS NULL AND ap.nivel_id=? AND es.guid::text IN ?
		  AND COALESCE(a.fecha,a.updated_at)>=? AND COALESCE(a.fecha,a.updated_at)<? AND (?=0 OR a.centro_id=?)
		) SELECT * FROM movimientos ORDER BY fecha,documento`,
		models.TipoPedidoVentaGuid, models.TipoPedidoCompraGuid, models.TipoPedidoBajaMercanciaGuid,
		models.TipoPedidoCompraGuid, models.TipoPedidoVentaGuid, models.TipoPedidoBajaMercanciaGuid,
		request.NivelID, start, end.AddDate(0, 0, 1), request.SucursalID, request.SucursalID,
		[]string{models.EstatusConfirmadoGuid, models.EstatusCompletadoGuid}, models.TipoPedidoVentaGuid, models.TipoPedidoCompraGuid, models.TipoPedidoBajaMercanciaGuid,
		request.SucursalID, request.SucursalID, request.NivelID, estatusAceptadoGuid, start, end.AddDate(0, 0, 1), request.SucursalID, request.SucursalID,
		request.NivelID, models.TipoPedidoConversionGuid, []string{models.EstatusConfirmadoGuid, models.EstatusCompletadoGuid}, start, end.AddDate(0, 0, 1), request.SucursalID, request.SucursalID,
		request.NivelID, models.TipoPedidoConversionGuid, []string{models.EstatusConfirmadoGuid, models.EstatusCompletadoGuid}, start, end.AddDate(0, 0, 1), request.SucursalID, request.SucursalID,
		request.NivelID, []string{models.EstatusConfirmadoGuid, models.EstatusCompletadoGuid}, start, end.AddDate(0, 0, 1), request.SucursalID, request.SucursalID,
	).Scan(&raw).Error; err != nil {
		return report, fmt.Errorf("no se pudo consultar el detalle del kardex: %w", err)
	}

	balance := report.SaldoInicial
	detailEntries, detailOutputs := 0.0, 0.0
	for _, item := range raw {
		balance += item.Entrada - item.Salida
		detailEntries += item.Entrada
		detailOutputs += item.Salida
		report.Movimientos = append(report.Movimientos, reportmodels.KardexMovementRow{
			Fecha: item.Fecha.Format(time.RFC3339), Tipo: item.Tipo, Documento: item.Documento,
			Entrada: item.Entrada, Salida: item.Salida, Existencia: balance, Nota: item.Nota,
		})
	}
	if len(report.Resumen) == 0 {
		report.Entradas = detailEntries
		report.Salidas = detailOutputs
		report.SaldoFinal = balance
	}
	if request.SucursalID > 0 {
		var identity struct {
			Sucursal string
			Empresa  string
		}
		if err := s.db.Raw(`
			SELECT COALESCE(s.nombre_sucursal, '') AS sucursal,
				COALESCE(NULLIF(e.nombre_comercial, ''), e.razon_social, '') AS empresa
			FROM sucursales s
			LEFT JOIN empresas e ON e.id = s.empresa_id AND e.deleted_at IS NULL
			WHERE s.id = ? AND s.deleted_at IS NULL`, request.SucursalID).Scan(&identity).Error; err == nil {
			report.Sucursal = identity.Sucursal
			report.Empresa = identity.Empresa
		}
	}
	return report, nil
}

func NewReportsService(db *gorm.DB) *ReportsService {
	return &ReportsService{db: db}
}

func (s *ReportsService) BuildSoldProductsReport(fechaInicio, fechaFin string, sucursalID uint) (reportmodels.SoldProductsReport, error) {
	var report reportmodels.SoldProductsReport
	start, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(fechaInicio), time.Local)
	if err != nil {
		return report, fmt.Errorf("la fecha inicial no es válida")
	}
	end, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(fechaFin), time.Local)
	if err != nil {
		return report, fmt.Errorf("la fecha final no es válida")
	}
	if end.Before(start) {
		return report, fmt.Errorf("la fecha final no puede ser anterior a la fecha inicial")
	}

	report.FechaInicio = start.Format("2006-01-02")
	report.FechaFin = end.Format("2006-01-02")
	report.GeneradoEn = time.Now().Format(time.RFC3339)
	report.Productos = make([]reportmodels.SoldProductRow, 0)

	query := s.db.Raw(`
		SELECT
			COALESCE(ne.codigo, '') AS codigo,
			COALESCE(NULLIF(TRIM(pr.descripcion), ''), 'Producto sin descripción') AS producto,
			COALESCE(NULLIF(TRIM(em.empaque), ''), 'Sin empaque') AS empaque,
			COALESCE(SUM(pd.cantidad), 0)::double precision AS cantidad
		FROM pedidos p
		JOIN tipos_pedido tp ON tp.id = p.tipo_pedido_id AND tp.deleted_at IS NULL
		JOIN estatus es ON es.id = p.estatus_id AND es.deleted_at IS NULL
		JOIN pedido_detalle pd ON pd.pedido_id = p.id AND pd.deleted_at IS NULL
		JOIN nivel_empaque ne ON ne.id = pd.nivel_id AND ne.deleted_at IS NULL
		JOIN productos pr ON pr.id = ne.producto_id AND pr.deleted_at IS NULL
		LEFT JOIN empaques em ON em.id = ne.empaque_id AND em.deleted_at IS NULL
		WHERE p.deleted_at IS NULL
			AND tp.guid = ?
			AND es.guid IN ?
			AND p.fecha >= ?
			AND p.fecha < ?
			AND (? = 0 OR p.sucursal_origen_id = ?)
		GROUP BY ne.id, ne.codigo, pr.descripcion, em.empaque
		ORDER BY producto, empaque, codigo`,
		models.TipoPedidoVentaGuid,
		[]string{models.EstatusConfirmadoGuid, models.EstatusCompletadoGuid},
		start,
		end.AddDate(0, 0, 1),
		sucursalID,
		sucursalID,
	)
	if err := query.Scan(&report.Productos).Error; err != nil {
		return report, fmt.Errorf("no se pudo consultar el conteo de productos vendidos: %w", err)
	}

	for _, row := range report.Productos {
		report.TotalUnidades += row.Cantidad
	}
	report.TotalProductos = len(report.Productos)

	if sucursalID > 0 {
		var identity struct {
			Sucursal string
			Empresa  string
		}
		if err := s.db.Raw(`
			SELECT COALESCE(s.nombre_sucursal, '') AS sucursal,
				COALESCE(NULLIF(e.nombre_comercial, ''), e.razon_social, '') AS empresa
			FROM sucursales s
			LEFT JOIN empresas e ON e.id = s.empresa_id AND e.deleted_at IS NULL
			WHERE s.id = ? AND s.deleted_at IS NULL`, sucursalID).Scan(&identity).Error; err != nil {
			return report, fmt.Errorf("no se pudo obtener la sucursal del reporte: %w", err)
		}
		report.Sucursal = identity.Sucursal
		report.Empresa = identity.Empresa
	}

	return report, nil
}

func (s *ReportsService) BuildProfitReport(fechaInicio, fechaFin string, sucursalID uint) (reportmodels.ProfitReport, error) {
	var report reportmodels.ProfitReport
	start, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(fechaInicio), time.Local)
	if err != nil {
		return report, fmt.Errorf("la fecha inicial no es válida")
	}
	end, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(fechaFin), time.Local)
	if err != nil {
		return report, fmt.Errorf("la fecha final no es válida")
	}
	if end.Before(start) {
		return report, fmt.Errorf("la fecha final no puede ser anterior a la fecha inicial")
	}

	report.FechaInicio = start.Format("2006-01-02")
	report.FechaFin = end.Format("2006-01-02")
	report.GeneradoEn = time.Now().Format(time.RFC3339)
	report.Productos = make([]reportmodels.ProfitReportRow, 0)

	err = s.db.Raw(`
		SELECT
			p.folio,
			TO_CHAR(p.fecha, 'YYYY-MM-DD') AS fecha,
			COALESCE(ne.codigo, '') AS codigo,
			COALESCE(NULLIF(TRIM(pr.descripcion), ''), 'Producto sin descripción') AS producto,
			COALESCE(NULLIF(TRIM(em.empaque), ''), 'Sin empaque') AS empaque,
			pd.cantidad::double precision AS cantidad,
			(pd.cantidad * pd.precio_venta)::double precision AS venta,
			COALESCE(pd.descuento, 0)::double precision AS descuento,
			(pd.cantidad * pd.precio_compra)::double precision AS costo,
			((pd.cantidad * pd.precio_venta) - COALESCE(pd.descuento, 0) - (pd.cantidad * pd.precio_compra))::double precision AS utilidad
		FROM pedidos p
		JOIN tipos_pedido tp ON tp.id = p.tipo_pedido_id AND tp.deleted_at IS NULL
		JOIN estatus es ON es.id = p.estatus_id AND es.deleted_at IS NULL
		JOIN pedido_detalle pd ON pd.pedido_id = p.id AND pd.deleted_at IS NULL
		JOIN nivel_empaque ne ON ne.id = pd.nivel_id AND ne.deleted_at IS NULL
		JOIN productos pr ON pr.id = ne.producto_id AND pr.deleted_at IS NULL
		LEFT JOIN empaques em ON em.id = ne.empaque_id AND em.deleted_at IS NULL
		WHERE p.deleted_at IS NULL
			AND tp.guid = ?
			AND es.guid = ?
			AND p.fecha >= ?
			AND p.fecha < ?
			AND (? = 0 OR p.sucursal_origen_id = ?)
		ORDER BY p.fecha, p.folio, producto, empaque`,
		models.TipoPedidoVentaGuid,
		models.EstatusCompletadoGuid,
		start,
		end.AddDate(0, 0, 1),
		sucursalID,
		sucursalID,
	).Scan(&report.Productos).Error
	if err != nil {
		return report, fmt.Errorf("no se pudo consultar la utilidad de las ventas: %w", err)
	}

	for _, row := range report.Productos {
		report.TotalVentas += row.Venta
		report.TotalDescuento += row.Descuento
		report.TotalCosto += row.Costo
		report.TotalUtilidad += row.Utilidad
	}

	if sucursalID > 0 {
		var identity struct {
			Sucursal string
			Empresa  string
		}
		if err := s.db.Raw(`
			SELECT COALESCE(s.nombre_sucursal, '') AS sucursal,
				COALESCE(NULLIF(e.nombre_comercial, ''), e.razon_social, '') AS empresa
			FROM sucursales s
			LEFT JOIN empresas e ON e.id = s.empresa_id AND e.deleted_at IS NULL
			WHERE s.id = ? AND s.deleted_at IS NULL`, sucursalID).Scan(&identity).Error; err != nil {
			return report, fmt.Errorf("no se pudo obtener la sucursal del reporte: %w", err)
		}
		report.Sucursal = identity.Sucursal
		report.Empresa = identity.Empresa
	}

	return report, nil
}

func (s *ReportsService) BuildAuditReport(request reportmodels.AuditReportRequest) (reportmodels.AuditReport, error) {
	report := reportmodels.AuditReport{
		FechaImpresion: time.Now().Format(time.RFC3339),
		ConExistencia:  request.ConExistencia,
		Productos:      make([]reportmodels.AuditReportRow, 0),
	}

	query := `
		SELECT
			COALESCE(NULLIF(TRIM(li.nombre_linea), ''), 'Sin línea') AS linea,
			COALESCE(NULLIF(TRIM(ma.nombre_marca), ''), 'Sin marca') AS marca,
			COALESCE(ne.codigo, '') AS codigo,
			COALESCE(NULLIF(TRIM(pr.descripcion), ''), 'Producto sin descripción') AS producto,
			COALESCE(NULLIF(TRIM(em.empaque), ''), 'Sin empaque') AS empaque,
			COALESCE(sp.existencia, 0)::double precision AS existencia
		FROM nivel_empaque ne
		JOIN productos pr ON pr.id = ne.producto_id AND pr.deleted_at IS NULL
		LEFT JOIN empaques em ON em.id = ne.empaque_id AND em.deleted_at IS NULL
		LEFT JOIN lineas li ON li.id = pr.linea_id AND li.deleted_at IS NULL
		LEFT JOIN marcas ma ON ma.id = pr.marca_id AND ma.deleted_at IS NULL
		LEFT JOIN sucursal_producto sp ON sp.nivel_id = ne.id AND sp.deleted_at IS NULL
		WHERE ne.deleted_at IS NULL
			AND (ne.activo = TRUE OR COALESCE(sp.existencia, 0) > 0)`
	args := make([]any, 0, 2)
	if len(request.LineasIDs) > 0 {
		query += " AND pr.linea_id IN ?"
		args = append(args, request.LineasIDs)
	}
	if len(request.MarcasIDs) > 0 {
		query += " AND pr.marca_id IN ?"
		args = append(args, request.MarcasIDs)
	}
	if request.ConExistencia {
		query += " AND COALESCE(sp.existencia, 0) > 0"
	}
	query += " ORDER BY linea, producto, empaque, codigo"

	if err := s.db.Raw(query, args...).Scan(&report.Productos).Error; err != nil {
		return report, fmt.Errorf("no se pudo consultar el inventario para auditoría: %w", err)
	}
	report.TotalProductos = len(report.Productos)

	if request.SucursalID > 0 {
		var identity struct {
			Sucursal string
			Empresa  string
		}
		if err := s.db.Raw(`
			SELECT COALESCE(s.nombre_sucursal, '') AS sucursal,
				COALESCE(NULLIF(e.nombre_comercial, ''), e.razon_social, '') AS empresa
			FROM sucursales s
			LEFT JOIN empresas e ON e.id = s.empresa_id AND e.deleted_at IS NULL
			WHERE s.id = ? AND s.deleted_at IS NULL`, request.SucursalID).Scan(&identity).Error; err != nil {
			return report, fmt.Errorf("no se pudo obtener la sucursal del reporte: %w", err)
		}
		report.Sucursal = identity.Sucursal
		report.Empresa = identity.Empresa
	}

	return report, nil
}
