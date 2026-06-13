package dto

// AbrirCajaDto contiene los datos necesarios para iniciar el turno de un cajero.
type AbrirCajaDto struct {
	OperacionSucursalID uint
	ResponsableCajaID   uint
	CajaNombre          string  // nombre o identificador libre de la caja (ej. "CAJA-01")
	FondoCajaApertura   float64 // efectivo con el que inicia el cajero
}
