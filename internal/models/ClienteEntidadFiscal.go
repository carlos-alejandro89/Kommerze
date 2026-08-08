package models

type ClienteEntidadFiscal struct {
	BaseModel

	ClienteID uint
	Cliente   Cliente `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`

	EntidadFiscalID uint
	EntidadFiscal   EntidadFiscal `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

func (ClienteEntidadFiscal) TableName() string {
	return "cliente_entidad_fiscal"
}
