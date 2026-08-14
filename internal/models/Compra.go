package models

import (
	"time"

	"github.com/shopspring/decimal"
)

// Compra contiene los datos propios de una entrada de mercancía. Los artículos
// permanecen en PedidoDetalle para conservar un único formato de operación.
type Compra struct {
	BaseModel

	PedidoID uint   `gorm:"not null;uniqueIndex"`
	Pedido   Pedido `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`

	ProveedorID uint          `gorm:"not null;index"`
	Proveedor   EntidadFiscal `gorm:"foreignKey:ProveedorID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	OrigenCaptura   string `gorm:"size:10;not null;default:'MANUAL'"`
	UUIDFiscal      string `gorm:"size:36;index"`
	FolioFactura    string `gorm:"size:100"`
	FechaFactura    *time.Time
	FechaTimbrado   *time.Time
	Moneda          string `gorm:"size:10;default:'MXN'"`
	TipoComprobante string `gorm:"size:10"`
	MetodoPago      string `gorm:"size:10"`

	Subtotal  decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	Descuento decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	Impuestos decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	Total     decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
}

func (Compra) TableName() string { return "compras" }
