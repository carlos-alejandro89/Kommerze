package dto

import "github.com/shopspring/decimal"

// CerrarOperacionSucursalDto contiene los datos del supervisor al cerrar la jornada.
// Los campos financieros son calculados automáticamente en el repositorio
// desde los pedidos y pagos del período, y se guardan desnormalizados
// para no recalcular en cada consulta posterior.
type CerrarOperacionSucursalDto struct {
	OperacionID     uint
	UsuarioCierreID uint

	// Campos calculados automáticamente desde pedidos/pagos del período
	ValorFinalInventario decimal.Decimal
	ValorVentas          decimal.Decimal
	DescuentosAplicados  decimal.Decimal
	AjusteInventario     decimal.Decimal

	IngresoEfectivo      decimal.Decimal
	IngresoTarjetas      decimal.Decimal
	IngresoCheques       decimal.Decimal
	IngresoTransferencia decimal.Decimal
	IngresoOtros         decimal.Decimal

	Creditos       decimal.Decimal
	ValesSalida    decimal.Decimal
	ValesEntrantes decimal.Decimal

	// CFDI por forma de pago
	CFDIEfectivo      int
	CFDITarjetas      int
	CFDICheques       int
	CFDITransferencia int
	CFDIOtros         int

	BajasMercancia decimal.Decimal
}
