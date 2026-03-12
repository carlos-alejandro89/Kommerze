package models

type Caja struct {
	BaseModel

	// 🏷 Identificación
	Nombre string `gorm:"size:100;not null"`        // Caja 1
	Clave  string `gorm:"size:20;uniqueIndex"`     // CAJA-01

	// ⚙ Configuración
	Activa         bool `gorm:"default:true"`
	PermiteVentas  bool `gorm:"default:true"`
	EsPrincipal    bool `gorm:"default:false"`

}

func (Caja) TableName() string {
	return "cajas"
}