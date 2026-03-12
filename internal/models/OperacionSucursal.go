package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type OperacionSucursal struct {
	BaseModel

	UsuarioAperturaID *uint
    UsuarioApertura   *Usuario `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	UsuarioCierreID *uint
    UsuarioCierre   *Usuario `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	// Relaciones
	SucursalID uint
	Sucursal   Sucursal `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	EstatusID *uint
	Estatus   Estatus `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	// Control de jornada
	FechaInicio time.Time  `gorm:"type:timestamp;not null;index"`
	FechaFin    *time.Time `gorm:"type:timestamp"`

	// Inventario
	ValorInicialInventario decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	ValorCompras           decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	ValorVentas            decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	DescuentosAplicados    decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	AjusteInventario       decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	ValorFinalInventario   decimal.Decimal `gorm:"type:decimal(18,6);default:0"`

	IngresoEfectivo       decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	IngresoTarjetas       decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	IngresoCheques        decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	IngresoTransferencia  decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	IngresoOtros          decimal.Decimal `gorm:"type:decimal(18,6);default:0"`

	Creditos        decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	ValesSalida     decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	ValesEntrantes  decimal.Decimal `gorm:"type:decimal(18,6);default:0"`

	// CFDI por forma de pago
	CFDIEfectivo      decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	CFDITarjetas      decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	CFDICheques       decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	CFDITransferencia decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	CFDIOtros         decimal.Decimal `gorm:"type:decimal(18,6);default:0"`

	BajasMercancia decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
}

func (OperacionSucursal) TableName() string {
	return "operaciones_sucursal"
}