package dto

// ResumenFormaPago representa el total acumulado de una forma de pago en el turno.
type ResumenFormaPago struct {
	FormaID     uint    `json:"FormaID"`
	FormaPago   string  `json:"FormaPago"`
	Clave       string  `json:"Clave"`
	Monto       float64 `json:"Monto"`
}

// ResumenCajeroDto es la respuesta de ObtenerResumenCajero:
// un desglose dinámico por forma de pago real más el conteo de ventas.
type ResumenCajeroDto struct {
	NumVentas   int                `json:"NumVentas"`
	Desglose    []ResumenFormaPago `json:"Desglose"`
	TotalIngresos float64          `json:"TotalIngresos"`
}
