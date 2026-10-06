package models

type Usuario struct {
	BaseModel

	Nombre            string `gorm:"size:150;not null"`
	CorreoElectronico string `gorm:"size:150;uniqueIndex"`
	Password          string `gorm:"size:255;not null" json:"-"`

	CorreoConfirmado bool
	Telefono         string

	PerfilID uint
	Perfil   Perfil `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	// Permisos contiene solamente las claves concedidas al perfil. No se
	// persiste en usuarios: se hidrata al autenticar y viaja con la sesión.
	Permisos []string `gorm:"-" json:"permisos"`
}

func (Usuario) TableName() string {
	return "usuarios"
}
