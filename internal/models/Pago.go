package models

import "time"

type Pago struct {
	BaseModel

	FormaID uint
	Forma   SATFormaPago

	PedidoID uint
	Pedido   Pedido

	Fecha         time.Time `gorm:"type:timestamptz;not null;default:now();index"`
	Monto         float64   // Importe aplicado a la venta.
	MontoRecibido float64   // Importe entregado por el cliente.
	Cambio        float64   // Efectivo devuelto al cliente.
	Saldo         float64
	Sync          bool
}

func (Pago) TableName() string {
	return "pagos"
}
