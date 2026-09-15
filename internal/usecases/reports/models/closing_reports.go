package models

import "time"

type ClosingReportHeader struct {
	Negocio, RazonSocial, RFC, Sucursal string
	FechaInicio, FechaFin               time.Time
}

type DiscountReportRow struct {
	Folio                            string
	Fecha                            time.Time
	Cliente                          string
	TotalBruto, Descuento, TotalNeto float64
}

type DiscountReport struct {
	Header                           ClosingReportHeader
	Rows                             []DiscountReportRow
	TotalBruto, Descuento, TotalNeto float64
}

type TransferSummaryRow struct {
	Folio, SucursalOrigen, SucursalDestino string
	FechaEnvio                             time.Time
	FechaRecepcion                         *time.Time
	ValorTotal                             float64
}

type TransferSummaryReport struct {
	Header     ClosingReportHeader
	Direction  string
	Rows       []TransferSummaryRow
	ValorTotal float64
}

type CashClosingPayment struct {
	Name, SATCode string
	Amount        float64
}

type CashClosingReport struct {
	Header                                ClosingReportHeader
	CashRegister, Cashier                 string
	Sales, CancelledSales                 int
	Payments                              []CashClosingPayment
	OpeningFund, TotalIncome              float64
	CashIncome, ExpectedCash, ClosingCash float64
}

type FinancialMetric struct {
	Label string
	Value float64
}

type FinancialSaleRow struct {
	Folio, Cliente string
	Fecha          time.Time
	Total          float64
}

type FinancialPurchaseRow struct {
	Folio, Proveedor, OrigenCaptura string
	Fecha                           time.Time
	Total                           float64
}

type FinancialInvoiceRow struct {
	FolioCFDI, FoliosVenta, Receptor, Estatus string
	Fecha                                     time.Time
	Total                                     float64
	EsGlobal                                  bool
}

type FinancialClosingReport struct {
	Header                                   ClosingReportHeader
	VentasInventario, Ingresos, CFDI         []FinancialMetric
	Ventas                                   []FinancialSaleRow
	Compras                                  []FinancialPurchaseRow
	Facturas                                 []FinancialInvoiceRow
	TotalVentas, TotalCompras, TotalFacturas float64
}
