package models

type SATMetodoPago struct {
	BaseModel
	Clave string `gorm:"size:5;uniqueIndex;not null"`
	Descripcion string `gorm:"size:250;not null"`
}

func (SATMetodoPago) TableName() string {
	return "sat_metodos_pago"
}