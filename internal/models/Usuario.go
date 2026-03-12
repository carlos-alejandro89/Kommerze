package models

type Usuario struct {
	BaseModel

	Nombre            string `gorm:"size:150;not null"`
	CorreoElectronico string `gorm:"size:150;uniqueIndex"`
	Password          string `gorm:"size:255;not null"`

	CorreoConfirmado bool
	Telefono         string

	PerfilID uint
	Perfil   Perfil `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`
}

func (Usuario) TableName() string {
	return "usuarios"
}
