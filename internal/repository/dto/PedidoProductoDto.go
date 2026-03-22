package dto

import "github.com/shopspring/decimal"

type PedidoProductoDto struct {
	ID               string
	Sku              string
	Name             string
	Price            decimal.Decimal
	Quantity         decimal.Decimal
	Empaque          string
	Discount         decimal.Decimal
	Fraccionable     bool
	ProductoBaseGuid string
	GuidBase         string
	Existencia       string
	CantidadBase     float64
}
