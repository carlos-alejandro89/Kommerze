package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type Factura struct {
	BaseModel

	ReceptorID *uint
	Receptor   ReceptorFiscal `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	UsoCFDIID *uint
	UsoCFDI   SATUsoCFDI `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	MetodoPagoID *uint
	MetodoPago   SATMetodoPago `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	FormaPagoID *uint
	FormaPago   SATFormaPago `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	// Datos fiscales reales
	UUID string `gorm:"size:36;uniqueIndex"`

	NumeroCertificadoEmisor string `gorm:"size:30"`
	NumeroCertificadoSAT    string `gorm:"size:30"`

	SelloEmisor string `gorm:"type:text"`
	SelloSAT    string `gorm:"type:text"`

	PAC string `gorm:"size:150"`
	VersionTFD string `gorm:"size:20"`

	FechaFactura time.Time `gorm:"type:timestamp;not null;index"`

	EsGlobal bool `gorm:"default:false"`

	// Totales congelados
	Subtotal   decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	Impuestos  decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	Descuento  decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	Total      decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`

	// Estado
	Estatus string `gorm:"size:30;default:'vigente';index"`

	ArchivoXML              string `gorm:"type:text"`
	ArchivoXMLCancelacion   string `gorm:"type:text"`
}