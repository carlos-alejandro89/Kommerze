package dto

import "encoding/json"

// ItemDescuentoDto representa un articulo con % de descuento solicitado y aprobado.
// Se serializa a JSON en Pedido.DescuentosSolicitados / DescuentosAutorizados.
type ItemDescuentoDto struct {
	NivelGuid           string  `json:"nivelGuid"`
	Cantidad            float64 `json:"cantidad"`
	PrecioVenta         float64 `json:"precioVenta"`
	DescuentoSolicitado float64 `json:"descuentoSolicitado"`
	DescuentoAutorizado float64 `json:"descuentoAutorizado"`
}

// WsMessage es el envelope de mensajes WebSocket que el cloud envia al servidor local.
type WsMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// ResolucionCotizacionDto es el payload del mensaje "cotizacion_resuelta" via WebSocket.
type ResolucionCotizacionDto struct {
	CloudSolicitudGuid  string             `json:"cloudSolicitudGuid"`
	PedidoGuid          string             `json:"pedidoGuid"`
	EstatusAutorizacion string             `json:"estatusAutorizacion"`
	Items               []ItemDescuentoDto `json:"items"`
	AutorizadoPor       string             `json:"autorizadoPor"`
	Observaciones       string             `json:"observaciones"`
	FechaResolucion     string             `json:"fechaResolucion"`
}
