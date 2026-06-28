package dto

import (
	"github.com/shopspring/decimal"
)

type AuditoriaProductoDto struct {
	Guid         string          `json:"nivelGuid"`
	Existencia   decimal.Decimal `json:"existencia"`
	PrecioVenta  decimal.Decimal `json:"precioVenta"`
	PrecioVenta2 decimal.Decimal `json:"precioVenta2"`
}
