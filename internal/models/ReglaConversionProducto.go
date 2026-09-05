package models

import "github.com/shopspring/decimal"

// ReglaConversionProducto define la equivalencia operativa entre una
// presentación fraccionable y un nivel de empaque de su producto base.
type ReglaConversionProducto struct {
	BaseModel

	NivelEmpaqueOrigenID uint         `gorm:"not null;index"`
	NivelEmpaqueOrigen   NivelEmpaque `gorm:"foreignKey:NivelEmpaqueOrigenID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	NivelEmpaqueDestinoID uint         `gorm:"not null;index"`
	NivelEmpaqueDestino   NivelEmpaque `gorm:"foreignKey:NivelEmpaqueDestinoID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	// FactorSugerido conserva la equivalencia calculada a partir del contenido
	// de ambos empaques. FactorConversion es el valor editable que se utilizará
	// al ejecutar la conversión.
	FactorSugerido         decimal.Decimal `gorm:"type:decimal(18,6);not null;check:chk_regla_factor_sugerido_positivo,factor_sugerido > 0"`
	FactorConversion       decimal.Decimal `gorm:"type:decimal(18,6);not null;check:chk_regla_factor_conversion_positivo,factor_conversion > 0"`
	ConfiguradoManualmente bool            `gorm:"not null;default:false"`
	Activo                 bool            `gorm:"not null;default:true"`
}

func (ReglaConversionProducto) TableName() string {
	return "reglas_conversion_producto"
}
