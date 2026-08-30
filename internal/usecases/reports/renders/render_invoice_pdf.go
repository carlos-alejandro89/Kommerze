package renders

import (
	"bytes"
	"fmt"
	"net/url"
	"strings"

	reportmodels "BitComercio/internal/usecases/reports/models"
	"github.com/boombuler/barcode/qr"
	"github.com/jung-kurt/gofpdf"
	"github.com/jung-kurt/gofpdf/contrib/barcode"
)

func RenderInvoicePDF(r reportmodels.Invoice) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "Letter", "")
	pdf.SetMargins(7, 8, 7)
	pdf.SetAutoPageBreak(false, 0)
	pdf.SetTitle("CFDI "+r.UUID, true)
	pdf.SetAuthor(r.Emisor, true)
	pdf.AddPage()
	drawInvoiceHeader(pdf, r)
	drawInvoiceReceiver(pdf, r, 60)
	firstEnd := len(r.Items)
	if firstEnd > 6 {
		firstEnd = 6
	}
	y := drawInvoiceItems(pdf, r.Items[:firstEnd], 108)
	if firstEnd == len(r.Items) {
		bottom := drawInvoiceTotals(pdf, r, y+6)
		drawInvoiceFiscalSection(pdf, r, bottom+7)
	} else {
		remaining := r.Items[firstEnd:]
		for len(remaining) > 0 {
			pdf.AddPage()
			drawInvoiceContinuation(pdf, r)
			take := len(remaining)
			if take > 13 {
				take = 13
			}
			y = drawInvoiceItems(pdf, remaining[:take], 32)
			remaining = remaining[take:]
			if len(remaining) == 0 {
				bottom := drawInvoiceTotals(pdf, r, y+6)
				drawInvoiceFiscalSection(pdf, r, bottom+7)
			}
		}
	}
	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func drawInvoiceHeader(pdf *gofpdf.Fpdf, r reportmodels.Invoice) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	if len(kommerzeHorizontalLogo) > 0 {
		name := "invoice-kommerze-logo"
		pdf.RegisterImageOptionsReader(name, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, bytes.NewReader(kommerzeHorizontalLogo))
		pdf.ImageOptions(name, 8, 10, 48, 0, false, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, 0, "")
	}
	setRGB(pdf, quotationNavy)
	commercialName := strings.TrimSpace(r.NombreComercial)
	if commercialName == "" {
		commercialName = r.Emisor
	}
	pdf.SetFont("Arial", "B", 13)
	pdf.SetXY(58, 11)
	pdf.CellFormat(62, 7, tr(strings.ToUpper(commercialName)), "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetTextColor(65, 82, 115)
	pdf.SetXY(58, 19)
	pdf.CellFormat(62, 4, tr(r.Emisor), "", 1, "L", false, 0, "")
	pdf.SetXY(58, 23)
	pdf.CellFormat(62, 4, tr("RFC: "+r.RFCEmisor), "", 1, "L", false, 0, "")
	pdf.SetXY(58, 27)
	pdf.MultiCell(62, 3.4, tr(r.RegimenEmisor), "", "L", false)
	pdf.SetFont("Arial", "B", 6)
	pdf.SetXY(58, 34)
	pdf.CellFormat(62, 3, "SUCURSAL", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(58, 38)
	pdf.MultiCell(62, 3.4, tr(r.Sucursal+" - "+r.Direccion), "", "L", false)
	phone := strings.TrimSpace(r.Telefono)
	email := strings.TrimSpace(r.Correo)
	pdf.SetXY(58, 50)
	pdf.SetFont("Arial", "", 6.5)
	phoneWidth := pdf.GetStringWidth(tr(phone))
	pdf.CellFormat(phoneWidth, 3, tr(phone), "", 0, "L", false, 0, "")
	dotWidth := 5.0
	setRGBFill(pdf, "65,82,115")
	pdf.Circle(58+phoneWidth+2.2, 51.35, .7, "F")
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(58+phoneWidth+dotWidth, 50)
	pdf.CellFormat(62-phoneWidth-dotWidth, 3, tr(email), "", 1, "L", false, 0, "")
	setRGBFill(pdf, quotationBlue)
	pdf.RoundedRect(126, 9, 82, 8, 2, "1234", "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(126, 10)
	pdf.CellFormat(82, 6, "COMPROBANTE FISCAL DIGITAL POR INTERNET", "", 1, "C", false, 0, "")
	details := [][2]string{{"Tipo de comprobante", "I - Ingreso"}, {"Serie / Folio", r.Serie + " / " + r.Folio}, {"Folio fiscal (UUID)", r.UUID}, {"No. certificado CSD", r.CertificadoEmisor}, {"Lugar de expedicion", r.LugarExpedicion}, {"Fecha de emision", r.FechaEmision.Format("02/01/2006 15:04:05")}, {"Fecha de certificacion", r.FechaTimbrado.Format("02/01/2006 15:04:05")}}
	y := 19.0
	for _, d := range details {
		setRGBDraw(pdf, quotationLine)
		pdf.SetFont("Arial", "B", 5.8)
		setRGB(pdf, quotationNavy)
		pdf.SetXY(128, y)
		pdf.CellFormat(30, 4, tr(d[0]), "B", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 5.8)
		pdf.CellFormat(48, 4, tr(d[1]), "B", 1, "L", false, 0, "")
		y += 5
	}
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.55)
	pdf.Line(8, 55, 208, 55)
	pdf.SetLineWidth(.2)
}

func drawInvoiceReceiver(pdf *gofpdf.Fpdf, r reportmodels.Invoice, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBFill(pdf, "255,255,255")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(8, y, 200, 41, 2, "1234", "FD")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(14, y+5)
	pdf.CellFormat(90, 5, tr("DATOS DEL RECEPTOR"), "", 1, "L", false, 0, "")
	fields := [][2]string{{"RFC", r.RFCReceptor}, {"Regimen fiscal", r.RegimenReceptor}, {"Domicilio fiscal", r.DomicilioReceptor}, {"Uso del CFDI", r.UsoCFDI}}
	fy := y + 12
	pdf.SetFont("Arial", "B", 6.2)
	setRGB(pdf, quotationNavy)
	pdf.SetXY(14, fy)
	pdf.CellFormat(34, 4, tr("Nombre / Razon social"), "", 0, "L", false, 0, "")
	receptorFontSize := 6.2
	var receptorLines [][]byte
	for {
		pdf.SetFont("Arial", "", receptorFontSize)
		receptorLines = pdf.SplitLines([]byte(tr(r.Receptor)), 55)
		if len(receptorLines) <= 2 || receptorFontSize <= 5.2 {
			break
		}
		receptorFontSize -= .2
	}
	pdf.SetXY(48, fy)
	pdf.MultiCell(55, 3.4, tr(r.Receptor), "", "L", false)
	if len(receptorLines) > 1 {
		fy += 7.5
	} else {
		fy += 5
	}
	for _, f := range fields {
		pdf.SetFont("Arial", "B", 6.2)
		setRGB(pdf, quotationNavy)
		pdf.SetXY(14, fy)
		pdf.CellFormat(34, 4, tr(f[0]), "", 0, "L", false, 0, "")
		if f[0] == "Regimen fiscal" {
			regimenFontSize := 6.2
			var regimenLines [][]byte
			for {
				pdf.SetFont("Arial", "", regimenFontSize)
				regimenLines = pdf.SplitLines([]byte(tr(f[1])), 55)
				if len(regimenLines) <= 2 || regimenFontSize <= 5.2 {
					break
				}
				regimenFontSize -= .2
			}
			pdf.SetXY(48, fy)
			pdf.MultiCell(55, 3.4, tr(f[1]), "", "L", false)
			if len(regimenLines) > 1 {
				fy += 7.5
			} else {
				fy += 5
			}
			continue
		}
		pdf.SetFont("Arial", "", 6.2)
		pdf.CellFormat(55, 4, tr(f[1]), "", 1, "L", false, 0, "")
		fy += 5
	}
	setRGBFill(pdf, "243,247,254")
	pdf.RoundedRect(109, y+5, 93, 31, 2, "1234", "F")
	commercial := [][2]string{{"Moneda", "MXN - Peso Mexicano"}, {"Metodo de pago", r.MetodoPago}, {"Forma de pago", r.FormaPago}, {"Condiciones", "Contado"}}
	fy = y + 9
	for _, f := range commercial {
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 6.2)
		pdf.SetXY(116, fy)
		pdf.CellFormat(29, 4, tr(f[0]), "", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 6.2)
		pdf.CellFormat(52, 4, tr(f[1]), "", 1, "L", false, 0, "")
		fy += 6
	}
}

func drawInvoiceItems(pdf *gofpdf.Fpdf, items []reportmodels.InvoiceItem, start float64) float64 {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	const rowHeight = 8.2
	cols := []float64{25, 52, 22, 14, 24, 18, 24, 23}
	headers := []string{"CLAVE", "DESCRIPCION", "UNIDAD", "CANT.", "PRECIO UNIT.", "DESCUENTO", "IMPUESTOS", "IMPORTE"}
	x := 7.0
	setRGBFill(pdf, quotationBlue)
	setRGBDraw(pdf, quotationLine)
	tableWidth := 0.0
	for _, width := range cols {
		tableWidth += width
	}
	pdf.RoundedRect(x, start, tableWidth, 8+float64(len(items))*rowHeight, 3.5, "1234", "D")
	pdf.RoundedRect(x, start, tableWidth, 8, 3.5, "12", "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 5.7)
	for i, h := range headers {
		pdf.SetXY(x, start)
		pdf.CellFormat(cols[i], 8, tr(h), "", 0, "C", false, 0, "")
		x += cols[i]
	}
	y := start + 8
	for i := 1; i < len(cols); i++ {
		lineX := 7.0
		for c := 0; c < i; c++ {
			lineX += cols[c]
		}
		pdf.Line(lineX, start, lineX, start+8+float64(len(items))*rowHeight)
	}
	for _, it := range items {
		x = 7
		setRGBDraw(pdf, quotationLine)
		pdf.Line(x, y, x+tableWidth, y)
		x = 7
		pdf.SetTextColor(15, 35, 75)
		pdf.SetFont("Arial", "B", 6)
		pdf.SetXY(x, y+.7)
		pdf.CellFormat(cols[0], 3.2, tr(it.Codigo), "", 0, "C", false, 0, "")
		pdf.SetFont("Arial", "", 5.2)
		pdf.SetXY(x, y+4.1)
		pdf.CellFormat(cols[0], 3, tr("SAT: "+it.ClaveSAT), "", 0, "C", false, 0, "")
		x += cols[0]
		pdf.SetFont("Arial", "", 6)
		pdf.SetXY(x+1, y+1.1)
		pdf.MultiCell(cols[1]-2, 3, tr(it.Descripcion), "", "L", false)
		x += cols[1]
		values := []string{it.Unidad, fmt.Sprintf("%.2f", it.Cantidad), formatInvoiceMoney(it.PrecioUnitario), formatInvoiceMoney(it.Descuento), "IVA " + formatInvoiceMoney(it.Impuestos), formatInvoiceMoney(it.Importe)}
		for i, v := range values {
			align := "C"
			if i >= 2 {
				align = "R"
			}
			pdf.SetXY(x, y)
			pdf.CellFormat(cols[i+2], rowHeight, tr(v), "", 0, align, false, 0, "")
			x += cols[i+2]
		}
		y += rowHeight
	}
	return y
}

func drawInvoiceTotals(pdf *gofpdf.Fpdf, r reportmodels.Invoice, y float64) float64 {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	if y > 230 {
		y = 230
	}
	amountX, amountWidth := 7.0, 107.0
	setRGBFill(pdf, "248,251,255")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(amountX, y, amountWidth, 26, 2, "1234", "FD")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetXY(amountX+7, y+5)
	pdf.CellFormat(amountWidth-14, 5, tr("IMPORTE CON LETRA"), "", 1, "L", false, 0, "")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 6.2)
	pdf.SetXY(amountX+7, y+12)
	pdf.MultiCell(amountWidth-14, 4, tr(amountInSpanishMXN(r.Total)), "", "L", false)
	x := 120.0
	setRGBFill(pdf, "255,255,255")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(x, y, 88, 26, 2, "1234", "FD")
	rows := [][2]string{{"SUBTOTAL", formatInvoiceMoney(r.Subtotal)}, {"DESCUENTO", formatInvoiceMoney(r.Descuento)}, {"IVA", formatInvoiceMoney(r.Impuestos)}}
	for _, row := range rows {
		setRGBDraw(pdf, quotationLine)
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 6.5)
		pdf.SetXY(x, y)
		pdf.CellFormat(42, 6, tr(row[0]), "B", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "B", 7)
		pdf.CellFormat(44, 6, row[1], "B", 1, "R", false, 0, "")
		y += 6
	}
	setRGBFill(pdf, quotationBlue)
	pdf.RoundedRect(x, y, 88, 8, 2, "34", "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(x, y)
	pdf.CellFormat(42, 8, "TOTAL", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(44, 8, formatInvoiceMoney(r.Total)+" MXN", "", 1, "R", false, 0, "")
	return y + 8
}

func drawInvoiceFiscalSection(pdf *gofpdf.Fpdf, r reportmodels.Invoice, start float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	fields := [][2]string{{"SELLO DIGITAL DEL CFDI", cleanFiscalText(r.SelloEmisor)}, {"SELLO DIGITAL DEL SAT", cleanFiscalText(r.SelloSAT)}, {"CADENA ORIGINAL DEL COMPLEMENTO DE CERTIFICACION DIGITAL DEL SAT", cleanFiscalText(r.CadenaOriginalSAT)}}
	contentWidth, lineHeight := 154.0, 2.8
	pdf.SetFont("Arial", "", 5.5)
	height := 6.0
	for _, field := range fields {
		lines := pdf.SplitLines([]byte(tr(field[1])), contentWidth)
		if len(lines) == 0 {
			lines = [][]byte{{}}
		}
		height += 3.2 + float64(len(lines))*lineHeight + 2.2
	}
	if height < 34 {
		height = 34
	}
	if start+height+13 > 278 {
		pdf.AddPage()
		drawInvoiceContinuation(pdf, r)
		start = 32
	}
	y := start
	verification := "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=" + url.QueryEscape(r.UUID) + "&re=" + url.QueryEscape(r.RFCEmisor) + "&rr=" + url.QueryEscape(r.RFCReceptor) + "&tt=" + url.QueryEscape(fmt.Sprintf("%.6f", r.Total))
	if len(r.SelloEmisor) >= 8 {
		verification += "&fe=" + url.QueryEscape(r.SelloEmisor[len(r.SelloEmisor)-8:])
	}
	key := barcode.RegisterQR(pdf, verification, qr.M, qr.Unicode)
	const (
		qrAreaX     = 8.0
		qrAreaWidth = 34.0
		qrPadding   = 2.0
	)
	qrSize := height - 2*qrPadding
	maxQRSize := qrAreaWidth - 2*qrPadding
	if qrSize > maxQRSize {
		qrSize = maxQRSize
	}
	qrX := qrAreaX + (qrAreaWidth-qrSize)/2
	qrY := y + (height-qrSize)/2
	barcode.Barcode(pdf, key, qrX, qrY, qrSize, qrSize, false)
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(46, y, 162, height, 2, "1234", "D")
	fy := y + 2
	for _, f := range fields {
		setRGB(pdf, quotationBlue)
		pdf.SetFont("Arial", "B", 5.2)
		pdf.SetXY(50, fy)
		pdf.CellFormat(contentWidth, 3, tr(f[0]), "", 1, "L", false, 0, "")
		pdf.SetTextColor(45, 61, 91)
		pdf.SetFont("Arial", "", 5.5)
		pdf.SetXY(50, fy+3.2)
		lines := pdf.SplitLines([]byte(tr(f[1])), contentWidth)
		if len(lines) == 0 {
			lines = [][]byte{{}}
		}
		pdf.MultiCell(contentWidth, lineHeight, tr(f[1]), "", "L", false)
		fy += 3.2 + float64(len(lines))*lineHeight + 2.2
	}
	footerY := y + height + 3
	setRGBDraw(pdf, quotationBlue)
	pdf.Line(8, footerY, 208, footerY)
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetXY(8, footerY+2)
	pdf.CellFormat(90, 5, tr("¡Gracias por su preferencia!"), "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 5.5)
	pdf.SetTextColor(90, 105, 130)
	pdf.SetXY(8, footerY+6)
	pdf.CellFormat(90, 4, tr("Este documento es una representacion impresa de un CFDI."), "", 0, "L", false, 0, "")
	if len(kommerzeHorizontalLogo) > 0 {
		name := "invoice-footer-logo"
		pdf.RegisterImageOptionsReader(name, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, bytes.NewReader(kommerzeHorizontalLogo))
		pdf.ImageOptions(name, 168, footerY+2, 37, 0, false, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, 0, "")
	}
}

func drawInvoiceContinuation(pdf *gofpdf.Fpdf, r reportmodels.Invoice) {
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 14)
	pdf.SetXY(8, 10)
	pdf.CellFormat(120, 8, "CFDI "+r.Serie+"-"+r.Folio, "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 6)
	pdf.SetXY(8, 20)
	pdf.CellFormat(190, 5, "Folio fiscal: "+r.UUID, "B", 1, "L", false, 0, "")
}

func formatInvoiceMoney(v float64) string { return fmt.Sprintf("$%s", formatWithThousands(v)) }
func formatWithThousands(v float64) string {
	raw := fmt.Sprintf("%.2f", v)
	parts := strings.Split(raw, ".")
	whole := parts[0]
	for i := len(whole) - 3; i > 0; i -= 3 {
		whole = whole[:i] + "," + whole[i:]
	}
	return whole + "." + parts[1]
}
func cleanFiscalText(v string) string {
	v = strings.ReplaceAll(v, "\r", "")
	return strings.ReplaceAll(v, "\n", "")
}
