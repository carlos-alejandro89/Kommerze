package models

type SatUnidadesMedida struct {
	BaseModel
	Clave          string `gorm:"size:10;uniqueIndex;not null"`
	NombreUnidad   string `gorm:"size:250;not null"`
	DescripcionUso string `gorm:"size:250;not null"`
	IsActive       bool   `gorm:"default:true"`
}

func (SatUnidadesMedida) TableName() string {
	return "sat_unidades_medida"
}
