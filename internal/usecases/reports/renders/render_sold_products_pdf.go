package renders

import (
	"bytes"
	"fmt"
	"time"

	reportmodels "BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

func RenderSoldProductsPDF(report reportmodels.SoldProductsReport) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "Letter", "")
	pdf.SetMargins(14, 12, 14)
	pdf.SetAutoPageBreak(false, 12)
	pdf.SetTitle("Conteo de productos vendidos", true)
	pdf.SetAuthor("Kommerze", true)

	drawHeader := func() {
		pdf.AddPage()
		tr := pdf.UnicodeTranslatorFromDescriptor("")
		if !drawReportHeaderLogo(pdf, fmt.Sprintf("sold-products-logo-%d", pdf.PageNo()), 14, 12, 43, 17) {
			drawKommerzeMark(pdf, 14, 13, 9)
			setRGB(pdf, quotationNavy)
			pdf.SetFont("Arial", "B", 18)
			pdf.SetXY(26, 14)
			pdf.Cell(42, 8, "KOMMERZE")
		}
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 17)
		pdf.SetXY(68, 12)
		pdf.CellFormat(134, 8, tr("CONTEO DE PRODUCTOS VENDIDOS"), "", 1, "R", false, 0, "")
		pdf.SetFont("Arial", "", 8)
		pdf.SetXY(68, 21)
		pdf.CellFormat(134, 5, tr("Periodo: "+formatReportDate(report.FechaInicio)+" al "+formatReportDate(report.FechaFin)), "", 1, "R", false, 0, "")
		business := report.Empresa
		if business == "" {
			business = "Kommerze"
		}
		pdf.SetFont("Arial", "B", 7.5)
		pdf.SetXY(68, 27)
		pdf.CellFormat(134, 4, tr(business), "", 1, "R", false, 0, "")
		if report.Sucursal != "" {
			pdf.SetFont("Arial", "", 7)
			pdf.SetXY(68, 31)
			pdf.CellFormat(134, 4, tr(report.Sucursal), "", 1, "R", false, 0, "")
		}
		setRGBDraw(pdf, quotationBlue)
		pdf.SetLineWidth(.7)
		pdf.Line(14, 39, 202, 39)
	}

	drawTableHeader := func(y float64) {
		tr := pdf.UnicodeTranslatorFromDescriptor("")
		setRGBFill(pdf, quotationNavy)
		pdf.RoundedRect(14, y, 188, 8, 2, "12", "F")
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 7)
		columns := []struct {
			x, width float64
			label    string
			align    string
		}{{14, 31, "CÓDIGO", "L"}, {45, 91, "PRODUCTO", "L"}, {136, 39, "EMPAQUE", "L"}, {175, 27, "CANTIDAD", "R"}}
		for _, column := range columns {
			pdf.SetXY(column.x+2, y)
			pdf.CellFormat(column.width-4, 8, tr(column.label), "", 0, column.align, false, 0, "")
		}
	}

	drawHeader()
	y := 46.0
	drawTableHeader(y)
	y += 8
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	for index, row := range report.Productos {
		if y+7 > 248 {
			drawSoldProductsFooter(pdf, report)
			drawHeader()
			y = 46
			drawTableHeader(y)
			y += 8
		}
		if index%2 == 1 {
			setRGBFill(pdf, "247,249,253")
			pdf.Rect(14, y, 188, 7, "F")
		}
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "", 7.2)
		pdf.SetXY(16, y)
		pdf.CellFormat(27, 7, tr(truncateReportText(row.Codigo, 18)), "", 0, "L", false, 0, "")
		pdf.SetXY(47, y)
		pdf.CellFormat(87, 7, tr(truncateReportText(row.Producto, 55)), "", 0, "L", false, 0, "")
		pdf.SetXY(138, y)
		pdf.CellFormat(35, 7, tr(truncateReportText(row.Empaque, 23)), "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "B", 7.4)
		pdf.SetXY(177, y)
		pdf.CellFormat(23, 7, quantity(row.Cantidad), "", 0, "R", false, 0, "")
		setRGBDraw(pdf, quotationLine)
		pdf.Line(14, y+7, 202, y+7)
		y += 7
	}

	if y+25 > 248 {
		drawSoldProductsFooter(pdf, report)
		drawHeader()
		y = 48
	}
	setRGBFill(pdf, "235,242,255")
	pdf.RoundedRect(124, y+6, 78, 18, 2, "1234", "F")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetXY(130, y+9)
	pdf.Cell(41, 5, "PRESENTACIONES")
	pdf.SetXY(184, y+9)
	pdf.CellFormat(12, 5, fmt.Sprint(report.TotalProductos), "", 1, "R", false, 0, "")
	pdf.SetXY(130, y+15)
	pdf.Cell(41, 5, "UNIDADES VENDIDAS")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetXY(174, y+14)
	pdf.CellFormat(22, 6, quantity(report.TotalUnidades), "", 1, "R", false, 0, "")
	drawSoldProductsFooter(pdf, report)

	var output bytes.Buffer
	if err := pdf.Output(&output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func drawSoldProductsFooter(pdf *gofpdf.Fpdf, report reportmodels.SoldProductsReport) {
	generated, _ := time.Parse(time.RFC3339, report.GeneradoEn)
	generatedText := report.GeneradoEn
	if !generated.IsZero() {
		generatedText = generated.Format("02/01/2006 15:04")
	}
	setRGBDraw(pdf, quotationLine)
	pdf.Line(14, 263, 202, 263)
	setRGB(pdf, "102,112,133")
	pdf.SetFont("Arial", "", 6.2)
	pdf.SetXY(14, 265)
	pdf.Cell(130, 4, "Generado por Kommerze POS · "+generatedText)
	pdf.SetXY(178, 265)
	pdf.CellFormat(24, 4, fmt.Sprintf("Página %d", pdf.PageNo()), "", 0, "R", false, 0, "")
}

func formatReportDate(value string) string {
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return value
	}
	return parsed.Format("02/01/2006")
}
