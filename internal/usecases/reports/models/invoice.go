package models

import "time"

type InvoiceItem struct {
	Codigo, ClaveSAT, Descripcion, Unidad                   string
	Cantidad, PrecioUnitario, Descuento, Impuestos, Importe float64
}

type Invoice struct {
	Serie, Folio, UUID                                                          string
	FechaEmision, FechaTimbrado                                                 time.Time
	NombreComercial, Emisor, RFCEmisor, RegimenEmisor, LugarExpedicion          string
	Sucursal, Direccion, Telefono, Correo                                       string
	Receptor, RFCReceptor, RegimenReceptor, DomicilioReceptor                   string
	UsoCFDI, MetodoPago, FormaPago                                              string
	CertificadoEmisor, CertificadoSAT, SelloEmisor, SelloSAT, CadenaOriginalSAT string
	Items                                                                       []InvoiceItem
	Subtotal, Descuento, Impuestos, Total                                       float64
}
