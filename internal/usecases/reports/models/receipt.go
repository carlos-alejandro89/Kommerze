package models

import "time"

type ReceiptItem struct {
	Codigo      string
	Descripcion string
	Cantidad    float64
	Precio      float64
	Importe     float64
}

type Receipt struct {
	Folio     string
	Sucursal  string
	Cajero    string
	Fecha     time.Time
	Items     []ReceiptItem
	Subtotal  float64
	Descuento float64
	Total     float64
	Pago      float64
	Cambio    float64
}
