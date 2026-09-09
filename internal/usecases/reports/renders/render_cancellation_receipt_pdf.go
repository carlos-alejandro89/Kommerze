package renders

import (
	"bytes"
	"fmt"
	"strings"

	reportmodels "BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

func RenderCancellationReceiptPDF(r reportmodels.CancellationReceipt) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "Letter", "")
	pdf.SetMargins(10, 9, 10)
	pdf.SetAutoPageBreak(false, 0)
	pdf.SetTitle("Acuse de cancelación "+r.UUID, true)
	pdf.SetAuthor("Kommerze", true)
	pdf.AddPage()
	drawCancellationHeader(pdf, r)
	drawCancellationGeneral(pdf, r, 52)
	drawCancellationResult(pdf, r, 82)
	drawCancellationFiscalData(pdf, r, 119)
	drawTransferFooter(pdf)

	var output bytes.Buffer
	if err := pdf.Output(&output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func drawCancellationHeader(pdf *gofpdf.Fpdf, r reportmodels.CancellationReceipt) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	if len(kommerzeHorizontalLogo) > 0 {
		opts := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
		pdf.RegisterImageOptionsReader("cancellation-logo", opts, bytes.NewReader(kommerzeHorizontalLogo))
		pdf.ImageOptions("cancellation-logo", 10, 10, 43, 0, false, opts, 0, "")
	} else {
		drawKommerzeMark(pdf, 10, 10, 10)
	}
	business := strings.TrimSpace(r.Negocio)
	if business == "" {
		business = r.RazonSocial
	}
	if business == "" {
		business = "KOMMERZE"
	}
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 13)
	pdf.SetXY(59, 9.5)
	pdf.CellFormat(77, 7, tr(strings.ToUpper(business)), "", 1, "L", false, 0, "")
	pdf.SetTextColor(72, 91, 126)
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(59, 17)
	pdf.CellFormat(77, 4, tr(emptyDash(r.RazonSocial)), "", 1, "L", false, 0, "")
	setRGB(pdf, quotationNavy)
	pdf.SetXY(59, 21.5)
	pdf.CellFormat(77, 4, tr("RFC: "+emptyDash(r.RFCEmisor)), "", 1, "L", false, 0, "")
	contact := strings.Join(nonEmptyTransferValues(r.Sucursal, r.Telefono, r.Correo), "  •  ")
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
	pdf.CellFormat(64, 6, tr("ACUSE DE CANCELACIÓN"), "", 1, "C", false, 0, "")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetXY(145, 23)
	pdf.Cell(18, 4, "ESTATUS SAT")
	setRGB(pdf, "196,42,48")
	pdf.SetFont("Arial", "B", 12)
	pdf.SetXY(174, 21.5)
	pdf.CellFormat(29, 7, strings.TrimSpace(r.EstatusUUID), "", 1, "R", false, 0, "")
	setRGBDraw(pdf, quotationBlue)
	pdf.SetLineWidth(.55)
	pdf.Line(10, 42, 206, 42)
	pdf.SetLineWidth(.2)
}

func drawCancellationGeneral(pdf *gofpdf.Fpdf, r reportmodels.CancellationReceipt, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y, 196, 21, 2, "1234", "D")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(16, y+4)
	pdf.Cell(80, 5, tr("INFORMACIÓN GENERAL"))
	labels := []string{"FECHA DEL ACUSE", "RFC DEL EMISOR", "CERTIFICADO SAT"}
	values := []string{r.Fecha.Format("02/01/2006 15:04:05"), emptyDash(r.RFCEmisor), emptyDash(r.CertificadoSAT)}
	for index := range labels {
		x := 16 + float64(index)*64
		setRGB(pdf, quotationNavy)
		pdf.SetFont("Arial", "B", 6)
		pdf.SetXY(x, y+11)
		pdf.Cell(56, 4, labels[index])
		pdf.SetFont("Arial", "", 7)
		pdf.SetXY(x, y+15)
		pdf.Cell(56, 4, tr(values[index]))
	}
}

func drawCancellationResult(pdf *gofpdf.Fpdf, r reportmodels.CancellationReceipt, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(10, y)
	pdf.Cell(90, 5, tr("RESULTADO DE LA CANCELACIÓN"))
	pdf.SetTextColor(92, 105, 128)
	pdf.SetFont("Arial", "", 6.5)
	pdf.SetXY(10, y+5)
	pdf.Cell(150, 4, tr("Confirmación del folio fiscal reportada por el servicio del SAT."))
	setRGBFill(pdf, "247,250,255")
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y+11, 196, 25, 3, "1234", "DF")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 6)
	pdf.SetXY(16, y+15)
	pdf.Cell(55, 4, "FOLIO FISCAL (UUID)")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetXY(16, y+20)
	pdf.Cell(115, 6, strings.ToUpper(emptyDash(r.UUID)))
	drawCancellationStatusBadge(pdf, 144, y+19, cancellationStatus(r.EstatusUUID), tr)
}

func drawCancellationStatusBadge(pdf *gofpdf.Fpdf, x, y float64, status string, tr func(string) string) {
	setRGBFill(pdf, "222,247,237")
	setRGB(pdf, "5,137,93")
	label := tr(status)
	pdf.SetFont("Arial", "B", 6.5)
	width := pdf.GetStringWidth(label) + 9
	if width > 56 {
		width = 56
	}
	pdf.RoundedRect(x, y, width, 7, 3.5, "1234", "F")
	pdf.SetXY(x+3, y+1.5)
	pdf.CellFormat(width-6, 4, label, "", 1, "C", false, 0, "")
}

func drawCancellationFiscalData(pdf *gofpdf.Fpdf, r reportmodels.CancellationReceipt, y float64) {
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(10, y)
	pdf.Cell(90, 5, tr("VALIDACIÓN FISCAL"))
	drawCancellationFiscalCard(pdf, tr, y+8, "DIGEST VALUE", r.DigestValue, 31)
	drawCancellationFiscalCard(pdf, tr, y+45, "SELLO DIGITAL DEL SAT", r.SignatureValue, 38)
	setRGBFill(pdf, "247,250,255")
	setRGBDraw(pdf, "194,218,252")
	pdf.RoundedRect(10, y+90, 196, 22, 3, "1234", "DF")
	setRGB(pdf, "64,102,225")
	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(16, y+95)
	pdf.Cell(80, 5, tr("DOCUMENTO CONSERVADO"))
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Arial", "", 7)
	pdf.SetXY(16, y+101)
	pdf.MultiCell(184, 4, tr("Esta es la representación impresa del acuse XML de cancelación. El archivo XML original se conserva junto a este PDF en la carpeta configurada para los CFDI."), "", "L", false)
}

func drawCancellationFiscalCard(pdf *gofpdf.Fpdf, tr func(string) string, y float64, label, value string, height float64) {
	setRGBDraw(pdf, quotationLine)
	pdf.RoundedRect(10, y, 196, height, 2.5, "1234", "D")
	setRGB(pdf, quotationBlue)
	pdf.SetFont("Arial", "B", 6.5)
	pdf.SetXY(16, y+5)
	pdf.Cell(80, 4, label)
	setRGB(pdf, quotationNavy)
	pdf.SetFont("Courier", "", 7)
	pdf.SetXY(16, y+11)
	pdf.MultiCell(184, 4, tr(strings.TrimSpace(value)), "", "L", false)
}

func cancellationStatus(code string) string {
	switch strings.TrimSpace(code) {
	case "201":
		return "Cancelación exitosa"
	case "202":
		return "Previamente cancelado"
	default:
		if strings.TrimSpace(code) == "" {
			return "No informado"
		}
		return fmt.Sprintf("Estatus %s", code)
	}
}
