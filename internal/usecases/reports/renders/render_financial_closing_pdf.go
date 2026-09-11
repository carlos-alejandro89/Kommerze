package renders

import (
	"bytes"
	"strings"

	reportmodels "BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

func RenderFinancialClosingPDF(r reportmodels.FinancialClosingReport) ([]byte, error) {
	pdf := closingReportPDF(r.Header, "Resumen financiero")
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	pdf.AddPage()
	drawFinancialMetricSection(pdf, "VENTAS E INVENTARIO", r.VentasInventario, 2)
	drawFinancialMetricSection(pdf, "INGRESOS POR FORMA DE PAGO", r.Ingresos, 3)
	drawFinancialMetricSection(pdf, "CFDI POR FORMA DE PAGO", r.CFDI, 3)

	drawFinancialSales(pdf, tr, r.Ventas, r.TotalVentas)
	drawFinancialPurchases(pdf, tr, r.Compras, r.TotalCompras)
	drawFinancialInvoices(pdf, tr, r.Facturas, r.TotalFacturas)

	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func drawFinancialMetricSection(pdf *gofpdf.Fpdf, title string, items []reportmodels.FinancialMetric, columns int) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	sectionY := pdf.GetY()
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetXY(10, sectionY)
	pdf.CellFormat(196, 5, tr(title), "", 0, "L", false, 0, "")
	cellW := 196 / float64(columns)
	for index, item := range items {
		row := index / columns
		x := 10 + float64(index%columns)*cellW
		y := sectionY + 6 + float64(row)*12
		highlight := strings.HasPrefix(item.Label, "Total ") || item.Label == "Valor real de las ventas" || item.Label == "Valor final inventario"
		if highlight {
			setRGBFill(pdf, "239,245,255")
		} else {
			setRGBFill(pdf, "249,251,254")
		}
		setRGBDraw(pdf, quotationLine)
		pdf.RoundedRect(x, y, cellW-3, 9.5, 1.5, "1234", "DF")
		setRGB(pdf, "72,91,126")
		pdf.SetFont("Arial", "B", 4.8)
		pdf.SetXY(x+3, y+1.3)
		pdf.CellFormat(cellW-9, 2.5, tr(strings.ToUpper(item.Label)), "", 0, "L", false, 0, "")
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", map[bool]float64{true: 8, false: 7}[highlight])
		pdf.SetXY(x+3, y+4.5)
		pdf.CellFormat(cellW-9, 3.5, money(item.Value), "", 0, "L", false, 0, "")
	}
	rows := (len(items) + columns - 1) / columns
	pdf.SetY(sectionY + 9 + float64(rows)*12)
}

func financialTableTitle(pdf *gofpdf.Fpdf, title, subtitle string) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(196, 6, tr(title), "", 1, "L", false, 0, "")
	pdf.SetTextColor(92, 105, 128)
	pdf.SetFont("Arial", "", 6.5)
	pdf.CellFormat(196, 4, tr(subtitle), "", 1, "L", false, 0, "")
	pdf.Ln(3)
}

func financialTableHead(pdf *gofpdf.Fpdf, headings []string, widths []float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBFill(pdf, "239,245,255")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 6.2)
	for index, heading := range headings {
		alignment := "L"
		if index == len(headings)-1 {
			alignment = "R"
		}
		pdf.CellFormat(widths[index], 8, tr(heading), "", 0, alignment, true, 0, "")
	}
	pdf.Ln(8)
}

func drawFinancialSales(pdf *gofpdf.Fpdf, tr func(string) string, rows []reportmodels.FinancialSaleRow, total float64) {
	pdf.AddPage()
	financialTableTitle(pdf, "DETALLE DE VENTAS", "Ventas no canceladas realizadas durante la jornada.")
	widths := []float64{27, 85, 45, 39}
	financialTableHead(pdf, []string{"FOLIO", "CLIENTE", "FECHA", "VALOR DE LA VENTA"}, widths)
	for _, row := range rows {
		if pdf.GetY()+8 > 258 {
			pdf.AddPage()
			financialTableTitle(pdf, "DETALLE DE VENTAS", "Continuación")
			financialTableHead(pdf, []string{"FOLIO", "CLIENTE", "FECHA", "VALOR DE LA VENTA"}, widths)
		}
		pdf.SetFont("Arial", "", 7)
		pdf.CellFormat(widths[0], 7, row.Folio, "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[1], 7, tr(row.Cliente), "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[2], 7, row.Fecha.Format("02/01/2006 15:04"), "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[3], 7, money(row.Total), "B", 1, "R", false, 0, "")
	}
	drawFinancialTotal(pdf, "TOTAL VENTAS", total)
}

func drawFinancialPurchases(pdf *gofpdf.Fpdf, tr func(string) string, rows []reportmodels.FinancialPurchaseRow, total float64) {
	if pdf.GetY()+45 > 258 {
		pdf.AddPage()
	} else {
		pdf.Ln(8)
	}
	financialTableTitle(pdf, "DETALLE DE COMPRAS", "Compras registradas durante la jornada valuadas a precio de venta.")
	widths := []float64{24, 67, 41, 27, 37}
	head := []string{"FOLIO", "PROVEEDOR", "FECHA", "CAPTURA", "IMPORTE"}
	financialTableHead(pdf, head, widths)
	for _, row := range rows {
		if pdf.GetY()+8 > 258 {
			pdf.AddPage()
			financialTableTitle(pdf, "DETALLE DE COMPRAS", "Continuación")
			financialTableHead(pdf, head, widths)
		}
		pdf.SetFont("Arial", "", 7)
		pdf.CellFormat(widths[0], 7, row.Folio, "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[1], 7, tr(row.Proveedor), "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[2], 7, row.Fecha.Format("02/01/2006 15:04"), "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[3], 7, tr(row.OrigenCaptura), "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[4], 7, money(row.Total), "B", 1, "R", false, 0, "")
	}
	drawFinancialTotal(pdf, "TOTAL COMPRAS", total)
}

func drawFinancialInvoices(pdf *gofpdf.Fpdf, tr func(string) string, rows []reportmodels.FinancialInvoiceRow, total float64) {
	pdf.AddPage()
	financialTableTitle(pdf, "FACTURAS DE LA JORNADA", "CFDI relacionados con las ventas del periodo.")
	widths := []float64{38, 65, 38, 25, 30}
	head := []string{"FOLIO CFDI / VENTA", "RECEPTOR", "FECHA", "ESTATUS", "TOTAL"}
	financialTableHead(pdf, head, widths)
	for _, row := range rows {
		if pdf.GetY()+12 > 258 {
			pdf.AddPage()
			financialTableTitle(pdf, "FACTURAS DE LA JORNADA", "Continuación")
			financialTableHead(pdf, head, widths)
		}
		y := pdf.GetY()
		setRGB(pdf, "196,42,48")
		pdf.SetFont("Arial", "B", 7)
		pdf.SetXY(10, y)
		pdf.CellFormat(widths[0], 5, row.FolioCFDI, "", 1, "L", false, 0, "")
		setRGB(pdf, "72,91,126")
		pdf.SetFont("Arial", "", 5.5)
		pdf.SetXY(10, y+5)
		detail := "Venta: " + row.FoliosVenta
		if row.EsGlobal {
			detail = "Factura Global"
		}
		pdf.CellFormat(widths[0], 5, tr(detail), "B", 0, "L", false, 0, "")
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "", 7)
		pdf.SetXY(10+widths[0], y)
		pdf.CellFormat(widths[1], 10, tr(row.Receptor), "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[2], 10, row.Fecha.Format("02/01/2006 15:04"), "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[3], 10, tr(row.Estatus), "B", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "B", 7)
		pdf.CellFormat(widths[4], 10, money(row.Total), "B", 1, "R", false, 0, "")
	}
	drawFinancialTotal(pdf, "TOTAL FACTURADO", total)
}

func drawFinancialTotal(pdf *gofpdf.Fpdf, label string, total float64) {
	if pdf.GetY()+12 > 258 {
		pdf.AddPage()
	}
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 8)
	pdf.CellFormat(157, 10, label, "T", 0, "R", false, 0, "")
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(39, 10, money(total), "T", 1, "R", false, 0, "")
}
