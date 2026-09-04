package renders

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

func RenderTransferPDF(r models.TransferReport) ([]byte, error) {
	r.Negocio = optionalText(r.Negocio)
	r.RazonSocial = optionalText(r.RazonSocial)
	r.RFCNegocio = optionalText(r.RFCNegocio)
	r.SucursalOrigen = optionalText(r.SucursalOrigen)
	r.DireccionOrigen = optionalText(r.DireccionOrigen)
	r.TelefonoOrigen = optionalText(r.TelefonoOrigen)
	r.CorreoOrigen = optionalText(r.CorreoOrigen)
	r.SucursalDestino = optionalText(r.SucursalDestino)
	r.DireccionDestino = optionalText(r.DireccionDestino)

	pdf := gofpdf.New("P", "mm", "Letter", "")
	pdf.SetMargins(10, 9, 10)
	pdf.SetAutoPageBreak(false, 0)
	pdf.SetTitle("Reporte de transferencia "+r.Folio, true)
	pdf.SetAuthor("Kommerze", true)
	pdf.AddPage()
	drawTransferHeader(pdf, r, false)
	drawTransferGeneral(pdf, r, 52)
	drawTransferRoute(pdf, r, 83)
	y := drawTransferItems(pdf, r, 113)
	if y+34 > 257 {
		pdf.AddPage()
		drawTransferHeader(pdf, r, true)
		y = 50
	}
	drawTransferSummary(pdf, r, y+7)
	drawTransferFooter(pdf)

	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func drawTransferHeader(pdf *gofpdf.Fpdf, r models.TransferReport, continuation bool) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	if len(kommerzeHorizontalLogo) > 0 {
		opts := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
		name := fmt.Sprintf("transfer-logo-%d", pdf.PageNo())
		pdf.RegisterImageOptionsReader(name, opts, bytes.NewReader(kommerzeHorizontalLogo))
		pdf.ImageOptions(name, 10, 10, 43, 0, false, opts, 0, "")
	} else {
		drawKommerzeMark(pdf, 10, 10, 10)
	}
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 13)
	pdf.SetXY(59, 9.5)
	pdf.CellFormat(77, 7, tr(strings.ToUpper(r.Negocio)), "", 1, "L", false, 0, "")
	pdf.SetTextColor(72, 91, 126)
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(59, 17)
	pdf.CellFormat(77, 4, tr(r.RazonSocial), "", 1, "L", false, 0, "")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(59, 21.5)
	pdf.CellFormat(77, 4, tr("RFC: "+emptyDash(r.RFCNegocio)), "", 1, "L", false, 0, "")
	contact := strings.Join(nonEmptyTransferValues(r.TelefonoOrigen, r.CorreoOrigen), "  •  ")
	if contact != "" {
		pdf.SetTextColor(72, 91, 126)
		pdf.SetXY(59, 26)
		pdf.CellFormat(77, 4, tr(contact), "", 1, "L", false, 0, "")
	}
	setRGBFill(pdf, quotationBlue)
	pdf.RoundedRect(142, 9, 64, 10, 2, "1234", "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(142, 11)
	title := "REPORTE DE TRANSFERENCIA"
	if continuation {
		title = "TRANSFERENCIA - CONTINUACIÓN"
	}
	pdf.CellFormat(64, 6, tr(title), "", 1, "C", false, 0, "")
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

func drawTransferGeneral(pdf *gofpdf.Fpdf, r models.TransferReport, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y, 196, 23, 2, "1234", "D")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(16, y+4)
	pdf.Cell(55, 5, tr("INFORMACIÓN GENERAL"))
	received := "Pendiente"
	if r.FechaRecepcion != nil {
		received = r.FechaRecepcion.Format("02/01/2006 15:04")
	}
	rows := [][2]string{{"FECHA DE ENVÍO", r.FechaEnvio.Format("02/01/2006 15:04")}, {"FECHA DE RECEPCIÓN", received}, {"ESTATUS", r.Estatus}}
	for index, row := range rows {
		x := 16 + float64(index)*63
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 6)
		pdf.SetXY(x, y+11)
		pdf.CellFormat(58, 3.5, tr(row[0]), "", 1, "L", false, 0, "")
		if index == 2 {
			drawTransferStatusBadge(pdf, x, y+15.2, row[1], tr)
			continue
		}
		pdf.SetFont("Arial", "", 7)
		pdf.SetXY(x, y+15.5)
		pdf.CellFormat(58, 4, tr(emptyDash(row[1])), "", 1, "L", false, 0, "")
	}
}

func drawTransferStatusBadge(pdf *gofpdf.Fpdf, x, y float64, status string, tr func(string) string) {
	status = emptyDash(strings.TrimSpace(status))
	normalized := strings.ToLower(status)
	fill, foreground, icon := "232,240,254", "38,98,176", "info"
	switch {
	case strings.Contains(normalized, "aceptad"), strings.Contains(normalized, "recibid"), strings.Contains(normalized, "complet"):
		fill, foreground, icon = "228,247,238", "18,132,84", "check"
	case strings.Contains(normalized, "cancelad"), strings.Contains(normalized, "rechazad"):
		fill, foreground, icon = "254,235,235", "198,52,52", "cross"
	case strings.Contains(normalized, "tránsito"), strings.Contains(normalized, "transito"), strings.Contains(normalized, "pendiente"), strings.Contains(normalized, "proceso"):
		fill, foreground, icon = "255,246,216", "172,111,8", "clock"
	}

	pdf.SetFont("Arial", "B", 6.4)
	label := tr(status)
	width := pdf.GetStringWidth(label) + 12
	if width < 25 {
		width = 25
	}
	if width > 56 {
		width = 56
	}
	setRGBFill(pdf, fill)
	pdf.RoundedRect(x, y, width, 6, 3, "1234", "F")
	setRGB(pdf, foreground)
	setRGBDraw(pdf, foreground)
	pdf.SetLineWidth(.35)
	cx, cy := x+4.2, y+3
	pdf.Circle(cx, cy, 1.75, "D")
	switch icon {
	case "check":
		pdf.Line(cx-0.9, cy, cx-0.15, cy+0.75)
		pdf.Line(cx-0.15, cy+0.75, cx+1.05, cy-0.8)
	case "cross":
		pdf.Line(cx-0.7, cy-0.7, cx+0.7, cy+0.7)
		pdf.Line(cx+0.7, cy-0.7, cx-0.7, cy+0.7)
	case "clock":
		pdf.Line(cx, cy, cx, cy-1)
		pdf.Line(cx, cy, cx+0.85, cy+0.5)
	default:
		pdf.Circle(cx, cy, .45, "F")
	}
	pdf.SetLineWidth(.2)
	pdf.SetXY(x+7.5, y+1)
	pdf.CellFormat(width-9, 4, label, "", 1, "L", false, 0, "")
}

func drawTransferRoute(pdf *gofpdf.Fpdf, r models.TransferReport, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(10, y)
	pdf.Cell(80, 5, "RUTA DE TRANSFERENCIA")
	pdf.SetTextColor(92, 105, 128)
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(10, y+5)
	pdf.Cell(110, 4, tr("Origen y destino registrados para el movimiento de mercancía."))
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y+11, 196, 18, 3, "1234", "D")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 6)
	pdf.SetXY(16, y+14)
	pdf.Cell(72, 4, "SUCURSAL ORIGEN")
	pdf.SetXY(128, y+14)
	pdf.CellFormat(72, 4, "SUCURSAL DESTINO", "", 1, "R", false, 0, "")
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(16, y+19)
	pdf.CellFormat(72, 5, tr(r.SucursalOrigen), "", 1, "L", false, 0, "")
	pdf.SetXY(128, y+19)
	pdf.CellFormat(72, 5, tr(r.SucursalDestino), "", 1, "R", false, 0, "")
	setRGBDraw(pdf, "188,211,245")
	pdf.SetLineWidth(.45)
	pdf.Line(88, y+20.5, 99, y+20.5)
	pdf.Line(107, y+20.5, 118, y+20.5)
	setRGB(pdf, quotationBlue)
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.65)
	pdf.Line(99, y+20.5, 107, y+20.5)
	pdf.Line(103.5, y+17, 107, y+20.5)
	pdf.Line(103.5, y+24, 107, y+20.5)
	pdf.SetLineWidth(.2)
}

func drawTransferItems(pdf *gofpdf.Fpdf, r models.TransferReport, startY float64) float64 {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	cols := []float64{27, 72, 27, 18, 26, 26}
	headers := []string{"CÓDIGO", "DESCRIPCIÓN", "UNIDAD", "CANT.", "PRECIO VENTA", "IMPORTE"}
	drawTransferTableHeader(pdf, startY, cols, headers, tr)
	y := startY + 8
	for _, item := range r.Items {
		if y+7 > 247 {
			setRGBDraw(pdf, quotationLine)
			pdf.RoundedRect(10, startY, 196, y-startY, 2, "1234", "D")
			drawTransferFooter(pdf)
			pdf.AddPage()
			drawTransferHeader(pdf, r, true)
			startY, y = 50, 58
			drawTransferTableHeader(pdf, startY, cols, headers, tr)
		}
		values := []string{item.Codigo, item.Descripcion, item.Unidad, quantity(item.Cantidad), money(item.PrecioVenta), money(item.Importe)}
		align := []string{"L", "L", "C", "C", "R", "R"}
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "", 6.5)
		for col, value := range values {
			if col == 1 {
				value = truncateReportText(value, 54)
			}
			x := 10 + sumWidths(cols[:col])
			pdf.SetXY(x, y)
			pdf.CellFormat(cols[col], 7, tr(value), "", 0, align[col], false, 0, "")
			if col > 0 {
				setRGBDraw(pdf, quotationLine)
				pdf.Line(x, y, x, y+7)
			}
		}
		setRGBDraw(pdf, quotationLine)
		pdf.Line(10, y+7, 206, y+7)
		y += 7
	}
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, startY, 196, y-startY, 2, "1234", "D")
	return y
}

func drawTransferTableHeader(pdf *gofpdf.Fpdf, y float64, cols []float64, headers []string, tr func(string) string) {
	setRGBFill(pdf, quotationNavy)
	pdf.RoundedRect(10, y, 196, 8, 2, "12", "F")
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 6)
	for index, header := range headers {
		pdf.SetXY(10+sumWidths(cols[:index]), y+1)
		pdf.CellFormat(cols[index], 6, tr(header), "", 0, "C", false, 0, "")
	}
}

func drawTransferSummary(pdf *gofpdf.Fpdf, r models.TransferReport, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y, 118, 29, 2, "1234", "D")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetXY(16, y+4)
	pdf.Cell(50, 5, "COMENTARIOS")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(16, y+10)
	pdf.MultiCell(106, 4, tr(emptyDash(r.Comentarios)), "", "L", false)
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(134, y, 72, 29, 2, "1234", "D")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(140, y+5)
	pdf.CellFormat(34, 4, "PRODUCTOS", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "B", 7)
	pdf.CellFormat(25, 4, fmt.Sprint(r.TotalProductos), "", 1, "R", false, 0, "")
	pdf.SetXY(140, y+10)
	pdf.SetFont("Arial", "", 6.5)
	pdf.CellFormat(34, 4, "UNIDADES", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "B", 7)
	pdf.CellFormat(25, 4, quantity(r.UnidadesTotales), "", 1, "R", false, 0, "")
	setRGBFill(pdf, "235,242,255")
	pdf.RoundedRect(138, y+17, 64, 8, 1.5, "1234", "F")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetXY(141, y+19)
	pdf.CellFormat(27, 4, "VALOR TOTAL", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(31, 4, money(r.ValorTotal), "", 1, "R", false, 0, "")
}

func drawTransferFooter(pdf *gofpdf.Fpdf) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBDraw(pdf, quotationLine)
	pdf.Line(10, 264, 206, 264)
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "", 6)
	pdf.SetXY(10, 266)
	pdf.Cell(60, 4, "Powered by Kommerze")
	pdf.SetXY(130, 266)
	pdf.CellFormat(76, 4, tr("Fecha de impresión: "+time.Now().Format("02/01/2006 15:04")), "", 1, "R", false, 0, "")
}

func nonEmptyTransferValues(values ...string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if value = optionalText(value); value != "" {
			result = append(result, value)
		}
	}
	return result
}
