package models

import (
	"time"

	"github.com/shopspring/decimal"
)

// OperacionCajero registra el turno/sesión de un cajero en una caja física.
// Los nombres de campos están alineados con el modelo C# OperacionCajero.cs
// del proyecto KommerzeApiCloud para garantizar la sincronización en la nube.
type OperacionCajero struct {
	BaseModel

	// Relación con la jornada de la sucursal
	OperacionSucursalID uint
	Operacion           OperacionSucursal `gorm:"foreignKey:OperacionSucursalID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`

	// Relación con la caja física (opcional — puede ser por nombre)
	CajaID *uint
	Caja   *Caja  `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	CajaNombre string `gorm:"size:100"` // Nombre o identificador libre de la caja

	// Cajero responsable
	ResponsableCajaID uint
	ResponsableCaja   Usuario `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	// 📊 Estado
	EstatusID *uint
	Estatus   Estatus

	// ⏱ Control de tiempo
	FechaInicio time.Time  `gorm:"type:timestamp;not null;index"`
	FechaFin    *time.Time `gorm:"type:timestamp"`

	// 💰 Control financiero (alineado con KommerzeApiCloud OperacionCajero.cs)
	FondoCajaApertura    decimal.Decimal  `gorm:"type:decimal(18,6);default:0"`
	FondoCajaCierre      decimal.Decimal  `gorm:"type:decimal(18,6);default:0"`
	RetirosEfectivo      decimal.Decimal  `gorm:"type:decimal(18,6);default:0"`
	IngresoEfectivo      *decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	IngresoTarjetas      *decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	IngresoCheques       *decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	IngresoTransferencia *decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	IngresoOtros         *decimal.Decimal `gorm:"type:decimal(18,6);default:0"`

	// 🔒 Bloqueo administrativo
	Bloqueada bool `gorm:"default:false"`

	// ☁ Sincronización con la nube (nil = pendiente de sync)
	SyncedAt *time.Time `gorm:"type:timestamp"`
}

func (OperacionCajero) TableName() string {
	return "operacion_cajero"
}