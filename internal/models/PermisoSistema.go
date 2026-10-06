package models

// PermisoSistema representa una capacidad puntual dentro de un modulo. Clave
// debe ser globalmente unica (por ejemplo "historial_ventas.cancelar").
type PermisoSistema struct {
	BaseModel
	ModuloID    uint          `gorm:"not null;index" json:"moduloId"`
	Modulo      ModuloSistema `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
	Clave       string        `gorm:"size:120;not null;uniqueIndex" json:"clave"`
	Nombre      string        `gorm:"size:140;not null" json:"nombre"`
	Descripcion string        `gorm:"size:280" json:"descripcion"`
	Orden       int           `gorm:"not null;default:0" json:"orden"`
	Activo      bool          `gorm:"not null;default:true" json:"activo"`
}

func (PermisoSistema) TableName() string {
	return "permisos_sistema"
}
