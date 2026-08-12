package services

import (
	reportmodels "BitComercio/internal/usecases/reports/models"
	"fmt"
	"strings"
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
		Folio        int
		TipoPedidoID uint
		Fecha        time.Time
		Sucursal     string
		Negocio      string
		Cajero       string
	}
	err := s.db.Raw(`
		SELECT p.folio, p.fecha, COALESCE(p.tipo_pedido_id, 0) tipo_pedido_id,
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
		TipoPedidoID: header.TipoPedidoID,
		Folio:        fmt.Sprintf("VTA-%06d", header.Folio), Negocio: header.Negocio,
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

func (s *ReceiptService) BuildQuotation(pedidoGuid string) (reportmodels.Quotation, error) {
	var q reportmodels.Quotation
	var header struct {
		Folio                                                                                                                        int
		Fecha                                                                                                                        time.Time
		TipoPedidoID                                                                                                                 uint
		Negocio, RFCNegocio, Sucursal, Calle, Exterior, Interior, Colonia, Ciudad, Estado, CodigoPostal                              string
		TelefonoSucursal, CorreoSucursal, Asesor, Cliente, TelefonoCliente, CorreoCliente, RFCCliente, RegimenCliente, Observaciones string
	}
	err := s.db.Raw(`
		SELECT p.folio, p.fecha, COALESCE(p.tipo_pedido_id, 0) tipo_pedido_id,
		       COALESCE(NULLIF(e.nombre_comercial,''), NULLIF(e.razon_social,''), 'KOMMERZE') negocio,
		       COALESCE(e.rfc,'') rfc_negocio, COALESCE(s.nombre_sucursal,'Sucursal') sucursal,
		       COALESCE(s.calle,'' ) calle, COALESCE(s.exterior,'') exterior, COALESCE(s.interior,'') interior,
		       COALESCE(s.colonia,'') colonia, COALESCE(s.ciudad,'') ciudad, COALESCE(s.estado,'') estado,
		       COALESCE(s.codigo_postal,'') codigo_postal, COALESCE(s.telefono,'') telefono_sucursal,
		       COALESCE(s.correo,'') correo_sucursal, COALESCE(u.nombre,'') asesor,
		       COALESCE(c.razon_social,'Público General') cliente, COALESCE(c.telefono,'') telefono_cliente,
		       COALESCE(c.correo,'') correo_cliente, COALESCE(ef.rfc,'') rfc_cliente,
		       COALESCE(rf.clave || ' - ' || rf.descripcion,'') regimen_cliente,
		       COALESCE(p.comentarios,'') observaciones
		  FROM pedidos p
		  LEFT JOIN sucursales s ON s.id=p.sucursal_origen_id
		  LEFT JOIN empresas e ON e.id=s.empresa_id
		  LEFT JOIN operacion_cajero oc ON oc.id=p.operacion_cajero_id
		  LEFT JOIN usuarios u ON u.id=oc.responsable_caja_id
		  LEFT JOIN clientes c ON c.id=p.cliente_id
		  LEFT JOIN LATERAL (
		       SELECT ef.* FROM cliente_entidad_fiscal cef
		       JOIN entidades_fiscales ef ON ef.id=cef.entidad_fiscal_id AND ef.deleted_at IS NULL
		       JOIN entidad_fiscal_roles efr ON efr.entidad_fiscal_id=ef.id AND efr.deleted_at IS NULL
		       JOIN roles_fiscales rfr ON rfr.id=efr.rol_id AND rfr.nombre='RECEPTOR' AND rfr.deleted_at IS NULL
		       WHERE cef.cliente_id=c.id AND cef.deleted_at IS NULL ORDER BY cef.id LIMIT 1
		  ) ef ON true
		  LEFT JOIN sat_regimen_fiscal rf ON rf.id=ef.regimen_id
		 WHERE p.guid=? AND p.deleted_at IS NULL`, pedidoGuid).Scan(&header).Error
	if err != nil {
		return q, err
	}
	if header.Folio == 0 {
		return q, fmt.Errorf("cotización no encontrada")
	}
	if header.TipoPedidoID != 2 {
		return q, fmt.Errorf("el pedido no es una cotización")
	}
	address := []string{}
	for _, part := range []string{strings.TrimSpace(header.Calle + " " + header.Exterior + " " + header.Interior), header.Colonia, header.Ciudad, header.Estado, header.CodigoPostal} {
		if strings.TrimSpace(part) != "" {
			address = append(address, strings.TrimSpace(part))
		}
	}
	q = reportmodels.Quotation{Folio: fmt.Sprintf("COT-%06d", header.Folio), Negocio: header.Negocio,
		RFCNegocio: header.RFCNegocio, Sucursal: header.Sucursal, DireccionSucursal: strings.Join(address, ", "),
		TelefonoSucursal: header.TelefonoSucursal, CorreoSucursal: header.CorreoSucursal, Asesor: header.Asesor,
		Cliente: header.Cliente, RFCCliente: header.RFCCliente, TelefonoCliente: header.TelefonoCliente,
		CorreoCliente: header.CorreoCliente, RegimenCliente: header.RegimenCliente, Fecha: header.Fecha,
		VigenciaDias: 15, Observaciones: header.Observaciones}
	var rows []struct {
		Codigo, Descripcion, Unidad            string
		Cantidad, Precio, Descuento, Impuestos float64
	}
	if err := s.db.Raw(`SELECT COALESCE(ne.codigo,'' ) codigo, COALESCE(pr.descripcion,'Producto') descripcion,
		COALESCE(em.empaque,'Unidad') unidad, pd.cantidad, pd.precio_venta precio,
		COALESCE(pd.descuento,0) descuento, COALESCE(pd.traslado_iva,0) impuestos
		FROM pedido_detalle pd JOIN pedidos p ON p.id=pd.pedido_id
		JOIN nivel_empaque ne ON ne.id=pd.nivel_id JOIN productos pr ON pr.id=ne.producto_id
		LEFT JOIN empaques em ON em.id=ne.empaque_id
		WHERE p.guid=? AND pd.deleted_at IS NULL ORDER BY pd.id`, pedidoGuid).Scan(&rows).Error; err != nil {
		return q, err
	}
	for _, row := range rows {
		bruto := row.Cantidad * row.Precio
		q.Items = append(q.Items, reportmodels.QuotationItem{Codigo: row.Codigo, Descripcion: row.Descripcion, Unidad: row.Unidad,
			Cantidad: row.Cantidad, Precio: row.Precio, Descuento: row.Descuento, Importe: bruto - row.Descuento + row.Impuestos})
		q.Subtotal += bruto
		q.Descuento += row.Descuento
		q.Impuestos += row.Impuestos
	}
	q.Total = q.Subtotal - q.Descuento + q.Impuestos
	return q, nil
}
