package services

import (
	"BitComercio/internal/models"
	reportmodels "BitComercio/internal/usecases/reports/models"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

const (
	estatusConfirmadoGuid = "86968037-975a-43ce-880c-043003010101"
	estatusCompletadoGuid = "cd810479-c2da-43b0-b58c-35e631da5bf5"
)

type ReportsService struct {
	db *gorm.DB
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
		[]string{estatusConfirmadoGuid, estatusCompletadoGuid},
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
		estatusCompletadoGuid,
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
	} else {
		query += " AND COALESCE(sp.existencia, 0) <= 0"
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
