package models

type Perfil struct {
	BaseModel
	NombrePerfil string `gorm:"column:perfil"`
}

func (Perfil) TableName() string {
	return "perfiles"
}
