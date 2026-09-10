package renders

import (
	"bytes"
	"fmt"
	"strings"

	reportmodels "BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

func closingReportPDF(header reportmodels.ClosingReportHeader, title string) *gofpdf.Fpdf {
	pdf := gofpdf.New("P", "mm", "Letter", "")
	pdf.SetMargins(10, 9, 10)
	pdf.SetAutoPageBreak(true, 14)
	pdf.SetTitle(title, true)
	pdf.SetAuthor("Kommerze", true)
	pdf.SetHeaderFunc(func() {
		tr := pdf.UnicodeTranslatorFromDescriptor("")
		if len(kommerzeHorizontalLogo) > 0 {
			opts := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
			name := fmt.Sprintf("closing-logo-%d", pdf.PageNo())
			pdf.RegisterImageOptionsReader(name, opts, bytes.NewReader(kommerzeHorizontalLogo))
			pdf.ImageOptions(name, 10, 8, 38, 0, false, opts, 0, "")
		}
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 12)
		pdf.SetXY(59, 9)
		pdf.CellFormat(77, 6, tr(strings.ToUpper(optionalText(header.Negocio))), "", 1, "L", false, 0, "")
		pdf.SetFont("Arial", "", 6.5)
		pdf.SetXY(59, 16)
		pdf.CellFormat(77, 4, tr(optionalText(header.RazonSocial)), "", 1, "L", false, 0, "")
		pdf.SetXY(59, 21)
		pdf.CellFormat(77, 4, tr("RFC: "+optionalText(header.RFC)+"  ·  "+optionalText(header.Sucursal)), "", 1, "L", false, 0, "")
		setRGBFill(pdf, quotationBlue)
		pdf.RoundedRect(142, 9, 64, 10, 2, "1234", "F")
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 8)
		pdf.SetXY(142, 11)
		pdf.CellFormat(64, 6, tr(strings.ToUpper(title)), "", 1, "C", false, 0, "")
		pdf.SetTextColor(72, 91, 126)
		pdf.SetFont("Arial", "", 6.5)
		pdf.SetXY(142, 21)
		pdf.CellFormat(64, 4, header.FechaInicio.Format("02/01/2006 15:04")+" - "+header.FechaFin.Format("02/01/2006 15:04"), "", 1, "C", false, 0, "")
		setRGBDraw(pdf, quotationBlue)
		pdf.Line(10, 29, 206, 29)
		pdf.SetY(35)
	})
	return pdf
}

func RenderDiscountReportPDF(r reportmodels.DiscountReport) ([]byte, error) {
	pdf := closingReportPDF(r.Header, "Reporte de descuentos")
	pdf.AddPage()
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	widths := []float64{20, 30, 61, 28, 28, 29}
	headings := []string{"FOLIO", "FECHA", "CLIENTE", "TOTAL BRUTO", "DESCUENTO", "TOTAL NETO"}
	setRGBFill(pdf, "239,245,255")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 7)
	for i, heading := range headings {
		pdf.CellFormat(widths[i], 8, tr(heading), "", 0, map[bool]string{true: "R", false: "L"}[i >= 3], true, 0, "")
	}
	pdf.Ln(8)
	pdf.SetFont("Arial", "", 7)
	for _, row := range r.Rows {
		pdf.CellFormat(widths[0], 7, row.Folio, "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[1], 7, row.Fecha.Format("02/01/2006 15:04"), "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[2], 7, tr(row.Cliente), "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[3], 7, money(row.TotalBruto), "B", 0, "R", false, 0, "")
		pdf.CellFormat(widths[4], 7, money(row.Descuento), "B", 0, "R", false, 0, "")
		pdf.CellFormat(widths[5], 7, money(row.TotalNeto), "B", 0, "R", false, 0, "")
		pdf.Ln(7)
	}
	pdf.SetFont("Arial", "B", 8)
	pdf.CellFormat(widths[0]+widths[1]+widths[2], 9, "TOTALES", "T", 0, "R", false, 0, "")
	pdf.CellFormat(widths[3], 9, money(r.TotalBruto), "T", 0, "R", false, 0, "")
	pdf.CellFormat(widths[4], 9, money(r.Descuento), "T", 0, "R", false, 0, "")
	pdf.CellFormat(widths[5], 9, money(r.TotalNeto), "T", 1, "R", false, 0, "")
	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func RenderTransferSummaryPDF(r reportmodels.TransferSummaryReport) ([]byte, error) {
	title := "Transferencias de " + r.Direction
	pdf := closingReportPDF(r.Header, title)
	pdf.AddPage()
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	widths := []float64{18, 78, 34, 34, 32}
	headings := []string{"FOLIO", "RUTA DE TRANSFERENCIA", "FECHA DE ENVÍO", "FECHA DE RECEPCIÓN", "VALOR TOTAL"}
	drawHeadings := func() {
		setRGBFill(pdf, "239,245,255")
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 6.5)
		for index, heading := range headings {
			alignment := "L"
			if index == 4 {
				alignment = "R"
			}
			pdf.CellFormat(widths[index], 8, tr(heading), "", 0, alignment, true, 0, "")
		}
		pdf.Ln(8)
	}
	drawHeadings()
	for _, row := range r.Rows {
		if pdf.GetY()+16 > 258 {
			pdf.AddPage()
			drawHeadings()
		}
		y := pdf.GetY()
		setRGBDraw(pdf, quotationLine)
		recepcion := "Pendiente"
		if row.FechaRecepcion != nil {
			recepcion = row.FechaRecepcion.Format("02/01/2006 15:04")
		}

		setRGB(pdf, "196,42,48")
		pdf.SetFont("Arial", "B", 8)
		pdf.SetXY(10, y)
		pdf.CellFormat(widths[0], 14, row.Folio, "B", 0, "L", false, 0, "")

		routeX := 10 + widths[0]
		setRGBFill(pdf, "248,251,255")
		pdf.Rect(routeX+2, y+2, widths[1]-4, 10, "F")
		setRGB(pdf, "72,91,126")
		pdf.SetFont("Arial", "B", 4.8)
		pdf.SetXY(routeX+5, y+3)
		pdf.CellFormat(27, 2.5, "ORIGEN", "", 0, "L", false, 0, "")
		pdf.SetXY(routeX+widths[1]-32, y+3)
		pdf.CellFormat(27, 2.5, "DESTINO", "", 0, "R", false, 0, "")
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 6.5)
		pdf.SetXY(routeX+5, y+6.5)
		pdf.CellFormat(29, 3.5, tr(strings.ToUpper(row.SucursalOrigen)), "", 0, "L", false, 0, "")
		pdf.SetXY(routeX+widths[1]-34, y+6.5)
		pdf.CellFormat(29, 3.5, tr(strings.ToUpper(row.SucursalDestino)), "", 0, "R", false, 0, "")
		arrowX := routeX + widths[1]/2
		setRGBDraw(pdf, quotationBlue)
		pdf.SetLineWidth(.45)
		pdf.Line(arrowX-8, y+7.5, arrowX+8, y+7.5)
		pdf.Line(arrowX+4.5, y+4.5, arrowX+8, y+7.5)
		pdf.Line(arrowX+4.5, y+10.5, arrowX+8, y+7.5)
		pdf.SetLineWidth(.2)
		pdf.SetXY(routeX, y)
		pdf.CellFormat(widths[1], 14, "", "B", 0, "L", false, 0, "")

		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "", 6.5)
		pdf.CellFormat(widths[2], 14, row.FechaEnvio.Format("02/01/2006 15:04"), "B", 0, "L", false, 0, "")
		pdf.CellFormat(widths[3], 14, recepcion, "B", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "B", 7.5)
		pdf.CellFormat(widths[4], 14, money(row.ValorTotal), "B", 1, "R", false, 0, "")
	}
	if pdf.GetY()+14 > 258 {
		pdf.AddPage()
	}
	setRGBFill(pdf, "239,245,255")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(132, pdf.GetY(), 74, 11, 2, "1234", "DF")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(137, pdf.GetY()+2)
	pdf.CellFormat(31, 7, "VALOR TOTAL", "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(33, 7, money(r.ValorTotal), "", 1, "R", false, 0, "")
	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}
