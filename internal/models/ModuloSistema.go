package models

// ModuloSistema agrupa los permisos que pertenecen a una misma area funcional
// de Kommerze. La clave es el identificador estable que debe compartir la app
// de escritorio con KommerzeCloudAPI y el manager web.
type ModuloSistema struct {
	BaseModel
	Clave       string           `gorm:"size:80;not null;uniqueIndex" json:"clave"`
	Nombre      string           `gorm:"size:120;not null" json:"nombre"`
	Descripcion string           `gorm:"size:280" json:"descripcion"`
	Orden       int              `gorm:"not null;default:0" json:"orden"`
	Activo      bool             `gorm:"not null;default:true" json:"activo"`
	Permisos    []PermisoSistema `gorm:"foreignKey:ModuloID" json:"permisos,omitempty"`
}

func (ModuloSistema) TableName() string {
	return "modulos_sistema"
}
