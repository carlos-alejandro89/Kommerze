package models

import "github.com/shopspring/decimal"

type SucursalProducto struct {
	BaseModel

	NivelID uint
	Nivel   NivelEmpaque `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`

	PrecioCompra decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	PrecioVenta  decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	PrecioVenta2  decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	PrecioVenta3  decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`

	Descuento decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`

	Existencia decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`

	Minimo decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	Maximo decimal.Decimal `gorm:"type:decimal(18,6);default:0"`

	Sync bool
}

func (SucursalProducto) TableName() string {
	return "sucursal_producto"
}