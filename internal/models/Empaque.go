package models

type Empaque struct {
	BaseModel

	CodigoEmpaque string `gorm:"uniqueIndex"`
	NombreEmpaque string `gorm:"column:empaque"`
	Contenido     float64
	Sync          bool

	UnidadID *uint
}

func (Empaque) TableName() string {
	return "empaques"
}
