package models

type TipoAutorizacion struct {
	BaseModel
	Descripcion string `gorm:"size:150;not null"`
}

func (TipoAutorizacion) TableName() string {
	return "tipos_autorizacion"
}
