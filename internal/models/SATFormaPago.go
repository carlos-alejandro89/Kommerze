package models

type SATFormaPago struct {
	BaseModel
	Clave string `gorm:"size:5;uniqueIndex;not null"`
	Descripcion string `gorm:"size:250;not null"`
	Activo bool `gorm:"default:true"`
}

func (SATFormaPago) TableName() string {
	return "sat_formas_pago"
}