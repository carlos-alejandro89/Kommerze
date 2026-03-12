package models

type SATUsoCFDI struct {
	BaseModel
	Clave string `gorm:"size:5;uniqueIndex;not null"`
	Descripcion string `gorm:"size:250;not null"`
	Activo bool `gorm:"default:true"`
}

func (SATUsoCFDI) TableName() string {
	return "sat_usos_cfdi"
}