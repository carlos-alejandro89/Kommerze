package renders

import (
	"bytes"
	"fmt"
	"time"

	reportmodels "BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

func RenderKardexPDF(report reportmodels.KardexReport) ([]byte, error) {
	pdf := gofpdf.New("L", "mm", "Letter", "")
	pdf.SetMargins(12, 10, 12)
	pdf.SetAutoPageBreak(false, 12)
	pdf.SetTitle("Kardex del producto", true)
	drawHeader := func() {
		pdf.AddPage()
		tr := pdf.UnicodeTranslatorFromDescriptor("")
		drawKommerzeMark(pdf, 12, 11, 9)
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 17)
		pdf.SetXY(25, 11)
		pdf.Cell(55, 8, "KOMMERZE")
		pdf.SetFont("Arial", "B", 16)
		pdf.SetXY(92, 10)
		pdf.CellFormat(174, 8, tr("KARDEX DEL PRODUCTO"), "", 1, "R", false, 0, "")
		pdf.SetFont("Arial", "", 8)
		pdf.SetXY(92, 19)
		pdf.CellFormat(174, 5, tr(report.Producto.Codigo+" · "+report.Producto.Producto+" · "+report.Producto.Empaque), "", 1, "R", false, 0, "")
		pdf.SetXY(92, 25)
		pdf.CellFormat(174, 5, tr("Periodo: "+formatReportDate(report.FechaInicio)+" al "+formatReportDate(report.FechaFin)), "", 1, "R", false, 0, "")
		setRGBDraw(pdf, quotationBlue)
		pdf.SetLineWidth(.7)
		pdf.Line(12, 34, 267, 34)
	}
	drawColumns := func(y float64) {
		tr := pdf.UnicodeTranslatorFromDescriptor("")
		setRGBFill(pdf, quotationNavy)
		pdf.RoundedRect(12, y, 255, 8, 2, "12", "F")
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 7)
		cols := []struct {
			x, w         float64
			label, align string
		}{{12, 35, "FECHA Y HORA", "L"}, {47, 27, "TIPO", "L"}, {74, 31, "DOCUMENTO", "L"}, {105, 83, "NOTA", "L"}, {188, 25, "ENTRADA", "R"}, {213, 25, "SALIDA", "R"}, {238, 29, "EXISTENCIA", "R"}}
		for _, c := range cols {
			pdf.SetXY(c.x+2, y)
			pdf.CellFormat(c.w-4, 8, tr(c.label), "", 0, c.align, false, 0, "")
		}
	}
	drawFooter := func() {
		setRGBDraw(pdf, quotationLine)
		pdf.Line(12, 198, 267, 198)
		setRGB(pdf, "102,112,133")
		pdf.SetFont("Arial", "", 6.2)
		pdf.SetXY(12, 200)
		pdf.Cell(180, 4, "Generado por Kommerze POS · "+time.Now().Format("02/01/2006 15:04"))
		pdf.SetXY(243, 200)
		pdf.CellFormat(24, 4, fmt.Sprintf("Página %d", pdf.PageNo()), "", 0, "R", false, 0, "")
	}
	drawHeader()
	y := 40.0
	drawColumns(y)
	y += 8
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	for i, row := range report.Movimientos {
		if y+7 > 192 {
			drawFooter()
			drawHeader()
			y = 40
			drawColumns(y)
			y += 8
		}
		if i%2 == 1 {
			setRGBFill(pdf, "247,249,253")
			pdf.Rect(12, y, 255, 7, "F")
		}
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "", 7)
		date := row.Fecha
		if parsed, err := time.Parse(time.RFC3339, row.Fecha); err == nil {
			date = parsed.Format("02/01/2006 15:04")
		}
		cells := []struct {
			x, w        float64
			text, align string
		}{{14, 31, date, "L"}, {49, 23, row.Tipo, "L"}, {76, 27, row.Documento, "L"}, {107, 79, truncateReportText(row.Nota, 54), "L"}, {190, 21, quantity(row.Entrada), "R"}, {215, 21, quantity(row.Salida), "R"}, {240, 25, quantity(row.Existencia), "R"}}
		for _, c := range cells {
			pdf.SetXY(c.x, y)
			pdf.CellFormat(c.w, 7, tr(c.text), "", 0, c.align, false, 0, "")
		}
		y += 7
	}
	drawFooter()
	var output bytes.Buffer
	if err := pdf.Output(&output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}
