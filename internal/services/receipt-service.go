package services

import (
	reportmodels "BitComercio/internal/usecases/reports/models"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type ReceiptService struct {
	db *gorm.DB
}

func NewReceiptService(db *gorm.DB) *ReceiptService {
	return &ReceiptService{db: db}
}

func (s *ReceiptService) BuildReceipt(pedidoGuid string) (reportmodels.Receipt, error) {
	var header struct {
		Folio    int
		Fecha    time.Time
		Sucursal string
		Negocio  string
		Cajero   string
	}
	err := s.db.Raw(`
		SELECT p.folio, p.fecha,
		       COALESCE(s.nombre_sucursal, 'Sucursal') sucursal,
		       COALESCE(NULLIF(e.nombre_comercial, ''), NULLIF(e.razon_social, ''), 'KOMMERZE') negocio,
		       COALESCE(u.nombre, 'Cajero') cajero
		  FROM pedidos p
		  LEFT JOIN sucursales s ON s.id = p.sucursal_origen_id
		  LEFT JOIN empresas e ON e.id = s.empresa_id
		  LEFT JOIN operacion_cajero oc ON oc.id = p.operacion_cajero_id
		  LEFT JOIN usuarios u ON u.id = oc.responsable_caja_id
		 WHERE p.guid = ? AND p.deleted_at IS NULL`, pedidoGuid).Scan(&header).Error
	if err != nil {
		return reportmodels.Receipt{}, err
	}
	if header.Folio == 0 {
		return reportmodels.Receipt{}, fmt.Errorf("venta no encontrada")
	}

	var rows []struct {
		Codigo, Descripcion         string
		Cantidad, Precio, Descuento float64
	}
	if err := s.db.Raw(`
		SELECT COALESCE(ne.codigo, '') codigo, COALESCE(pr.descripcion, 'Producto') descripcion,
		       pd.cantidad, pd.precio_venta precio, pd.descuento
		  FROM pedido_detalle pd
		  JOIN pedidos p ON p.id = pd.pedido_id
		  JOIN nivel_empaque ne ON ne.id = pd.nivel_id
		  JOIN productos pr ON pr.id = ne.producto_id
		 WHERE p.guid = ? AND pd.deleted_at IS NULL
		 ORDER BY pd.id`, pedidoGuid).Scan(&rows).Error; err != nil {
		return reportmodels.Receipt{}, err
	}

	var pagos float64
	if err := s.db.Raw(`SELECT COALESCE(SUM(pg.monto), 0) FROM pagos pg JOIN pedidos p ON p.id=pg.pedido_id WHERE p.guid=? AND pg.deleted_at IS NULL`, pedidoGuid).Scan(&pagos).Error; err != nil {
		return reportmodels.Receipt{}, err
	}

	cfg, _ := LoadKommerzConfig()
	r := reportmodels.Receipt{
		Folio: fmt.Sprintf("VTA-%06d", header.Folio), Negocio: header.Negocio,
		Sucursal: header.Sucursal, Cajero: header.Cajero, Fecha: header.Fecha, Pago: pagos,
	}
	if cfg != nil {
		if cfg.Receipt.BusinessName != "" {
			r.Negocio = cfg.Receipt.BusinessName
		}
		r.Leyendas = cfg.Receipt.Legends
		for _, group := range cfg.Receipt.LegendGroups {
			r.LeyendaGrupos = append(r.LeyendaGrupos, reportmodels.ReceiptLegendGroup{Text: group.Text, Bold: group.Bold})
		}
	}
	for _, row := range rows {
		bruto := row.Cantidad * row.Precio
		descuento := bruto * row.Descuento / 100
		r.Items = append(r.Items, reportmodels.ReceiptItem{
			Codigo: row.Codigo, Descripcion: row.Descripcion,
			Cantidad: row.Cantidad, Precio: row.Precio, Importe: bruto - descuento,
		})
		r.Subtotal += bruto
		r.Descuento += descuento
	}
	r.Total = r.Subtotal - r.Descuento
	r.Cambio = r.Pago - r.Total
	if r.Cambio < 0 {
		r.Cambio = 0
	}
	return r, nil
}
