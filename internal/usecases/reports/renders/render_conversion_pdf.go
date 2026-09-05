package renders

import (
	"bytes"
	"fmt"
	"strings"

	"BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

func RenderConversionPDF(r models.ConversionReport) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "Letter", "")
	pdf.SetMargins(10, 9, 10)
	pdf.SetAutoPageBreak(false, 0)
	pdf.SetTitle("Reporte de conversión "+r.Folio, true)
	pdf.SetAuthor("Kommerze", true)
	pdf.AddPage()
	drawConversionHeader(pdf, r)
	drawConversionGeneral(pdf, r, 52)
	drawConversionRoute(pdf, r, 82)
	drawConversionValues(pdf, r, 125)
	drawConversionResult(pdf, r, 164)
	drawTransferFooter(pdf)

	var output bytes.Buffer
	if err := pdf.Output(&output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func drawConversionHeader(pdf *gofpdf.Fpdf, r models.ConversionReport) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	if len(kommerzeHorizontalLogo) > 0 {
		opts := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
		pdf.RegisterImageOptionsReader("conversion-logo", opts, bytes.NewReader(kommerzeHorizontalLogo))
		pdf.ImageOptions("conversion-logo", 10, 10, 43, 0, false, opts, 0, "")
	} else {
		drawKommerzeMark(pdf, 10, 10, 10)
	}
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 13)
	pdf.SetXY(59, 9.5)
	pdf.CellFormat(77, 7, tr(strings.ToUpper(optionalText(r.Negocio))), "", 1, "L", false, 0, "")
	pdf.SetTextColor(72, 91, 126)
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(59, 17)
	pdf.CellFormat(77, 4, tr(optionalText(r.RazonSocial)), "", 1, "L", false, 0, "")
	setRGB(pdf, quotationNavy)
	pdf.SetXY(59, 21.5)
	pdf.CellFormat(77, 4, tr("RFC: "+emptyDash(optionalText(r.RFCNegocio))), "", 1, "L", false, 0, "")
	contact := strings.Join(nonEmptyTransferValues(r.Sucursal, r.TelefonoSucursal, r.CorreoSucursal), "  •  ")
	if contact != "" {
		pdf.SetTextColor(72, 91, 126)
		pdf.SetXY(59, 26)
		pdf.CellFormat(77, 4, tr(contact), "", 1, "L", false, 0, "")
	}
	setRGBFill(pdf, quotationBlue)
	pdf.RoundedRect(142, 9, 64, 10, 2, "1234", "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetXY(142, 11)
	pdf.CellFormat(64, 6, tr("REPORTE DE CONVERSIÓN"), "", 1, "C", false, 0, "")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetXY(145, 23)
	pdf.Cell(18, 4, "FOLIO")
	setRGB(pdf, "196,42,48")
	pdf.SetFont("Arial", "B", 12)
	pdf.SetXY(163, 21.5)
	pdf.CellFormat(40, 7, r.Folio, "", 1, "R", false, 0, "")
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.55)
	pdf.Line(10, 42, 206, 42)
	pdf.SetLineWidth(.2)
}

func drawConversionGeneral(pdf *gofpdf.Fpdf, r models.ConversionReport, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y, 196, 21, 2, "1234", "D")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(16, y+4)
	pdf.Cell(55, 5, tr("INFORMACIÓN GENERAL"))
	pdf.SetFont("Arial", "B", 6)
	setRGB(pdf, quotationNavy)
	pdf.SetXY(16, y+11)
	pdf.Cell(45, 4, tr("FECHA DE CONVERSIÓN"))
	pdf.SetXY(80, y+11)
	pdf.Cell(45, 4, "FACTOR APLICADO")
	pdf.SetXY(144, y+11)
	pdf.Cell(45, 4, "ESTATUS")
	pdf.SetFont("Arial", "", 7)
	pdf.SetXY(16, y+15)
	pdf.Cell(45, 4, r.Fecha.Format("02/01/2006 15:04"))
	pdf.SetXY(80, y+15)
	pdf.Cell(45, 4, fmt.Sprintf("x %s", quantity(r.Factor)))
	drawTransferStatusBadge(pdf, 144, y+14.2, r.Estatus, tr)
}

func drawConversionRoute(pdf *gofpdf.Fpdf, r models.ConversionReport, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(10, y)
	pdf.Cell(80, 5, tr("RUTA DE CONVERSIÓN"))
	pdf.SetTextColor(92, 105, 128)
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(10, y+5)
	pdf.Cell(120, 4, tr("Presentación origen y presentación obtenida mediante la equivalencia configurada."))
	setRGBFill(pdf, "247,250,255")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y+11, 196, 27, 3, "1234", "DF")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 6)
	pdf.SetXY(16, y+15)
	pdf.Cell(72, 4, "PRODUCTO ORIGEN")
	pdf.SetXY(128, y+15)
	pdf.CellFormat(72, 4, "PRODUCTO DESTINO", "", 1, "R", false, 0, "")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(16, y+20)
	pdf.CellFormat(72, 5, tr(truncateReportText(r.OrigenProducto, 42)), "", 1, "L", false, 0, "")
	pdf.SetXY(128, y+20)
	pdf.CellFormat(72, 5, tr(truncateReportText(r.DestinoProducto, 42)), "", 1, "R", false, 0, "")
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(16, y+26)
	pdf.CellFormat(72, 4, tr(r.OrigenCodigo+" · "+r.OrigenEmpaque), "", 1, "L", false, 0, "")
	pdf.SetXY(128, y+26)
	pdf.CellFormat(72, 4, tr(r.DestinoCodigo+" · "+r.DestinoEmpaque), "", 1, "R", false, 0, "")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(16, y+31)
	pdf.CellFormat(72, 4, quantity(r.CantidadOrigen), "", 1, "L", false, 0, "")
	pdf.SetXY(128, y+31)
	pdf.CellFormat(72, 4, quantity(r.CantidadDestino), "", 1, "R", false, 0, "")
	drawConversionArrow(pdf, 88, 118, y+25)
}

func drawConversionArrow(pdf *gofpdf.Fpdf, left, right, y float64) {
	setRGBDraw(pdf, "188,211,245")
	pdf.SetLineWidth(.45)
	pdf.Line(left, y, 99, y)
	pdf.Line(107, y, right, y)
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.65)
	pdf.Line(99, y, 107, y)
	pdf.Line(103.5, y-3.5, 107, y)
	pdf.Line(103.5, y+3.5, 107, y)
	pdf.SetLineWidth(.2)
}

func drawConversionValues(pdf *gofpdf.Fpdf, r models.ConversionReport, y float64) {
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(10, y)
	pdf.Cell(90, 5, "VALOR COMERCIAL")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y+8, 95, 27, 2.5, "1234", "D")
	pdf.RoundedRect(111, y+8, 95, 27, 2.5, "1234", "D")
	drawConversionValueCard(pdf, 16, y+13, "PRESENTACIÓN ORIGEN", r.PrecioVentaOrigen, r.CantidadOrigen, r.ValorVentaOrigen)
	drawConversionValueCard(pdf, 117, y+13, "PRESENTACIÓN DESTINO", r.PrecioVentaDestino, r.CantidadDestino, r.ValorVentaDestino)
}

func drawConversionValueCard(pdf *gofpdf.Fpdf, x, y float64, title string, unitPrice, amount, total float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetXY(x, y)
	pdf.Cell(75, 4, tr(title))
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(x, y+6)
	pdf.Cell(38, 4, "Precio de venta")
	pdf.CellFormat(45, 4, money(unitPrice), "", 1, "R", false, 0, "")
	pdf.SetXY(x, y+11)
	pdf.Cell(38, 4, "Cantidad")
	pdf.CellFormat(45, 4, quantity(amount), "", 1, "R", false, 0, "")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(x, y+16)
	pdf.Cell(38, 4, "VALOR")
	pdf.CellFormat(45, 4, money(total), "", 1, "R", false, 0, "")
}

func drawConversionResult(pdf *gofpdf.Fpdf, r models.ConversionReport, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBFill(pdf, "247,250,255")
	setRGBDraw(pdf, "194,218,252")
	pdf.RoundedRect(10, y, 196, 45, 3, "1234", "DF")
	setRGB(pdf, "64,102,225")
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(16, y+5)
	pdf.Cell(85, 5, tr("RESULTADO DE CONVERSIÓN"))
	values := []struct {
		x            float64
		value, label string
		color        string
	}{
		{16, quantity(r.ExistenciaDestinoInicial), "Existencia actual", quotationNavy},
		{80, quantity(r.CantidadDestino), "Conversión", "31,103,232"},
		{144, quantity(r.ExistenciaDestinoFinal), "Existencia final", "5,150,105"},
	}
	for _, value := range values {
		setRGBFill(pdf, "255,255,255")
		pdf.RoundedRect(value.x, y+14, 46, 14, 2, "1234", "F")
		setRGB(pdf, value.color)
		pdf.SetFont("Arial", "B", 13)
		pdf.SetXY(value.x, y+17)
		pdf.CellFormat(46, 7, value.value, "", 1, "C", false, 0, "")
		pdf.SetFont("Arial", "", 6.5)
		pdf.SetXY(value.x, y+30)
		pdf.CellFormat(46, 4, tr(value.label), "", 1, "C", false, 0, "")
	}
	setRGB(pdf, "83,135,235")
	pdf.SetFont("Arial", "B", 13)
	pdf.SetXY(65, y+18)
	pdf.CellFormat(10, 6, "+", "", 0, "C", false, 0, "")
	pdf.SetXY(129, y+18)
	pdf.CellFormat(10, 6, "=", "", 0, "C", false, 0, "")
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetXY(154, y+37)
	pdf.CellFormat(46, 4, fmt.Sprintf("FACTOR x %s", quantity(r.Factor)), "", 1, "R", false, 0, "")
}
