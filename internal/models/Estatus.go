package models

type Estatus struct {
	BaseModel

	Nombre string `gorm:"size:50;not null;uniqueIndex"`
}

func (Estatus) TableName() string {
	return "estatus"
}
