package models

import "time"

type QuotationItem struct {
	Codigo, Descripcion, Unidad          string
	Cantidad, Precio, Descuento, Importe float64
}

type Quotation struct {
	Folio, Negocio, RFCNegocio, Sucursal, DireccionSucursal             string
	TelefonoSucursal, CorreoSucursal, Asesor                            string
	Cliente, RFCCliente, TelefonoCliente, CorreoCliente, RegimenCliente string
	Fecha                                                               time.Time
	VigenciaDias                                                        int
	Items                                                               []QuotationItem
	Subtotal, Descuento, Impuestos, Total                               float64
	Observaciones                                                       string
}

type DocumentOutput struct {
	Kind       string `json:"kind"`
	FileName   string `json:"fileName,omitempty"`
	DataBase64 string `json:"dataBase64,omitempty"`
}
