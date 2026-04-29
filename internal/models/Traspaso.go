package models

import "time"

type Traspaso struct {
	BaseModel
	PedidoID          uint
	Pedido            Pedido `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	SucursalOrigenID  uint
	SucursalOrigen    Sucursal `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	SucursalDestinoID uint
	SucursalDestino   Sucursal `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	EstatusID         uint
	Estatus           Estatus `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	FechaEnvio        time.Time
	FechaRecepcion    *time.Time
	Sync              bool
}

func (Traspaso) TableName() string {
	return "traspasos"
}
