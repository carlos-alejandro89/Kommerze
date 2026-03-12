package models

import (
	"github.com/shopspring/decimal"
)

type Sucursal struct {
	BaseModel

	EmpresaID *uint   `gorm:"index"`
	Empresa   Empresa `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	Clave          string `gorm:"size:5"`
	NombreSucursal string `gorm:"size:100"`
	Calle          string `gorm:"size:150"`
	Exterior       string `gorm:"size:20"`
	Interior       string `gorm:"size:20"`
	Colonia        string `gorm:"size:150"`
	Ciudad         string `gorm:"size:150"`
	Estado         string `gorm:"size:100"`
	CodigoPostal   string `gorm:"size:5"`
	Telefono       string `gorm:"size:20"`
	Telefono2      string `gorm:"size:20"`
	Correo         string `gorm:"size:200"`
	Licencia       string `gorm:"size:20"`

	// Reemplazo de float y money
	ComisionVentas  decimal.Decimal `gorm:"type:decimal(18,6);default:0"`
	ValorInventario decimal.Decimal `gorm:"type:decimal(18,6);default:0"`

	SerieCFDI string `gorm:"size:20"`

	Sync bool `gorm:"default:false"`
}

func (Sucursal) TableName() string {
	return "sucursales"
}
