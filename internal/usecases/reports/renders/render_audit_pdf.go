package renders

import (
	"bytes"
	"fmt"
	"time"

	reportmodels "BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

func RenderAuditPDF(report reportmodels.AuditReport) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "Letter", "")
	pdf.SetMargins(12, 10, 12)
	pdf.SetAutoPageBreak(false, 0)
	pdf.SetTitle("Formato de auditoría", true)
	pdf.SetAuthor("Kommerze", true)

	drawHeader := func() {
		pdf.AddPage()
		tr := pdf.UnicodeTranslatorFromDescriptor("")
		if !drawReportHeaderLogo(pdf, fmt.Sprintf("audit-logo-%d", pdf.PageNo()), 12, 10, 43, 17) {
			drawKommerzeMark(pdf, 12, 11, 9)
			setRGB(pdf, quotationNavy)
			pdf.SetFont("Arial", "B", 18)
			pdf.SetXY(24, 12)
			pdf.Cell(40, 8, "KOMMERZE")
		}
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 18)
		pdf.SetXY(66, 11)
		pdf.CellFormat(138, 9, tr("FORMATO DE AUDITORÍA"), "", 1, "R", false, 0, "")
		pdf.SetFont("Arial", "B", 8)
		pdf.SetXY(66, 21)
		pdf.CellFormat(138, 5, tr(report.Empresa), "", 1, "R", false, 0, "")
		pdf.SetFont("Arial", "", 8)
		pdf.SetXY(66, 27)
		pdf.CellFormat(138, 5, tr("Sucursal: "+report.Sucursal), "", 1, "R", false, 0, "")
		printed := report.FechaImpresion
		if parsed, err := time.Parse(time.RFC3339, report.FechaImpresion); err == nil {
			printed = parsed.Format("02/01/2006 15:04")
		}
		pdf.SetXY(66, 32)
		pdf.CellFormat(138, 5, tr("Fecha de impresión: "+printed), "", 1, "R", false, 0, "")
		setRGBDraw(pdf, quotationBlue)
		pdf.SetLineWidth(.7)
		pdf.Line(12, 40, 204, 40)
	}

	drawColumnHeader := func(y float64) {
		tr := pdf.UnicodeTranslatorFromDescriptor("")
		setRGBFill(pdf, quotationNavy)
		pdf.Rect(12, y, 192, 7, "F")
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 6.6)
		columns := []struct {
			x, width float64
			label    string
			align    string
		}{{12, 29, "CÓDIGO", "L"}, {41, 76, "PRODUCTO", "L"}, {117, 34, "EMPAQUE", "L"}, {151, 27, "EXISTENCIA", "R"}, {178, 26, "CONTEO", "C"}}
		for _, column := range columns {
			pdf.SetXY(column.x+1.5, y)
			pdf.CellFormat(column.width-3, 7, tr(column.label), "", 0, column.align, false, 0, "")
		}
	}

	drawHeader()
	y := 46.0
	currentLine := ""
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	rowIndex := 0
	for _, row := range report.Productos {
		lineChanged := row.Linea != currentLine
		required := 7.0
		if lineChanged {
			required = 17
		}
		if y+required > 253 {
			drawAuditFooter(pdf)
			drawHeader()
			y = 46
			currentLine = ""
			lineChanged = true
		}
		if lineChanged {
			setRGBFill(pdf, "235,242,255")
			pdf.RoundedRect(12, y, 192, 8, 1.5, "1234", "F")
			setRGB(pdf, quotationBlue)
			pdf.SetFont("Arial", "B", 9)
			pdf.SetXY(15, y)
			pdf.CellFormat(186, 8, tr(row.Linea), "", 1, "C", false, 0, "")
			y += 9
			drawColumnHeader(y)
			y += 7
			currentLine = row.Linea
			rowIndex = 0
		}

		if rowIndex%2 == 1 {
			setRGBFill(pdf, "247,249,253")
			pdf.Rect(12, y, 192, 7, "F")
		}

		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "", 6.7)
		pdf.SetXY(13.5, y)
		pdf.CellFormat(26, 7, tr(truncateReportText(row.Codigo, 17)), "", 0, "L", false, 0, "")
		pdf.SetXY(42.5, y)
		pdf.CellFormat(73, 7, tr(truncateReportText(row.Producto, 47)), "", 0, "L", false, 0, "")
		pdf.SetXY(118.5, y)
		pdf.CellFormat(31, 7, tr(truncateReportText(row.Empaque, 20)), "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "B", 6.8)
		pdf.SetXY(152.5, y)
		pdf.CellFormat(24, 7, quantity(row.Existencia), "", 0, "R", false, 0, "")
		setRGBDraw(pdf, "190,201,218")
		pdf.Line(181, y+5.8, 201, y+5.8)
		y += 7
		rowIndex++
	}

	if len(report.Productos) == 0 {
		setRGB(pdf, "102,112,133")
		pdf.SetFont("Arial", "", 10)
		pdf.SetXY(12, 75)
		pdf.CellFormat(192, 10, tr("No se encontraron productos con los filtros seleccionados."), "", 1, "C", false, 0, "")
	}
	drawAuditFooter(pdf)

	var output bytes.Buffer
	if err := pdf.Output(&output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func drawAuditFooter(pdf *gofpdf.Fpdf) {
	setRGBDraw(pdf, quotationLine)
	pdf.Line(12, 263, 204, 263)
	setRGB(pdf, "102,112,133")
	pdf.SetFont("Arial", "", 6.2)
	pdf.SetXY(12, 265)
	pdf.Cell(140, 4, "Formato para conteo físico · Kommerze POS")
	pdf.SetXY(180, 265)
	pdf.CellFormat(24, 4, fmt.Sprintf("Página %d", pdf.PageNo()), "", 0, "R", false, 0, "")
}
