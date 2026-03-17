package models

import (
	"time"
)

type Pedido struct {
	BaseModel

	EstatusID *uint
	Estatus   Estatus `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	ClienteID *uint
	Cliente   Cliente `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	OperacionCajeroID uint
	OperacionCajero   OperacionCajero `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	// Opcionales
	TipoPedidoID *uint
	TipoPedido   TipoPedido `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	FacturaID    *uint
	Factura      Factura `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	// Datos comerciales
	Folio     int       `gorm:"index"`
	Fecha     time.Time `gorm:"type:timestamp;not null;default:now();index"`
	EsCredito bool      `gorm:"default:false"`
	Sync      bool      `gorm:"default:false"`
}

func (Pedido) TableName() string {
	return "pedidos"
}
