package models

import "github.com/shopspring/decimal"

type Cliente struct {
	BaseModel

	RazonSocial string `gorm:"size:200;not null;index"`
	RFC         string `gorm:"size:20;index"`
	Correo      string `gorm:"size:150"`
	Telefono    string `gorm:"size:30"`

	CreditoMaximo decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	DiasCredito   int             `gorm:"default:0"`
}

func (Cliente) TableName() string {
	return "clientes"
}