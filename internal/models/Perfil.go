package models

type Perfil struct {
	BaseModel
	// Perfil representa el rol operativo asignado a un usuario. Se conserva el
	// nombre de la tabla y de la columna por compatibilidad con la sincronizacion
	// actual del catalogo de perfiles de KommerzeCloudAPI.
	NombrePerfil string          `gorm:"column:perfil" json:"nombre"`
	Descripcion  string          `json:"descripcion"`
	Activo       bool            `gorm:"not null;default:true" json:"activo"`
	Permisos     []PerfilPermiso `gorm:"foreignKey:PerfilID" json:"permisos,omitempty"`
}

func (Perfil) TableName() string {
	return "perfiles"
}
