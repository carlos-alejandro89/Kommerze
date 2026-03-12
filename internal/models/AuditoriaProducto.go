package models

type AuditoriaProducto struct {
	BaseModel

	AuditoriaId uint
	Auditoria   Auditoria `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	NivelID uint
	Nivel   NivelEmpaque `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	EnExistencia float64
	ConteoFisico float64

	PrecioCompra float64 `gorm:"column:pcompra"`
	PrecioVenta  float64 `gorm:"column:pventa"`

	Nota string
}

func (AuditoriaProducto) TableName() string {
	return "auditoria_producto"
}