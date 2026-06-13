package dto

// CerrarCajaDto contiene los datos financieros capturados al cerrar el turno del cajero.
// Los campos de ingreso son opcionales (nil = no aplica para ese cajero).
type CerrarCajaDto struct {
	OperacionCajeroID    uint
	FondoCajaCierre      float64 // efectivo contado al cierre
	RetirosEfectivo      float64 // retiros realizados durante el turno
	IngresoEfectivo      float64
	IngresoTarjetas      float64
	IngresoCheques       float64
	IngresoTransferencia float64
	IngresoOtros         float64
	Bloqueada            bool // true si el admin bloquea la caja
}
