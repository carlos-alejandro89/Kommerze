package models

type Marca struct {
	BaseModel
	NombreMarca string `gorm:"size:150;not null;uniqueIndex"`
}

func (Marca) TableName() string {
	return "marcas"
}
