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

	OperacionCajeroID *uint
	OperacionCajero   OperacionCajero `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	// Opcionales
	TipoPedidoID *uint
	TipoPedido   TipoPedido `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	FacturaID    *uint
	Factura      Factura `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	// Datos comerciales
	Folio       int       `gorm:"index"`
	Fecha       time.Time `gorm:"type:timestamptz;not null;default:now();index"`
	EsCredito   bool      `gorm:"default:false"`
	Sync        bool      `gorm:"default:false"`
	Comentarios string    `gorm:"type:text;default:''"`

	// Sucursal origen (aplica a Ventas, Cotizaciones y Transferencias)
	SucursalOrigenID *uint
	SucursalOrigen   Sucursal `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	// Ciclo de autorizacion de descuentos (solo cotizaciones con descuento especial)
	// Valores: "" = sin solicitud | "solicitada" | "autorizada" | "rechazada"
	EstatusAutorizacion   string     `gorm:"size:30;default:'';index"`
	DescuentosSolicitados string     `gorm:"type:text;default:null"`
	DescuentosAutorizados string     `gorm:"type:text;default:null"`
	AutorizadoPor         string     `gorm:"size:255;default:null"`
	ObsAutorizacion       string     `gorm:"type:text;default:null"`
	FechaResolucion       *time.Time `gorm:"type:timestamptz;default:null"`
	CloudSolicitudGuid    string     `gorm:"size:36;default:null;index"`
}

func (Pedido) TableName() string {
	return "pedidos"
}
