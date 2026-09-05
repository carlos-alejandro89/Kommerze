package models

import "time"

type ConversionReport struct {
	Folio, Estatus, Negocio, RazonSocial, RFCNegocio string
	Sucursal, TelefonoSucursal, CorreoSucursal       string
	OrigenCodigo, OrigenProducto, OrigenEmpaque      string
	DestinoCodigo, DestinoProducto, DestinoEmpaque   string
	CantidadOrigen, CantidadDestino, Factor          float64
	PrecioVentaOrigen, PrecioVentaDestino            float64
	ValorVentaOrigen, ValorVentaDestino              float64
	ExistenciaDestinoInicial, ExistenciaDestinoFinal float64
	Fecha                                            time.Time
}
