package renders

import (
	"bytes"
	"fmt"

	reportmodels "BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

func RenderProfitPDF(report reportmodels.ProfitReport) ([]byte, error) {
	pdf := gofpdf.New("L", "mm", "Letter", "")
	pdf.SetMargins(12, 10, 12)
	pdf.SetAutoPageBreak(false, 0)
	pdf.SetTitle("Reporte de utilidad", true)
	pdf.SetAuthor("Kommerze", true)

	drawHeader := func() {
		pdf.AddPage()
		tr := pdf.UnicodeTranslatorFromDescriptor("")
		if !drawReportHeaderLogo(pdf, fmt.Sprintf("profit-logo-%d", pdf.PageNo()), 12, 10, 43, 17) {
			drawKommerzeMark(pdf, 12, 11, 9)
			setRGB(pdf, quotationNavy)
			pdf.SetFont("Arial", "B", 18)
			pdf.SetXY(24, 12)
			pdf.Cell(42, 8, "KOMMERZE")
		}
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 18)
		pdf.SetXY(68, 10)
		pdf.CellFormat(197, 9, tr("REPORTE DE UTILIDAD"), "", 1, "R", false, 0, "")
		pdf.SetFont("Arial", "", 8)
		pdf.SetXY(68, 20)
		pdf.CellFormat(197, 5, tr("Periodo: "+formatReportDate(report.FechaInicio)+" al "+formatReportDate(report.FechaFin)), "", 1, "R", false, 0, "")
		pdf.SetFont("Arial", "B", 7.5)
		pdf.SetXY(68, 26)
		pdf.CellFormat(197, 4, tr(report.Empresa+" · "+report.Sucursal), "", 1, "R", false, 0, "")
		setRGBDraw(pdf, quotationBlue)
		pdf.SetLineWidth(.7)
		pdf.Line(12, 36, 267, 36)
	}

	drawColumns := func(y float64) {
		tr := pdf.UnicodeTranslatorFromDescriptor("")
		setRGBFill(pdf, quotationNavy)
		pdf.RoundedRect(12, y, 255, 8, 2, "12", "F")
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 6.7)
		columns := []struct {
			x, width     float64
			label, align string
		}{
			{12, 17, "FOLIO", "L"}, {29, 20, "FECHA", "L"}, {49, 27, "CÓDIGO", "L"},
			{76, 67, "PRODUCTO", "L"}, {143, 30, "EMPAQUE", "L"}, {173, 16, "CANT.", "R"},
			{189, 20, "VENTA", "R"}, {209, 19, "DESC.", "R"}, {228, 19, "COSTO", "R"}, {247, 20, "UTILIDAD", "R"},
		}
		for _, column := range columns {
			pdf.SetXY(column.x+1, y)
			pdf.CellFormat(column.width-2, 8, tr(column.label), "", 0, column.align, false, 0, "")
		}
	}

	drawFooter := func() {
		setRGBDraw(pdf, quotationLine)
		pdf.Line(12, 198, 267, 198)
		setRGB(pdf, "102,112,133")
		pdf.SetFont("Arial", "", 6.2)
		pdf.SetXY(12, 200)
		pdf.Cell(180, 4, "Ventas confirmadas · Generado por Kommerze POS")
		pdf.SetXY(243, 200)
		pdf.CellFormat(24, 4, fmt.Sprintf("Página %d", pdf.PageNo()), "", 0, "R", false, 0, "")
	}

	drawHeader()
	y := 42.0
	drawColumns(y)
	y += 8
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	for index, row := range report.Productos {
		if y+7 > 184 {
			drawFooter()
			drawHeader()
			y = 42
			drawColumns(y)
			y += 8
		}
		if index%2 == 1 {
			setRGBFill(pdf, "247,249,253")
			pdf.Rect(12, y, 255, 7, "F")
		}
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "", 6.6)
		values := []struct {
			x, width     float64
			value, align string
		}{
			{13, 15, fmt.Sprintf("%08d", row.Folio), "L"}, {30, 18, formatReportDate(row.Fecha), "L"},
			{50, 25, truncateReportText(row.Codigo, 16), "L"}, {77, 65, truncateReportText(row.Producto, 43), "L"},
			{144, 28, truncateReportText(row.Empaque, 18), "L"}, {174, 14, quantity(row.Cantidad), "R"},
			{190, 18, reportMoney(row.Venta), "R"}, {210, 17, reportMoney(row.Descuento), "R"},
			{229, 17, reportMoney(row.Costo), "R"}, {248, 18, reportMoney(row.Utilidad), "R"},
		}
		for _, value := range values {
			pdf.SetXY(value.x, y)
			pdf.CellFormat(value.width, 7, tr(value.value), "", 0, value.align, false, 0, "")
		}
		y += 7
	}

	if y+22 > 184 {
		drawFooter()
		drawHeader()
		y = 45
	}
	setRGBFill(pdf, "235,242,255")
	pdf.RoundedRect(167, y+5, 100, 18, 2, "1234", "F")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetXY(172, y+8)
	pdf.Cell(30, 5, "VENTA NETA")
	pdf.SetXY(202, y+8)
	pdf.CellFormat(25, 5, reportMoney(report.TotalVentas-report.TotalDescuento), "", 0, "R", false, 0, "")
	pdf.SetXY(172, y+14)
	pdf.Cell(30, 5, "COSTO")
	pdf.SetXY(202, y+14)
	pdf.CellFormat(25, 5, reportMoney(report.TotalCosto), "", 0, "R", false, 0, "")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(230, y+10)
	pdf.CellFormat(32, 7, reportMoney(report.TotalUtilidad), "", 0, "R", false, 0, "")
	drawFooter()

	var output bytes.Buffer
	if err := pdf.Output(&output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func reportMoney(value float64) string {
	return fmt.Sprintf("$%.2f", value)
}
