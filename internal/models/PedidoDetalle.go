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
	PrecioBase   decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	PrecioVenta  decimal.Decimal `gorm:"type:decimal(18,6);not null"`
	Descuento    decimal.Decimal `gorm:"type:decimal(18,6);default:0"`

	TrasladoIVA decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	TasaIVA     decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`

	RetencionISR decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	TasaISR      decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`

	InfoAdicional string `gorm:"type:text"`
}

// CalcularPrecioBase aplica al precio de venta el porcentaje que la sucursal
// conserva después del descuento asociado a su comisión de ventas y redondea
// cualquier fracción al entero superior inmediato.
func CalcularPrecioBase(precioVenta, comisionVentas decimal.Decimal) decimal.Decimal {
	porcentaje := comisionVentas
	if porcentaje.IsNegative() {
		porcentaje = decimal.Zero
	} else if porcentaje.GreaterThan(decimal.NewFromInt(100)) {
		porcentaje = decimal.NewFromInt(100)
	}
	return precioVenta.Mul(porcentaje).Div(decimal.NewFromInt(100)).Ceil()
}

func (PedidoDetalle) TableName() string {
	return "pedido_detalle"
}
