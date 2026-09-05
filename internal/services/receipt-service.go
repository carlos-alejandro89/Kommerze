package services

import (
	"BitComercio/internal/models"
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

func (s *ReceiptService) BuildConversionReport(pedidoGuid string) (reportmodels.ConversionReport, error) {
	var report reportmodels.ConversionReport
	var row struct {
		Folio                                                                      int
		Fecha                                                                      time.Time
		Estatus, Negocio, RazonSocial, RFCNegocio, Sucursal                        string
		TelefonoSucursal, CorreoSucursal                                           string
		OrigenCodigo, OrigenProducto, OrigenEmpaque                                string
		DestinoCodigo, DestinoProducto, DestinoEmpaque                             string
		CantidadOrigen, CantidadDestino, Factor                                    float64
		PrecioVentaOrigen, PrecioVentaDestino, ValorVentaOrigen, ValorVentaDestino float64
		ExistenciaDestinoInicial, ExistenciaDestinoFinal                           float64
	}
	if err := s.db.Raw(`
		SELECT p.folio, p.fecha, es.nombre estatus,
		       COALESCE(NULLIF(emp.nombre_comercial, ''), NULLIF(emp.razon_social, ''), 'KOMMERZE') negocio,
		       COALESCE(emp.razon_social, '') razon_social, COALESCE(emp.rfc, '') rfc_negocio,
		       COALESCE(su.nombre_sucursal, '') sucursal, COALESCE(su.telefono, '') telefono_sucursal,
		       COALESCE(su.correo, '') correo_sucursal,
		       no.codigo origen_codigo, po.descripcion origen_producto,
		       COALESCE(eo.empaque, '') origen_empaque,
		       pd.cantidad::double precision cantidad_origen,
		       nd.codigo destino_codigo, pde.descripcion destino_producto,
		       COALESCE(ed.empaque, '') destino_empaque,
		       (pd.info_adicional::jsonb->>'cantidadDestino')::double precision cantidad_destino,
		       COALESCE((pd.info_adicional::jsonb->>'factorConversion')::double precision, rc.factor_conversion::double precision) factor,
		       COALESCE((pd.info_adicional::jsonb->>'precioVentaOrigen')::double precision, pd.precio_venta::double precision) precio_venta_origen,
		       COALESCE((pd.info_adicional::jsonb->>'precioVentaDestino')::double precision, 0) precio_venta_destino,
		       COALESCE((pd.info_adicional::jsonb->>'valorVentaOrigen')::double precision, (pd.cantidad * pd.precio_venta)::double precision) valor_venta_origen,
		       COALESCE((pd.info_adicional::jsonb->>'valorVentaDestino')::double precision, 0) valor_venta_destino,
		       COALESCE((pd.info_adicional::jsonb->>'existenciaDestinoInicial')::double precision, 0) existencia_destino_inicial,
		       COALESCE((pd.info_adicional::jsonb->>'existenciaDestinoFinal')::double precision, (pd.info_adicional::jsonb->>'cantidadDestino')::double precision) existencia_destino_final
		FROM pedidos p
		JOIN tipos_pedido tp ON tp.id=p.tipo_pedido_id AND tp.guid=?
		JOIN estatus es ON es.id=p.estatus_id
		JOIN pedido_detalle pd ON pd.pedido_id=p.id AND pd.deleted_at IS NULL
		JOIN nivel_empaque no ON no.id=pd.nivel_id
		JOIN productos po ON po.id=no.producto_id
		LEFT JOIN empaques eo ON eo.id=no.empaque_id
		JOIN reglas_conversion_producto rc ON rc.guid=(pd.info_adicional::jsonb->>'reglaGuid')::uuid
		JOIN nivel_empaque nd ON nd.id=rc.nivel_empaque_destino_id
		JOIN productos pde ON pde.id=nd.producto_id
		LEFT JOIN empaques ed ON ed.id=nd.empaque_id
		LEFT JOIN sucursales su ON su.id=p.sucursal_origen_id
		LEFT JOIN empresas emp ON emp.id=su.empresa_id
		WHERE p.guid=? AND p.deleted_at IS NULL
		LIMIT 1`, models.TipoPedidoConversionGuid, pedidoGuid).Scan(&row).Error; err != nil {
		return report, err
	}
	if row.Folio == 0 {
		return report, fmt.Errorf("conversión no encontrada")
	}
	report = reportmodels.ConversionReport{
		Folio: fmt.Sprintf("%07d", row.Folio), Fecha: row.Fecha, Estatus: row.Estatus,
		Negocio: row.Negocio, RazonSocial: row.RazonSocial, RFCNegocio: row.RFCNegocio,
		Sucursal: row.Sucursal, TelefonoSucursal: row.TelefonoSucursal, CorreoSucursal: row.CorreoSucursal,
		OrigenCodigo: row.OrigenCodigo, OrigenProducto: row.OrigenProducto, OrigenEmpaque: row.OrigenEmpaque,
		DestinoCodigo: row.DestinoCodigo, DestinoProducto: row.DestinoProducto, DestinoEmpaque: row.DestinoEmpaque,
		CantidadOrigen: row.CantidadOrigen, CantidadDestino: row.CantidadDestino, Factor: row.Factor,
		PrecioVentaOrigen: row.PrecioVentaOrigen, PrecioVentaDestino: row.PrecioVentaDestino,
		ValorVentaOrigen: row.ValorVentaOrigen, ValorVentaDestino: row.ValorVentaDestino,
		ExistenciaDestinoInicial: row.ExistenciaDestinoInicial, ExistenciaDestinoFinal: row.ExistenciaDestinoFinal,
	}
	return report, nil
}

func (s *ReceiptService) BuildTransferReport(pedidoGuid string) (reportmodels.TransferReport, error) {
	var report reportmodels.TransferReport
	var header struct {
		PedidoGuid, TraspasoGuid, Estatus, Negocio, RazonSocial, RFCNegocio string
		SucursalOrigen, DireccionOrigen, TelefonoOrigen, CorreoOrigen       string
		SucursalDestino, DireccionDestino, Comentarios                      string
		Folio                                                               int
		FechaEnvio                                                          time.Time
		FechaRecepcion                                                      *time.Time
	}
	if err := s.db.Raw(`
		SELECT p.guid::text pedido_guid, t.guid::text traspaso_guid, p.folio,
		       COALESCE(es.nombre, 'En tránsito') estatus,
		       COALESCE(NULLIF(emp.nombre_comercial, ''), NULLIF(emp.razon_social, ''), 'KOMMERZE') negocio,
		       COALESCE(emp.razon_social, '') razon_social,
		       COALESCE(emp.rfc, '') rfc_negocio,
		       COALESCE(so.nombre_sucursal, 'Sucursal origen') sucursal_origen,
		       concat_ws(', ', NULLIF(trim(concat_ws(' ', so.calle, so.exterior, so.interior)), ''),
		          NULLIF(so.colonia, ''), NULLIF(so.ciudad, ''), NULLIF(so.estado, ''),
		          CASE WHEN NULLIF(so.codigo_postal, '') IS NULL THEN NULL ELSE 'C.P. ' || so.codigo_postal END) direccion_origen,
		       COALESCE(so.telefono, '') telefono_origen, COALESCE(so.correo, '') correo_origen,
		       COALESCE(sd.nombre_sucursal, 'Sucursal destino') sucursal_destino,
		       concat_ws(', ', NULLIF(trim(concat_ws(' ', sd.calle, sd.exterior, sd.interior)), ''),
		          NULLIF(sd.colonia, ''), NULLIF(sd.ciudad, ''), NULLIF(sd.estado, ''),
		          CASE WHEN NULLIF(sd.codigo_postal, '') IS NULL THEN NULL ELSE 'C.P. ' || sd.codigo_postal END) direccion_destino,
		       t.fecha_envio, t.fecha_recepcion, COALESCE(p.comentarios, '') comentarios
		FROM traspasos t
		JOIN pedidos p ON p.id=t.pedido_id AND p.deleted_at IS NULL
		JOIN sucursales so ON so.id=t.sucursal_origen_id AND so.deleted_at IS NULL
		JOIN sucursales sd ON sd.id=t.sucursal_destino_id AND sd.deleted_at IS NULL
		JOIN estatus es ON es.id=t.estatus_id AND es.deleted_at IS NULL
		LEFT JOIN empresas emp ON emp.id=so.empresa_id AND emp.deleted_at IS NULL
		WHERE p.guid=? AND t.deleted_at IS NULL`, pedidoGuid).Scan(&header).Error; err != nil {
		return report, err
	}
	if header.TraspasoGuid == "" {
		return report, fmt.Errorf("transferencia no encontrada")
	}
	report = reportmodels.TransferReport{
		PedidoGuid: header.PedidoGuid, TraspasoGuid: header.TraspasoGuid,
		Folio: fmt.Sprintf("%07d", header.Folio), Estatus: header.Estatus,
		Negocio: header.Negocio, RazonSocial: header.RazonSocial, RFCNegocio: header.RFCNegocio,
		SucursalOrigen: header.SucursalOrigen, DireccionOrigen: header.DireccionOrigen,
		TelefonoOrigen: header.TelefonoOrigen, CorreoOrigen: header.CorreoOrigen,
		SucursalDestino: header.SucursalDestino, DireccionDestino: header.DireccionDestino,
		FechaEnvio: header.FechaEnvio, FechaRecepcion: header.FechaRecepcion,
		Comentarios: header.Comentarios,
	}
	if err := s.db.Raw(`
		SELECT COALESCE(ne.codigo, '') codigo, COALESCE(pr.descripcion, 'Producto') descripcion,
		       COALESCE(em.empaque, 'Unidad') unidad, pd.cantidad::double precision cantidad,
		       pd.precio_venta::double precision precio_venta,
		       pd.descuento::double precision descuento,
		       ((pd.cantidad * pd.precio_venta) - pd.descuento)::double precision importe
		FROM pedido_detalle pd
		JOIN pedidos p ON p.id=pd.pedido_id AND p.deleted_at IS NULL
		JOIN nivel_empaque ne ON ne.id=pd.nivel_id AND ne.deleted_at IS NULL
		JOIN productos pr ON pr.id=ne.producto_id AND pr.deleted_at IS NULL
		LEFT JOIN empaques em ON em.id=ne.empaque_id AND em.deleted_at IS NULL
		WHERE p.guid=? AND pd.deleted_at IS NULL ORDER BY pd.id`, pedidoGuid).Scan(&report.Items).Error; err != nil {
		return report, err
	}
	report.TotalProductos = len(report.Items)
	for _, item := range report.Items {
		report.UnidadesTotales += item.Cantidad
		report.ValorTotal += item.Importe
	}
	return report, nil
}

func (s *ReceiptService) BuildPurchaseReport(pedidoGuid string) (reportmodels.PurchaseReport, error) {
	var report reportmodels.PurchaseReport
	var header struct {
		PedidoGuid, CompraGuid, Proveedor, RFCProveedor, RegimenProveedor        string
		TelefonoProveedor, CorreoProveedor, CodigoPostalProveedor, OrigenCaptura string
		UUIDFiscal, FolioFactura, Moneda, TipoComprobante, MetodoPago            string
		Folio                                                                    int
		FechaCompra                                                              time.Time
		FechaDocumento, FechaTimbrado                                            *time.Time
		SubtotalCompra, DescuentoCompra, ImpuestosCompra, TotalCompra            float64
	}
	if err := s.db.Raw(`
		SELECT p.guid::text pedido_guid, c.guid::text compra_guid, p.folio, p.fecha fecha_compra,
		       c.origen_captura, COALESCE(c.uuid_fiscal,'') uuid_fiscal,
		       COALESCE(c.folio_factura,'') folio_factura, c.fecha_factura fecha_documento,
		       c.fecha_timbrado, COALESCE(c.moneda,'MXN') moneda,
		       COALESCE(c.tipo_comprobante,'') tipo_comprobante, COALESCE(c.metodo_pago,'') metodo_pago,
		       c.subtotal subtotal_compra, c.descuento descuento_compra,
		       c.impuestos impuestos_compra, c.total total_compra,
		       ef.razon_social proveedor, ef.rfc rfc_proveedor,
		       COALESCE(sr.clave || ' - ' || sr.descripcion,'') regimen_proveedor,
		       COALESCE(ef.telefono,'') telefono_proveedor, COALESCE(ef.correo,'') correo_proveedor,
		       COALESCE(ef.codigo_postal,'') codigo_postal_proveedor
		FROM compras c
		JOIN pedidos p ON p.id=c.pedido_id AND p.deleted_at IS NULL
		JOIN tipos_pedido tp ON tp.id=p.tipo_pedido_id AND tp.guid=?
		JOIN entidades_fiscales ef ON ef.id=c.proveedor_id AND ef.deleted_at IS NULL
		LEFT JOIN sat_regimen_fiscal sr ON sr.id=ef.regimen_id
		WHERE p.guid=? AND c.deleted_at IS NULL`, models.TipoPedidoCompraGuid, pedidoGuid).Scan(&header).Error; err != nil {
		return report, err
	}
	if header.CompraGuid == "" {
		return report, fmt.Errorf("compra no encontrada")
	}
	report = reportmodels.PurchaseReport{
		PedidoGuid: header.PedidoGuid, CompraGuid: header.CompraGuid, Folio: fmt.Sprintf("CP-%06d", header.Folio),
		OrigenCaptura: header.OrigenCaptura, Proveedor: header.Proveedor, RFCProveedor: header.RFCProveedor,
		RegimenProveedor: header.RegimenProveedor, TelefonoProveedor: header.TelefonoProveedor,
		CorreoProveedor: header.CorreoProveedor, CodigoPostalProveedor: header.CodigoPostalProveedor,
		FechaCompra: header.FechaCompra, FechaDocumento: header.FechaDocumento, FechaTimbrado: header.FechaTimbrado,
		UUIDFiscal: header.UUIDFiscal, FolioFactura: header.FolioFactura, Moneda: header.Moneda,
		TipoComprobante: header.TipoComprobante, MetodoPago: header.MetodoPago,
		SubtotalCompra: header.SubtotalCompra, DescuentoCompra: header.DescuentoCompra,
		ImpuestosCompra: header.ImpuestosCompra, TotalCompra: header.TotalCompra,
		Notas: "Compra registrada conforme a la información capturada.",
	}
	var rows []struct {
		Codigo, Descripcion, Unidad         string
		Cantidad, PrecioCompra, PrecioVenta float64
	}
	if err := s.db.Raw(`
		SELECT COALESCE(ne.codigo,'') codigo, COALESCE(pr.descripcion,'Producto') descripcion,
		       COALESCE(em.empaque,'Unidad') unidad, pd.cantidad,
		       pd.precio_compra, pd.precio_venta
		FROM pedido_detalle pd
		JOIN nivel_empaque ne ON ne.id=pd.nivel_id
		JOIN productos pr ON pr.id=ne.producto_id
		LEFT JOIN empaques em ON em.id=ne.empaque_id
		JOIN pedidos p ON p.id=pd.pedido_id
		WHERE p.guid=? AND pd.deleted_at IS NULL ORDER BY pd.id`, pedidoGuid).Scan(&rows).Error; err != nil {
		return report, err
	}
	baseCompra := 0.0
	for _, row := range rows {
		baseCompra += row.Cantidad * row.PrecioCompra
	}
	for _, row := range rows {
		importeCompraSinImpuesto := row.Cantidad * row.PrecioCompra
		impuesto := 0.0
		if baseCompra > 0 {
			impuesto = report.ImpuestosCompra * importeCompraSinImpuesto / baseCompra
		}
		item := reportmodels.PurchaseReportItem{
			Codigo: row.Codigo, Descripcion: row.Descripcion, Unidad: row.Unidad, Cantidad: row.Cantidad,
			PrecioCompra: row.PrecioCompra, Impuestos: impuesto,
			ImporteCompra: importeCompraSinImpuesto + impuesto,
			PrecioVenta:   row.PrecioVenta, ImporteVenta: row.Cantidad * row.PrecioVenta,
		}
		report.Items = append(report.Items, item)
		report.TotalVenta += item.ImporteVenta
	}
	return report, nil
}

func (s *ReceiptService) BuildReceipt(pedidoGuid string) (reportmodels.Receipt, error) {
	var header struct {
		Folio          int
		TipoPedidoID   uint
		TipoPedidoGuid string
		Fecha          time.Time
		Sucursal       string
		Negocio        string
		Logo           string
		Calle          string
		Exterior       string
		Interior       string
		Colonia        string
		Ciudad         string
		Estado         string
		CodigoPostal   string
		Telefono       string
		Correo         string
		Cajero         string
	}
	err := s.db.Raw(`
		SELECT p.folio, p.fecha, COALESCE(p.tipo_pedido_id, 0) tipo_pedido_id, COALESCE(tp.guid::text, '') tipo_pedido_guid,
		       COALESCE(s.nombre_sucursal, 'Sucursal') sucursal,
		       COALESCE(NULLIF(e.nombre_comercial, ''), NULLIF(e.razon_social, ''), 'KOMMERZE') negocio,
		       COALESCE(e.logo, '') logo,
		       COALESCE(s.calle, '') calle, COALESCE(s.exterior, '') exterior,
		       COALESCE(s.interior, '') interior, COALESCE(s.colonia, '') colonia,
		       COALESCE(s.ciudad, '') ciudad, COALESCE(s.estado, '') estado,
		       COALESCE(s.codigo_postal, '') codigo_postal,
		       COALESCE(s.telefono, '') telefono, COALESCE(s.correo, '') correo,
		       COALESCE(u.nombre, 'Cajero') cajero
		  FROM pedidos p
		  LEFT JOIN sucursales s ON s.id = p.sucursal_origen_id
		  LEFT JOIN tipos_pedido tp ON tp.id = p.tipo_pedido_id
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
	address := make([]string, 0, 6)
	if street := strings.TrimSpace(strings.Join([]string{cleanDocumentText(header.Calle), cleanDocumentText(header.Exterior), cleanDocumentText(header.Interior)}, " ")); street != "" {
		address = append(address, street)
	}
	for _, part := range []string{header.Colonia, header.Ciudad, header.Estado} {
		if part = cleanDocumentText(part); part != "" {
			address = append(address, part)
		}
	}
	if cp := cleanDocumentText(header.CodigoPostal); cp != "" {
		address = append(address, "C.P. "+cp)
	}
	r := reportmodels.Receipt{
		TipoPedidoID:   header.TipoPedidoID,
		TipoPedidoGuid: header.TipoPedidoGuid,
		Folio:          fmt.Sprintf("VTA-%06d", header.Folio), Negocio: header.Negocio,
		Sucursal: cleanDocumentText(header.Sucursal), Logo: header.Logo, Direccion: strings.Join(address, ", "),
		Telefono: cleanDocumentText(header.Telefono), Correo: cleanDocumentText(header.Correo),
		Cajero: header.Cajero, Fecha: header.Fecha, Pago: pagos,
	}
	if cfg != nil {
		if cfg.Receipt.BusinessName != "" {
			r.Negocio = cfg.Receipt.BusinessName
		}
		if logo, err := LoadReceiptLogo(); err == nil && logo != "" {
			r.Logo = logo
		}
		r.Leyendas = cfg.Receipt.Legends
		r.MostrarLogo = cfg.Receipt.ShowLogo
		r.MostrarSucursal = cfg.Receipt.EffectiveShowBranchName()
		r.MostrarDireccion = cfg.Receipt.ShowBranchAddress
		r.MostrarTelefono = cfg.Receipt.ShowBranchPhone
		r.MostrarCorreo = cfg.Receipt.ShowBranchEmail
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
		TipoPedidoGuid                                                                                                               string
		Negocio, RFCNegocio, Sucursal, Calle, Exterior, Interior, Colonia, Ciudad, Estado, CodigoPostal                              string
		TelefonoSucursal, CorreoSucursal, Asesor, Cliente, TelefonoCliente, CorreoCliente, RFCCliente, RegimenCliente, Observaciones string
	}
	err := s.db.Raw(`
		SELECT p.folio, p.fecha, COALESCE(p.tipo_pedido_id, 0) tipo_pedido_id, COALESCE(tp.guid::text, '') tipo_pedido_guid,
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
		  LEFT JOIN tipos_pedido tp ON tp.id=p.tipo_pedido_id
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
	if header.TipoPedidoGuid != models.TipoPedidoCotizacionGuid {
		return q, fmt.Errorf("el pedido no es una cotización")
	}
	address := []string{}
	for _, part := range []string{strings.TrimSpace(cleanDocumentText(header.Calle) + " " + cleanDocumentText(header.Exterior) + " " + cleanDocumentText(header.Interior)), header.Colonia, header.Ciudad, header.Estado, header.CodigoPostal} {
		if part = cleanDocumentText(part); part != "" {
			address = append(address, part)
		}
	}
	q = reportmodels.Quotation{Folio: fmt.Sprintf("COT-%06d", header.Folio), Negocio: header.Negocio,
		RFCNegocio: header.RFCNegocio, Sucursal: cleanDocumentText(header.Sucursal), DireccionSucursal: strings.Join(address, ", "),
		TelefonoSucursal: cleanDocumentText(header.TelefonoSucursal), CorreoSucursal: cleanDocumentText(header.CorreoSucursal), Asesor: header.Asesor,
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
