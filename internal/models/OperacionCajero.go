package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type OperacionCajero struct {
	BaseModel

	OperacionID uint
	Operacion   OperacionSucursal `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`

	CajaID *uint
    Caja   *Caja `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	ResponsableCajaID uint
	ResponsableCaja   Usuario `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	// ⏱ Control de tiempo
	FechaInicio time.Time  `gorm:"type:timestamp;not null;index"`
	FechaFin    *time.Time `gorm:"type:timestamp"`

	// 💰 Control financiero básico
	ImporteApertura decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	ImporteCierre decimal.Decimal `gorm:"type:decimal(18,6);default:0"`


	// 📊 Estado
	EstatusID *uint
	Estatus Estatus 
	
	// 🔒 Bloqueo administrativo
	Bloqueada bool `gorm:"default:false"`
}

func (OperacionCajero) TableName() string {
	return "operacion_cajero"
}