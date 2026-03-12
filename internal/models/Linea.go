package models

type Linea struct {
	BaseModel
	NombreLinea string `gorm:"size:150;not null;uniqueIndex"`
}

func (Linea) TableName() string {
	return "lineas"
}
