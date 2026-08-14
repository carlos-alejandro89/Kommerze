package models

import "time"

type ReceiptItem struct {
	Codigo      string  `json:"codigo"`
	Descripcion string  `json:"descripcion"`
	Cantidad    float64 `json:"cantidad"`
	Precio      float64 `json:"precio"`
	Importe     float64 `json:"importe"`
}

type ReceiptLegendGroup struct {
	Text string `json:"text"`
	Bold bool   `json:"bold"`
}

type Receipt struct {
	TipoPedidoID   uint                 `json:"tipoPedidoId"`
	TipoPedidoGuid string               `json:"tipoPedidoGuid"`
	Folio          string               `json:"folio"`
	Negocio        string               `json:"negocio"`
	Sucursal       string               `json:"sucursal"`
	Cajero         string               `json:"cajero"`
	Fecha          time.Time            `json:"fecha"`
	Items          []ReceiptItem        `json:"items"`
	Subtotal       float64              `json:"subtotal"`
	Descuento      float64              `json:"descuento"`
	Total          float64              `json:"total"`
	Pago           float64              `json:"pago"`
	Cambio         float64              `json:"cambio"`
	Leyendas       []string             `json:"leyendas,omitempty"`
	LeyendaGrupos  []ReceiptLegendGroup `json:"leyendaGrupos,omitempty"`
}
