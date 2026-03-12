package models

type SATProducto struct {
	BaseModel

	Clave       string `gorm:"size:200;not null;uniqueIndex"`
	Descripcion string `gorm:"type:text"`
	Activo      bool   `gorm:"default:true"`
}

func (SATProducto) TableName() string {
	return "sat_productos"
}
