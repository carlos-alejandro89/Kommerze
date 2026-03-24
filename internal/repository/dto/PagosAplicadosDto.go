package dto

import "github.com/shopspring/decimal"

type PagosAplicadosDto struct {
	ID         int             `json:"ID"`
	Nombre     string          `json:"Nombre"`
	Monto      decimal.Decimal `json:"Monto"`
	Referencia string          `json:"Referencia"`
}
