package models

type SATRegimenFiscal struct {
	BaseModel
	Clave string `gorm:"size:10;uniqueIndex;not null"`
	Descripcion string `gorm:"size:250;not null"`
	Activo bool `gorm:"default:true"`
}

func (SATRegimenFiscal) TableName() string {
	return "sat_regimen_fiscal"
}

