package models

import "time"

type TransferReportItem struct {
	Codigo, Descripcion, Unidad               string
	Cantidad, PrecioVenta, Descuento, Importe float64
}

type TransferReport struct {
	PedidoGuid, TraspasoGuid, Folio, Estatus                      string
	Negocio, RazonSocial, RFCNegocio                              string
	SucursalOrigen, DireccionOrigen, TelefonoOrigen, CorreoOrigen string
	SucursalDestino, DireccionDestino                             string
	FechaEnvio                                                    time.Time
	FechaRecepcion                                                *time.Time
	Comentarios                                                   string
	Items                                                         []TransferReportItem
	TotalProductos                                                int
	UnidadesTotales, ValorTotal                                   float64
}
