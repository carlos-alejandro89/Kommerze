package models

type EntidadFiscal struct {
	BaseModel

	RegimenID *uint
	Regimen   SATRegimenFiscal `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	RazonSocial  string `gorm:"size:400;not null"`
	RFC          string `gorm:"size:20;index"`
	CodigoPostal string `gorm:"size:6"`
	Correo       string `gorm:"size:150"`
	Telefono     string `gorm:"size:20"`
	Whatsapp     string `gorm:"size:20"`
}

func (EntidadFiscal) TableName() string {
	return "entidades_fiscales"
}
