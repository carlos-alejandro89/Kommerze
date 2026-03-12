package dto

import "github.com/shopspring/decimal"

type ProductoDto struct {
	ID            int
	Codigo        string
	Descripcion   string
	Empaque       string
	Contenido     float64
	Fraccionable  bool
	CodigoBarra   string
	ImgReferencia string
	NivelId       int
	PrecioCompra  float64
	PrecioVenta   float64
	Descuento     float64
	Existencia    decimal.Decimal
}
