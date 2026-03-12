package models

import "github.com/shopspring/decimal"

type PedidoDetalle struct {
	BaseModel

	PedidoID uint
	Pedido   Pedido `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`

	NivelID uint
	Nivel   NivelEmpaque `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	Cantidad     decimal.Decimal `gorm:"type:decimal(18,6);not null"`
	PrecioCompra decimal.Decimal `gorm:"type:decimal(18,6);not null"`
	PrecioVenta   decimal.Decimal `gorm:"type:decimal(18,6);not null"`
	Descuento    decimal.Decimal `gorm:"type:decimal(18,6);default:0"`

	TrasladoIVA     decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	TasaIVA      decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`

	RetencionISR decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	TasaISR      decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`

	InfoAdicional string `gorm:"type:text"`
}

func (PedidoDetalle) TableName() string {
	return "pedido_detalle"
}