package dto

import (
	"time"
)

type PedidoRequestDto struct {
	SucursalOrigenGuid string                    `json:"sucursalOrigenGuid"`
	PedidoGuid         string                    `json:"pedidoGuid"`
	EstatusGuid        string                    `json:"estatusGuid"`
	ClienteGuid        string                    `json:"clienteGuid"`
	TipoPedidoGuid     string                    `json:"tipoPedidoGuid"`
	Folio              int                       `json:"folio"`
	Fecha              time.Time                 `json:"fecha"`
	EsCredito          bool                      `json:"esCredito"`
	Sync               bool                      `json:"sync"`
	Comentarios        string                    `json:"comentarios,omitempty"`
	PedidoDetalle      []PedidoDetalleRequestDto `json:"pedidoDetalle"`
	Pagos              []PagoRequestDto          `json:"pagos,omitempty"`
	Traspaso           *TraspasoRequestDto       `json:"traspaso,omitempty"`
}

type PagoRequestDto struct {
	PedidoGuid    string    `json:"pedidoGuid,omitempty"`
	FormaPagoGuid string    `json:"formaPagoGuid"`
	Fecha         time.Time `json:"fecha"`
	Monto         float64   `json:"monto"`
	Saldo         float64   `json:"saldo"`
}

type PedidoDetalleRequestDto struct {
	NivelGuid     string  `json:"nivelGuid"`
	Cantidad      float64 `json:"cantidad"`
	PrecioCompra  float64 `json:"precioCompra"`
	PrecioVenta   float64 `json:"precioVenta"`
	PrecioVenta2  float64 `json:"precioVenta2"`
	Descuento     float64 `json:"descuento"`
	TrasladoIVA   float64 `json:"trasladoIVA"`
	TasaIVA       float64 `json:"tasaIVA"`
	RetencionISR  float64 `json:"retencionISR"`
	TasaISR       float64 `json:"tasaISR"`
	InfoAdicional string  `json:"infoAdicional"`
}

type TraspasoRequestDto struct {
	SucursalOrigenGuid  string     `json:"sucursalOrigenGuid"`
	SucursalDestinoGuid string     `json:"sucursalDestinoGuid"`
	EstatusGuid         string     `json:"estatusGuid"`
	FechaEnvio          time.Time  `json:"fechaEnvio"`
	FechaRecepcion      *time.Time `json:"fechaRecepcion"`
	Sync                bool       `json:"sync"`
}
