package models

type Caja struct {
	BaseModel

	// 🏷 Identificación
	Clave    string `gorm:"size:200;uniqueIndex"` // CAJA-01
	Nombre   string `gorm:"size:100;not null"`    // Caja 1
	Licencia string

	// ⚙ Configuración
	Activa        bool `gorm:"default:true"`
	PermiteVentas bool `gorm:"default:true"`
	EsPrincipal   bool `gorm:"default:false"`
}

func (Caja) TableName() string {
	return "cajas"
}
