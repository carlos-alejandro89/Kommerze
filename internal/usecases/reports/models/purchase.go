package models

import "time"

type PurchaseReportItem struct {
	Codigo, Descripcion, Unidad              string
	Cantidad, PrecioCompra, Impuestos        float64
	ImporteCompra, PrecioVenta, ImporteVenta float64
}

type PurchaseReport struct {
	PedidoGuid, CompraGuid, Folio, OrigenCaptura                         string
	Proveedor, RFCProveedor, RegimenProveedor                            string
	TelefonoProveedor, CorreoProveedor, CodigoPostalProveedor            string
	FechaCompra                                                          time.Time
	FechaDocumento, FechaTimbrado                                        *time.Time
	UUIDFiscal, FolioFactura, Moneda, TipoComprobante, MetodoPago, Notas string
	Items                                                                []PurchaseReportItem
	SubtotalCompra, DescuentoCompra, ImpuestosCompra, TotalCompra        float64
	TotalVenta                                                           float64
}
