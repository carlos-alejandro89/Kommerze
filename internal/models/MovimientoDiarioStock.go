package models

import (
	"time"

	"github.com/shopspring/decimal"
)

// MovimientoDiarioStock conserva el saldo y los acumulados de una
// presentacion por dia. El detalle cronologico permanece en las tablas que
// originaron cada movimiento.
type MovimientoDiarioStock struct {
	BaseModel

	FechaRegistro time.Time    `gorm:"type:date;not null;uniqueIndex:ux_movimiento_diario_fecha_nivel"`
	NivelID       uint         `gorm:"not null;uniqueIndex:ux_movimiento_diario_fecha_nivel;index"`
	Nivel         NivelEmpaque `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	InventarioInicial     decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	Compras               decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	Ventas                decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	TransferenciasEntrada decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	TransferenciasSalida  decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	BajasMercancia        decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	Conversiones          decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	AjustesAuditoria      decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
	InventarioFinal       decimal.Decimal `gorm:"type:decimal(18,6);not null;default:0"`
}

func (MovimientoDiarioStock) TableName() string { return "movimiento_diario_stock" }
