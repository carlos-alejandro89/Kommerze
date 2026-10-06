package models

// PerfilPermiso relaciona un rol (Perfil) con una capacidad del sistema. La
// bandera Permitido permite que Cloud envie de forma explicita tanto permisos
// concedidos como denegados sin perder la estructura completa del catalogo.
type PerfilPermiso struct {
	BaseModel
	PerfilID  uint           `gorm:"not null;uniqueIndex:ux_perfil_permiso" json:"perfilId"`
	Perfil    Perfil         `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
	PermisoID uint           `gorm:"not null;uniqueIndex:ux_perfil_permiso" json:"permisoId"`
	Permiso   PermisoSistema `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"permiso"`
	Permitido bool           `gorm:"not null;default:false" json:"permitido"`
}

func (PerfilPermiso) TableName() string {
	return "perfil_permisos"
}
