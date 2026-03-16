package models

import "gorm.io/datatypes"

type Producto struct {
	BaseModel
	ProductoBaseId int

	SatProductoID *uint
	SatProducto   SATProducto

	Prefijo        string `gorm:"size:200;not null;index"`
	Descripcion    string `gorm:"type:text"`
	ObjetoImpuesto string `gorm:"type:text"`
	Fraccionable   bool   `gorm:"default:false"`

	InformacionProducto datatypes.JSON `gorm:"type:jsonb;index:,class:gin"`
	Caracteristicas     datatypes.JSON `gorm:"type:jsonb;index:,class:gin"`
	InstruccionesUso    datatypes.JSON `gorm:"type:jsonb;index:,class:gin"`

	LineaID *uint
	Linea   Linea `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	MarcaID *uint
	Marca   Marca `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
}

func (Producto) TableName() string {
	return "productos"
}

//ejemplo de uso: Caracteristicas: datatypes.JSON([]byte(`{"potencia": "1500W", "voltaje": 220}`)),
