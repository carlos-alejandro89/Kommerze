package models

type EntidadFiscalRol struct {
	BaseModel

	EntidadFiscalID uint
	EntidadFiscal   EntidadFiscal `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`

	RolID uint
	Rol   RolesFiscales `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

func (EntidadFiscalRol) TableName() string {
	return "entidad_fiscal_roles"
}
