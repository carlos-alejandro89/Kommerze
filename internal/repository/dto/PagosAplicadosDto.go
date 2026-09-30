package dto

import "github.com/shopspring/decimal"

type PagosAplicadosDto struct {
	ID            int             `json:"ID"`
	Nombre        string          `json:"Nombre"`
	Monto         decimal.Decimal `json:"Monto"`
	MontoRecibido decimal.Decimal `json:"MontoRecibido"`
	Cambio        decimal.Decimal `json:"Cambio"`
	Referencia    string          `json:"Referencia"`
}
