package renders

import (
	"bytes"
	"fmt"
	"strings"

	"BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

const quotationBlue = "0,55,160"
const quotationNavy = "7,28,72"
const quotationLine = "210,220,237"
const quotationPale = "246,249,255"

var kommerzeHorizontalLogo []byte

// SetKommerzeHorizontalLogo recibe el logotipo empaquetado desde public/media.
// La copia evita conservar una referencia mutable proporcionada por el caller.
func SetKommerzeHorizontalLogo(data []byte) {
	kommerzeHorizontalLogo = append(kommerzeHorizontalLogo[:0], data...)
}

func RenderQuotationPDF(q models.Quotation) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "Letter", "")
	pdf.SetMargins(10, 10, 10)
	pdf.SetAutoPageBreak(false, 0)
	pdf.SetTitle("Cotización "+q.Folio, true)
	pdf.SetAuthor(q.Negocio, true)
	pdf.AddPage()
	drawQuotationHeader(pdf, q)
	drawClientPanel(pdf, q, 62)
	y := drawQuotationItems(pdf, q, 114)
	if y > 207 {
		pdf.AddPage()
		drawContinuationHeader(pdf, q)
		y = 35
	}
	drawQuotationSummary(pdf, q, y+7)
	drawQuotationFooter(pdf, q)

	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func drawQuotationHeader(pdf *gofpdf.Fpdf, q models.Quotation) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	// Marca / logotipo.
	setRGBDraw(pdf, "174,198,235")
	pdf.RoundedRect(10, 11, 28, 39, 2, "1234", "D")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 25)
	pdf.SetXY(10, 19)
	pdf.CellFormat(28, 12, "K", "", 1, "C", false, 0, "")
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetXY(12, 36)
	pdf.MultiCell(24, 4, tr("IDENTIDAD\nDE SU EMPRESA"), "", "C", false)

	setRGBDraw(pdf, quotationLine)
	pdf.Line(43, 11, 43, 50)
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 16)
	pdf.SetXY(49, 14)
	pdf.CellFormat(91, 8, tr(strings.ToUpper(q.Negocio)), "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(84, 103, 139)
	pdf.SetXY(49, 23)
	pdf.CellFormat(91, 5, tr("Tu solución. Tu negocio."), "", 1, "L", false, 0, "")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7.5)
	drawLocationIcon(pdf, 49, 31.5)
	pdf.SetXY(54, 30.5)
	pdf.CellFormat(39, 5, tr(q.Sucursal), "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 7.2)
	pdf.SetTextColor(35, 52, 83)
	pdf.SetXY(54, 35.5)
	pdf.MultiCell(38, 3.8, tr(q.DireccionSucursal), "", "L", false)
	setRGBDraw(pdf, quotationLine)
	pdf.Line(96.5, 30, 96.5, 49)
	drawPhoneIcon(pdf, 101.5, 31.5)
	pdf.SetXY(106.5, 30.5)
	pdf.CellFormat(34.5, 5, tr(q.TelefonoSucursal), "", 1, "L", false, 0, "")
	drawMailIcon(pdf, 101.5, 38)
	pdf.SetXY(106.5, 36.8)
	pdf.CellFormat(34.5, 5, tr(q.CorreoSucursal), "", 1, "L", false, 0, "")

	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 21)
	pdf.SetXY(146, 12)
	pdf.CellFormat(60, 9, tr("COTIZACIÓN"), "", 1, "L", false, 0, "")
	setRGBFill(pdf, quotationBlue)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(146, 24)
	pdf.CellFormat(23, 7, "FOLIO:", "", 0, "C", true, 0, "")
	setRGBDraw(pdf, quotationBlue)
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(37, 7, q.Folio, "1", 1, "C", false, 0, "")
	detailLine(pdf, 146, 34, "FECHA:", q.Fecha.Format("02 / 01 / 2006"))
	detailLine(pdf, 146, 40, "VIGENCIA:", fmt.Sprintf("%d DÍAS", q.VigenciaDias))
	detailLine(pdf, 146, 46, "ASESOR:", q.Asesor)
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.55)
	pdf.Line(10, 56, 206, 56)
	pdf.SetLineWidth(.2)
}

func detailLine(pdf *gofpdf.Fpdf, x, y float64, label, value string) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetXY(x, y)
	pdf.CellFormat(23, 5, tr(label), "B", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 7.3)
	pdf.CellFormat(37, 5, tr(value), "B", 1, "L", false, 0, "")
}

func drawClientPanel(pdf *gofpdf.Fpdf, q models.Quotation, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBFill(pdf, "251,253,255")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y, 196, 45, 2, "1234", "FD")
	setRGBFill(pdf, quotationBlue)
	pdf.Circle(17, y+8, 4, "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(13, y+4)
	pdf.CellFormat(8, 8, "C", "", 1, "C", false, 0, "")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(24, y+4)
	pdf.CellFormat(80, 8, "DATOS DEL CLIENTE", "", 1, "L", false, 0, "")
	left := [][2]string{{"NOMBRE / RAZÓN SOCIAL", q.Cliente}, {"TELÉFONO", q.TelefonoCliente}, {"CORREO ELECTRÓNICO", q.CorreoCliente}}
	right := [][2]string{{"RFC", q.RFCCliente}, {"RÉGIMEN FISCAL", q.RegimenCliente}, {"MONEDA", "MXN - Peso Mexicano"}}
	for i, row := range left {
		clientField(pdf, 15, y+14+float64(i)*9, 45, 53, row[0], row[1], tr)
	}
	for i, row := range right {
		clientField(pdf, 113, y+14+float64(i)*9, 29, 58, row[0], row[1], tr)
	}
}

func clientField(pdf *gofpdf.Fpdf, x, y, labelW, valueW float64, label, value string, tr func(string) string) {
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 6.8)
	pdf.SetXY(x, y)
	pdf.CellFormat(labelW, 6, tr(label+":"), "B", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 7.2)
	pdf.CellFormat(valueW, 6, tr(value), "B", 1, "L", false, 0, "")
}

func drawQuotationItems(pdf *gofpdf.Fpdf, q models.Quotation, startY float64) float64 {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	cols := []float64{22, 70, 20, 14, 26, 20, 24}
	headers := []string{"CÓDIGO", "DESCRIPCIÓN", "UNIDAD", "CANT.", "PRECIO UNIT.", "DESCUENTO", "IMPORTE"}
	drawTableHeader(pdf, startY, cols, headers, tr)
	y := startY + 7
	for i, item := range q.Items {
		if y+7 > 244 {
			pdf.AddPage()
			drawContinuationHeader(pdf, q)
			y = 34
			drawTableHeader(pdf, y, cols, headers, tr)
			y += 7
		}
		fill := i%2 == 1
		if fill {
			setRGBFill(pdf, "249,251,255")
		}
		if i == len(q.Items)-1 {
			if fill {
				pdf.RoundedRect(10, y, 196, 7, 2, "34", "F")
			}
		} else if fill {
			pdf.Rect(10, y, 196, 7, "F")
		}
		values := []string{item.Codigo, item.Descripcion, item.Unidad, quantity(item.Cantidad), money(item.Precio), money(item.Descuento), money(item.Importe)}
		align := []string{"C", "L", "C", "C", "R", "R", "R"}
		pdf.SetTextColor(19, 42, 83)
		pdf.SetFont("Arial", "", 7)
		for j, v := range values {
			pdf.SetXY(10+sumWidths(cols[:j]), y)
			pdf.CellFormat(cols[j], 7, tr(v), "", 0, align[j], false, 0, "")
			if j > 0 {
				pdf.Line(10+sumWidths(cols[:j]), y, 10+sumWidths(cols[:j]), y+7)
			}
		}
		setRGBDraw(pdf, quotationLine)
		pdf.Line(10, y+7, 206, y+7)
		y += 7
	}
	if len(q.Items) > 0 {
		setRGBDraw(pdf, quotationLine)
		pdf.RoundedRect(10, startY, 196, y-startY, 2, "1234", "D")
	}
	return y
}

func drawTableHeader(pdf *gofpdf.Fpdf, y float64, cols []float64, headers []string, tr func(string) string) {
	setRGBFill(pdf, quotationBlue)
	pdf.RoundedRect(10, y, 196, 7, 2, "12", "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 6.7)
	pdf.SetXY(10, y)
	for i, h := range headers {
		pdf.CellFormat(cols[i], 7, tr(h), "", 0, "C", false, 0, "")
	}
}

func drawQuotationSummary(pdf *gofpdf.Fpdf, q models.Quotation, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	if y+73 > 264 {
		pdf.AddPage()
		drawContinuationHeader(pdf, q)
		y = 35
	}
	setRGBFill(pdf, quotationPale)
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y, 103, 32, 2, "1234", "FD")
	drawInfoIcon(pdf, 16, y+5.5)
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(22, y+5)
	pdf.CellFormat(85, 6, "OBSERVACIONES", "", 1, "L", false, 0, "")
	pdf.SetTextColor(40, 58, 91)
	pdf.SetFont("Arial", "", 7.2)
	pdf.SetXY(16, y+12)
	obs := strings.TrimSpace(q.Observaciones)
	if obs == "" {
		obs = "Precios sujetos a disponibilidad y a las condiciones indicadas en esta cotización."
	}
	pdf.MultiCell(91, 4, tr(obs), "", "L", false)

	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(117, y, 89, 32, 2, "1234", "D")
	totals := [][2]string{{"SUBTOTAL", money(q.Subtotal)}, {"DESCUENTO", money(q.Descuento)}, {"IMPUESTOS", money(q.Impuestos)}}
	pdf.SetFont("Arial", "B", 7.2)
	pdf.SetTextColor(24, 48, 91)
	for i, row := range totals {
		yy := y + float64(i)*6
		pdf.SetXY(123, yy)
		pdf.CellFormat(38, 6, row[0], "B", 0, "L", false, 0, "")
		pdf.CellFormat(39, 6, row[1], "B", 1, "R", false, 0, "")
	}
	setRGBFill(pdf, quotationBlue)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 10)
	pdf.RoundedRect(117, y+18, 89, 14, 2, "34", "F")
	pdf.SetXY(123, y+18)
	pdf.CellFormat(38, 14, "TOTAL", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(39, 14, money(q.Total)+" MXN", "", 1, "R", false, 0, "")

	cy := y + 38
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, cy, 196, 28, 2, "1234", "D")
	pdf.Line(108, cy, 108, cy+28)
	drawClipboardIcon(pdf, 16, cy+4.7)
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetXY(22, cy+4)
	pdf.CellFormat(80, 5, "CONDICIONES COMERCIALES", "", 1, "L", false, 0, "")
	pdf.SetTextColor(45, 62, 94)
	pdf.SetFont("Arial", "", 7)
	conditionLines := []string{fmt.Sprintf("Vigencia de la cotización: %d días", q.VigenciaDias), "Precios expresados en moneda nacional (MXN)", "Entrega y disponibilidad sujetas a confirmación"}
	for i, line := range conditionLines {
		pdf.SetXY(16, cy+10+float64(i)*5)
		pdf.CellFormat(86, 4, tr("- "+line), "", 1, "L", false, 0, "")
	}
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7.5)
	drawPaymentIcon(pdf, 114, cy+4.7, 0)
	pdf.SetXY(120, cy+4)
	pdf.CellFormat(80, 5, "FORMA DE PAGO", "", 1, "L", false, 0, "")
	pdf.SetTextColor(45, 62, 94)
	pdf.SetFont("Arial", "", 7)
	paymentMethods := []string{"Efectivo", "Tarjeta de crédito / débito", "Transferencia bancaria", "Link de pago"}
	for i, line := range paymentMethods {
		yy := cy + 10 + float64(i)*4.2
		drawPaymentIcon(pdf, 115, yy+.4, i)
		pdf.SetXY(121, yy)
		pdf.CellFormat(79, 3.8, tr(line), "", 1, "L", false, 0, "")
	}
}

func drawInfoIcon(pdf *gofpdf.Fpdf, x, y float64) {
	setRGBFill(pdf, quotationBlue)
	pdf.Circle(x+2, y+2, 2, "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetXY(x, y-.1)
	pdf.CellFormat(4, 4, "i", "", 1, "C", false, 0, "")
}

func drawClipboardIcon(pdf *gofpdf.Fpdf, x, y float64) {
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.3)
	pdf.RoundedRect(x, y, 4, 4.3, .45, "1234", "D")
	pdf.RoundedRect(x+1.05, y-.65, 1.9, 1.15, .3, "1234", "D")
	pdf.Line(x+.8, y+1.8, x+3.2, y+1.8)
	pdf.Line(x+.8, y+2.8, x+3.2, y+2.8)
	pdf.SetLineWidth(.2)
}

func drawPaymentIcon(pdf *gofpdf.Fpdf, x, y float64, kind int) {
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.3)
	switch kind {
	case 0: // efectivo
		pdf.RoundedRect(x, y, 4.2, 2.7, .4, "1234", "D")
		pdf.Circle(x+2.1, y+1.35, .65, "D")
	case 1: // tarjeta
		pdf.RoundedRect(x, y, 4.2, 2.8, .4, "1234", "D")
		pdf.Line(x, y+.8, x+4.2, y+.8)
		pdf.Line(x+.6, y+2.1, x+1.8, y+2.1)
	case 2: // transferencia bancaria
		pdf.Polygon([]gofpdf.PointType{{X: x, Y: y + 1}, {X: x + 2.1, Y: y}, {X: x + 4.2, Y: y + 1}}, "D")
		for i := 0; i < 3; i++ {
			xx := x + .6 + float64(i)*1.4
			pdf.Line(xx, y+1, xx, y+2.7)
		}
		pdf.Line(x, y+2.8, x+4.2, y+2.8)
	default: // enlace de pago
		pdf.Circle(x+1.25, y+1.4, 1, "D")
		pdf.Circle(x+3, y+1.4, 1, "D")
		pdf.Line(x+1.7, y+1.4, x+2.55, y+1.4)
	}
	pdf.SetLineWidth(.2)
}

func drawQuotationFooter(pdf *gofpdf.Fpdf, q models.Quotation) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.45)
	pdf.Line(10, 260, 206, 260)
	pdf.SetLineWidth(.2)
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(10, 262)
	pdf.CellFormat(100, 5, tr("¡Gracias por considerarnos!"), "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetTextColor(86, 103, 132)
	pdf.SetXY(10, 267)
	pdf.CellFormat(100, 3, "Estamos para ayudarte a hacer crecer tu negocio.", "", 1, "L", false, 0, "")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetXY(153, 264.7)
	pdf.CellFormat(20, 5, "Powered by", "", 0, "R", false, 0, "")
	pdf.SetFont("Arial", "", 11)
	pdf.SetXY(174, 264.7)
	pdf.CellFormat(3, 5, "|", "", 0, "C", false, 0, "")
	if len(kommerzeHorizontalLogo) > 0 {
		options := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
		pdf.RegisterImageOptionsReader("kommerze-horizontal-logo", options, bytes.NewReader(kommerzeHorizontalLogo))
		pdf.ImageOptions("kommerze-horizontal-logo", 178, 262, 28, 0, false, options, 0, "")
	} else {
		drawKommerzeMark(pdf, 178, 262, 7)
		setRGB(pdf, quotationBlue)
		pdf.SetFont("Arial", "B", 12)
		pdf.SetXY(186, 263)
		pdf.CellFormat(20, 5, "KOMMERZE", "", 1, "R", false, 0, "")
	}
}

func drawLocationIcon(pdf *gofpdf.Fpdf, x, y float64) {
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.35)
	pdf.Circle(x+1.5, y+1.5, 1.25, "D")
	pdf.Circle(x+1.5, y+1.3, .4, "D")
	pdf.Line(x+.7, y+2.4, x+1.5, y+3.5)
	pdf.Line(x+2.3, y+2.4, x+1.5, y+3.5)
	pdf.SetLineWidth(.2)
}

func drawPhoneIcon(pdf *gofpdf.Fpdf, x, y float64) {
	setRGBFill(pdf, quotationBlue)
	pdf.Polygon([]gofpdf.PointType{
		{X: x + .2, Y: y}, {X: x + .85, Y: y}, {X: x + 1.15, Y: y + .7},
		{X: x + .75, Y: y + 1.05}, {X: x + 1.15, Y: y + 1.7},
		{X: x + 1.85, Y: y + 2.1}, {X: x + 2.2, Y: y + 1.7},
		{X: x + 2.9, Y: y + 2}, {X: x + 2.9, Y: y + 2.65},
		{X: x + 2.45, Y: y + 2.95}, {X: x + 1.35, Y: y + 2.55},
		{X: x + .45, Y: y + 1.7}, {X: x, Y: y + .55},
	}, "F")
}

func drawMailIcon(pdf *gofpdf.Fpdf, x, y float64) {
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.3)
	pdf.RoundedRect(x, y, 3.4, 2.5, .35, "1234", "D")
	pdf.Line(x, y+.3, x+1.7, y+1.5)
	pdf.Line(x+3.4, y+.3, x+1.7, y+1.5)
	pdf.SetLineWidth(.2)
}

func drawKommerzeMark(pdf *gofpdf.Fpdf, x, y, size float64) {
	setRGBFill(pdf, quotationBlue)
	pdf.Polygon([]gofpdf.PointType{{X: x, Y: y + size*.38}, {X: x + size*.31, Y: y + size*.38}, {X: x + size*.72, Y: y}, {X: x + size, Y: y}, {X: x + size*.55, Y: y + size*.5}, {X: x + size, Y: y + size}, {X: x + size*.7, Y: y + size}, {X: x + size*.31, Y: y + size*.61}, {X: x, Y: y + size}}, "F")
	setRGBDraw(pdf, quotationNavy)
	pdf.SetLineWidth(.7)
	pdf.Arc(x+size*.3, y+size*.32, size*.22, size*.26, 0, 180, 360, "D")
	pdf.SetLineWidth(.2)
}

func drawContinuationHeader(pdf *gofpdf.Fpdf, q models.Quotation) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 13)
	pdf.SetXY(10, 10)
	pdf.CellFormat(110, 8, tr(strings.ToUpper(q.Negocio)), "", 0, "L", false, 0, "")
	setRGB(pdf, quotationBlue)
	pdf.CellFormat(86, 8, tr("COTIZACIÓN "+q.Folio), "", 1, "R", false, 0, "")
	setRGBDraw(pdf, quotationBlue)
	pdf.Line(10, 22, 206, 22)
}

func compactJoin(values ...string) string {
	clean := []string{}
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			clean = append(clean, strings.TrimSpace(v))
		}
	}
	return strings.Join(clean, "  |  ")
}
func sumWidths(values []float64) float64 {
	total := 0.0
	for _, v := range values {
		total += v
	}
	return total
}
func quantity(v float64) string {
	if v == float64(int64(v)) {
		return fmt.Sprintf("%d", int64(v))
	}
	return fmt.Sprintf("%.2f", v)
}
func money(v float64) string {
	sign := ""
	if v < 0 {
		sign = "-"
		v = -v
	}
	parts := strings.Split(fmt.Sprintf("%.2f", v), ".")
	whole := parts[0]
	for i := len(whole) - 3; i > 0; i -= 3 {
		whole = whole[:i] + "," + whole[i:]
	}
	return sign + "$" + whole + "." + parts[1]
}
func setRGB(pdf *gofpdf.Fpdf, rgb string) {
	var r, g, b int
	fmt.Sscanf(rgb, "%d,%d,%d", &r, &g, &b)
	pdf.SetTextColor(r, g, b)
}
func setRGBFill(pdf *gofpdf.Fpdf, rgb string) {
	var r, g, b int
	fmt.Sscanf(rgb, "%d,%d,%d", &r, &g, &b)
	pdf.SetFillColor(r, g, b)
}
func setRGBDraw(pdf *gofpdf.Fpdf, rgb string) {
	var r, g, b int
	fmt.Sscanf(rgb, "%d,%d,%d", &r, &g, &b)
	pdf.SetDrawColor(r, g, b)
}
