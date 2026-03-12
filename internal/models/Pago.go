package models

import "time"

type Pago struct {
	BaseModel
	
	FormaID  *uint
	Forma SATFormaPago

	PedidoID  *uint
	Pedido Pedido 

	Fecha    *time.Time
	Monto    float64
	Saldo    float64
	Sync bool
}

func (Pago) TableName() string {
	return "pagos"
}