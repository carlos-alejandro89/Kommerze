package renders

import (
	"bytes"

	reportmodels "BitComercio/internal/usecases/reports/models"
)

func RenderCashClosingPDF(r reportmodels.CashClosingReport) ([]byte, error) {
	pdf := closingReportPDF(r.Header, "Cierre de caja")
	pdf.AddPage()
	tr := pdf.UnicodeTranslatorFromDescriptor("")

	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(0, 7, tr("RESUMEN DEL TURNO"), "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(72, 91, 126)
	pdf.CellFormat(98, 6, tr("Caja: "+r.CashRegister), "", 0, "L", false, 0, "")
	pdf.CellFormat(98, 6, tr("Responsable: "+r.Cashier), "", 1, "L", false, 0, "")
	pdf.Ln(3)

	drawCashClosingMetric(pdf, tr("VENTAS REGISTRADAS"), quantity(float64(r.Sales)), 10, 48)
	drawCashClosingMetric(pdf, tr("VENTAS CANCELADAS"), quantity(float64(r.CancelledSales)), 60, 48)
	drawCashClosingMetric(pdf, tr("TOTAL INGRESOS"), money(r.TotalIncome), 110, 48)
	drawCashClosingMetric(pdf, tr("EFECTIVO ESPERADO"), money(r.ExpectedCash), 160, 48)
	pdf.SetY(72)

	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(0, 7, tr("INGRESOS POR FORMA DE PAGO"), "", 1, "L", false, 0, "")
	setRGBFill(pdf, "239,245,255")
	pdf.SetFont("Arial", "B", 7)
	pdf.CellFormat(116, 8, tr("FORMA DE PAGO"), "", 0, "L", true, 0, "")
	pdf.CellFormat(30, 8, tr("CLAVE SAT"), "", 0, "C", true, 0, "")
	pdf.CellFormat(50, 8, tr("IMPORTE"), "", 1, "R", true, 0, "")
	pdf.SetFont("Arial", "", 8)
	for _, payment := range r.Payments {
		pdf.CellFormat(116, 8, tr(payment.Name), "B", 0, "L", false, 0, "")
		pdf.CellFormat(30, 8, payment.SATCode, "B", 0, "C", false, 0, "")
		pdf.CellFormat(50, 8, money(payment.Amount), "B", 1, "R", false, 0, "")
	}
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(146, 9, tr("TOTAL INGRESOS"), "T", 0, "R", false, 0, "")
	pdf.CellFormat(50, 9, money(r.TotalIncome), "T", 1, "R", false, 0, "")
	pdf.Ln(6)

	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(0, 7, tr("EFECTIVO AL CIERRE"), "", 1, "L", false, 0, "")
	drawCashClosingLine(pdf, tr("Fondo de apertura"), money(r.OpeningFund))
	drawCashClosingLine(pdf, tr("Ingresos en efectivo"), money(r.CashIncome))
	drawCashClosingLine(pdf, tr("Efectivo esperado en caja"), money(r.ExpectedCash))
	drawCashClosingLine(pdf, tr("Efectivo declarado al cierre"), money(r.ClosingCash))
	drawCashClosingLine(pdf, tr("Diferencia"), money(r.ClosingCash-r.ExpectedCash))

	var buffer bytes.Buffer
	if err := pdf.Output(&buffer); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func drawCashClosingMetric(pdf interface {
	SetXY(float64, float64)
	SetFont(string, string, float64)
	CellFormat(float64, float64, string, string, int, string, bool, int, string)
}, label, value string, x, y float64) {
	pdf.SetXY(x, y)
	pdf.SetFont("Arial", "", 6.5)
	pdf.CellFormat(44, 5, label, "", 1, "L", false, 0, "")
	pdf.SetXY(x, y+5)
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(44, 7, value, "", 1, "L", false, 0, "")
}

func drawCashClosingLine(pdf interface {
	SetFont(string, string, float64)
	CellFormat(float64, float64, string, string, int, string, bool, int, string)
}, label, value string) {
	pdf.SetFont("Arial", "", 8)
	pdf.CellFormat(146, 8, label, "B", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "B", 8)
	pdf.CellFormat(50, 8, value, "B", 1, "R", false, 0, "")
}
