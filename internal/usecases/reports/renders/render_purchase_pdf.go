package renders

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

const purchasePageWidth = 279.4

func RenderPurchasePDF(r models.PurchaseReport) ([]byte, error) {
	pdf := gofpdf.New("L", "mm", "Letter", "")
	pdf.SetMargins(10, 8, 10)
	pdf.SetAutoPageBreak(false, 0)
	pdf.SetTitle("Reporte de compra "+r.Folio, true)
	pdf.SetAuthor("Kommerze", true)
	pdf.AddPage()
	drawPurchaseHeader(pdf, r)
	drawPurchaseProvider(pdf, r, 40)
	y := drawPurchaseItems(pdf, r, 86)
	if y > 157 {
		pdf.AddPage()
		drawPurchaseContinuationHeader(pdf, r)
		y = 36
	}
	drawPurchaseTotals(pdf, r, y+7)
	drawPurchaseFooter(pdf)
	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func drawPurchaseHeader(pdf *gofpdf.Fpdf, r models.PurchaseReport) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	if len(kommerzeHorizontalLogo) > 0 {
		opts := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
		pdf.RegisterImageOptionsReader("purchase-kommerze-logo", opts, bytes.NewReader(kommerzeHorizontalLogo))
		pdf.ImageOptions("purchase-kommerze-logo", 10, 9, 47, 0, false, opts, 0, "")
	} else {
		drawKommerzeMark(pdf, 10, 10, 10)
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 20)
		pdf.SetXY(23, 12)
		pdf.Cell(42, 9, "KOMMERZE")
	}
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 19)
	pdf.SetXY(87, 10)
	pdf.CellFormat(105, 10, tr("REPORTE DE COMPRA"), "", 1, "C", false, 0, "")
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.6)
	pdf.Line(127, 25, 152, 25)
	pdf.SetLineWidth(.2)
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(234, 8, 35, 23, 2, "1234", "D")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetXY(238, 11)
	pdf.Cell(26, 4, "FOLIO")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 13)
	pdf.SetXY(238, 17)
	pdf.CellFormat(27, 8, r.Folio, "", 1, "L", false, 0, "")
}

func drawPurchaseProvider(pdf *gofpdf.Fpdf, r models.PurchaseReport, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y, 259, 38, 2, "1234", "D")
	setRGBFill(pdf, quotationBlue)
	pdf.Circle(18, y+8, 4, "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(14, y+4)
	pdf.CellFormat(8, 8, "P", "", 1, "C", false, 0, "")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(26, y+4)
	pdf.Cell(90, 5, "DATOS DEL PROVEEDOR")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(26, y+10)
	pdf.CellFormat(86, 6, tr(r.Proveedor), "", 1, "L", false, 0, "")
	providerRows := [][2]string{{"RFC", r.RFCProveedor}, {"RÉGIMEN FISCAL", r.RegimenProveedor}, {"TELÉFONO", r.TelefonoProveedor}, {"CORREO", r.CorreoProveedor}, {"CÓDIGO POSTAL", r.CodigoPostalProveedor}}
	for i, row := range providerRows {
		yy := y + 17 + float64(i)*3.8
		pdf.SetFont("Arial", "B", 6.2)
		pdf.SetXY(16, yy)
		pdf.CellFormat(31, 3.5, tr(row[0]+":"), "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 6.4)
		pdf.CellFormat(66, 3.5, tr(row[1]), "", 1, "L", false, 0, "")
	}
	setRGBDraw(pdf, quotationLine)
	pdf.Line(119, y+5, 119, y+33)
	setRGBFill(pdf, quotationBlue)
	pdf.Circle(127, y+8, 4, "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(123, y+4)
	pdf.CellFormat(8, 8, "D", "", 1, "C", false, 0, "")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(135, y+4)
	pdf.Cell(90, 5, "DATOS DEL DOCUMENTO")
	docDate := "No especificada"
	if r.FechaDocumento != nil {
		docDate = r.FechaDocumento.Format("02/01/2006")
	}
	details := [][2]string{{"FECHA DE COMPRA", r.FechaCompra.Format("02/01/2006 15:04:05")}, {"FECHA DEL DOCUMENTO", docDate}, {"FOLIO DE FACTURA", r.FolioFactura}, {"UUID", r.UUIDFiscal}}
	for i, row := range details {
		yy := y + 13 + float64(i)*5.2
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 6.2)
		pdf.SetXY(125, yy)
		pdf.CellFormat(39, 4, tr(row[0]+":"), "", 0, "L", false, 0, "")
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "", 6.4)
		pdf.CellFormat(96, 4, tr(emptyDash(row[1])), "", 1, "L", false, 0, "")
	}
}

func drawPurchaseItems(pdf *gofpdf.Fpdf, r models.PurchaseReport, startY float64) float64 {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	cols := []float64{7, 19, 53, 16, 14, 28, 22, 28, 30, 42}
	headers := []string{"#", "CÓDIGO", "DESCRIPCIÓN", "UNIDAD", "CANT.", "PRECIO COMPRA", "IMPUESTOS", "IMPORTE COMPRA", "PRECIO VENTA", "IMPORTE VENTA"}
	drawPurchaseTableHeader(pdf, startY, cols, headers, tr)
	y := startY + 8
	for i, item := range r.Items {
		if y+6 > 190 {
			pdf.AddPage()
			drawPurchaseContinuationHeader(pdf, r)
			y = 34
			drawPurchaseTableHeader(pdf, y, cols, headers, tr)
			y += 8
		}
		if i%2 == 1 {
			setRGBFill(pdf, "248,251,255")
			pdf.Rect(10, y, 259, 6, "F")
		}
		values := []string{fmt.Sprint(i + 1), item.Codigo, item.Descripcion, item.Unidad, quantity(item.Cantidad), money(item.PrecioCompra), money(item.Impuestos), money(item.ImporteCompra), money(item.PrecioVenta), money(item.ImporteVenta)}
		align := []string{"C", "C", "L", "C", "C", "R", "R", "R", "R", "R"}
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "", 6.2)
		for j, v := range values {
			if j == 2 {
				v = truncateReportText(v, 40)
			}
			pdf.SetXY(10+sumWidths(cols[:j]), y)
			pdf.CellFormat(cols[j], 6, tr(v), "", 0, align[j], false, 0, "")
			if j > 0 {
				setRGBDraw(pdf, quotationLine)
				pdf.Line(10+sumWidths(cols[:j]), y, 10+sumWidths(cols[:j]), y+6)
			}
		}
		setRGBDraw(pdf, quotationLine)
		pdf.Line(10, y+6, 269, y+6)
		y += 6
	}
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, startY, 259, y-startY, 2, "1234", "D")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "", 5.8)
	pdf.SetXY(11, y+1)
	pdf.Cell(100, 4, "* Importes de venta calculados con el precio actual del sistema.")
	return y + 4
}

func drawPurchaseTableHeader(pdf *gofpdf.Fpdf, y float64, cols []float64, headers []string, tr func(string) string) {
	setRGBFill(pdf, quotationNavy)
	pdf.RoundedRect(10, y, 259, 8, 2, "12", "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 5.8)
	for i, h := range headers {
		pdf.SetXY(10+sumWidths(cols[:i]), y)
		pdf.MultiCell(cols[i], 4, tr(h), "", "C", false)
	}
}

func drawPurchaseTotals(pdf *gofpdf.Fpdf, r models.PurchaseReport, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	if y+40 > 203 {
		pdf.AddPage()
		drawPurchaseContinuationHeader(pdf, r)
		y = 38
	}
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y, 82, 34, 2, "1234", "D")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(17, y+5)
	pdf.Cell(60, 5, "NOTAS")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "", 6.6)
	pdf.SetXY(17, y+12)
	pdf.MultiCell(68, 4, tr(r.Notas), "", "L", false)
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(97, y, 82, 34, 2, "1234", "D")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetXY(104, y+5)
	pdf.Cell(68, 5, "TOTALES A PRECIO DE COMPRA")
	purchaseRows := [][2]string{{"SUBTOTAL", money(r.SubtotalCompra)}, {"DESCUENTO", money(r.DescuentoCompra)}, {"IMPUESTOS", money(r.ImpuestosCompra)}}
	for i, row := range purchaseRows {
		yy := y + 11 + float64(i)*5
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "", 6.5)
		pdf.SetXY(104, yy)
		pdf.CellFormat(35, 4, row[0], "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "B", 6.8)
		pdf.CellFormat(32, 4, row[1], "", 1, "R", false, 0, "")
	}
	setRGBFill(pdf, "235,242,255")
	pdf.RoundedRect(102, y+26, 72, 6, 1, "1234", "F")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetXY(105, y+27)
	pdf.CellFormat(32, 4, "TOTAL COMPRA", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(36, 4, money(r.TotalCompra), "", 1, "R", false, 0, "")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(184, y, 85, 34, 2, "1234", "D")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetXY(191, y+5)
	pdf.Cell(72, 5, "TOTAL A PRECIO DE VENTA*")
	pdf.SetFont("Arial", "", 6.2)
	setRGB(pdf, quotationNavy)
	pdf.SetXY(191, y+13)
	pdf.MultiCell(69, 4, "Valor neto estimado con los precios de venta actuales.", "", "L", false)
	setRGBFill(pdf, "235,242,255")
	pdf.RoundedRect(189, y+24, 75, 8, 1, "1234", "F")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetXY(192, y+26)
	pdf.CellFormat(31, 4, "TOTAL VENTA", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(38, 4, money(r.TotalVenta), "", 1, "R", false, 0, "")
}

func drawPurchaseContinuationHeader(pdf *gofpdf.Fpdf, r models.PurchaseReport) {
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 15)
	pdf.SetXY(10, 10)
	pdf.Cell(130, 8, "REPORTE DE COMPRA - CONTINUACIÓN")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(220, 11)
	pdf.CellFormat(49, 7, r.Folio, "", 1, "R", false, 0, "")
	setRGBDraw(pdf, quotationBlue)
	pdf.Line(10, 25, 269, 25)
}

func drawPurchaseFooter(pdf *gofpdf.Fpdf) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBDraw(pdf, quotationLine)
	pdf.Line(10, 207, 269, 207)
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "", 6.2)
	pdf.SetXY(10, 209)
	pdf.Cell(70, 4, "Powered by")
	pdf.SetXY(207, 209)
	pdf.CellFormat(62, 4, tr("Fecha de impresión: "+time.Now().Format("02/01/2006 15:04")), "", 1, "R", false, 0, "")
	if len(kommerzeHorizontalLogo) > 0 {
		opts := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
		pdf.RegisterImageOptionsReader("purchase-footer-logo", opts, bytes.NewReader(kommerzeHorizontalLogo))
		pdf.ImageOptions("purchase-footer-logo", 26, 208, 22, 0, false, opts, 0, "")
	}
}

func emptyDash(v string) string {
	if strings.TrimSpace(v) == "" {
		return "-"
	}
	return v
}
func truncateReportText(v string, n int) string {
	r := []rune(v)
	if len(r) <= n {
		return v
	}
	return string(r[:n-1]) + "..."
}
