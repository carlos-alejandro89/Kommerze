package renders

import (
	"bytes"
	"fmt"
	"image"
	"strings"

	"BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

func RenderReceiptPDF(r models.Receipt) ([]byte, error) {
	legendHeight := float64(len(r.Leyendas)) * 6
	headerExtraHeight := 0.0
	logoWidth, logoHeight := 0.0, 0.0
	if r.MostrarLogo && strings.TrimSpace(r.Logo) != "" {
		if logo, ok := decodeReceiptLogo(r.Logo); ok {
			logoWidth, logoHeight = proportionalLogoSize(logo, 42, 16)
			headerExtraHeight += logoHeight + 2
		}
	}
	for _, visibleText := range []struct {
		visible bool
		text    string
	}{{r.MostrarSucursal, r.Sucursal}, {r.MostrarDireccion, r.Direccion}, {r.MostrarTelefono, r.Telefono}, {r.MostrarCorreo, r.Correo}} {
		if visibleText.visible && strings.TrimSpace(visibleText.text) != "" {
			headerExtraHeight += float64(estimatedTextLines(visibleText.text)) * 4
		}
	}
	if len(r.LeyendaGrupos) > 0 {
		legendHeight = 0
		for _, group := range r.LeyendaGrupos {
			legendHeight += float64(estimatedTextLines(group.Text))*4 + 6
		}
	}
	height := 80.0 + headerExtraHeight + float64(len(r.Items))*16 + legendHeight
	pdf := gofpdf.NewCustom(&gofpdf.InitType{UnitStr: "mm", Size: gofpdf.SizeType{Wd: 80, Ht: height}})
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	pdf.SetMargins(5, 5, 5)
	pdf.SetAutoPageBreak(false, 0)
	pdf.AddPage()
	if r.MostrarLogo {
		if logo, ok := decodeReceiptLogo(r.Logo); ok {
			options := gofpdf.ImageOptions{ImageType: receiptImageType(logo), ReadDpi: true}
			pdf.RegisterImageOptionsReader("receipt-business-logo", options, bytes.NewReader(logo))
			if pdf.Error() == nil && logoWidth > 0 && logoHeight > 0 {
				pdf.ImageOptions("receipt-business-logo", (80-logoWidth)/2, pdf.GetY(), logoWidth, logoHeight, false, options, 0, "")
				pdf.Ln(logoHeight + 2)
			}
		}
	}
	pdf.SetFont("Courier", "B", 17)
	pdf.MultiCell(70, 7, tr(strings.ToUpper(r.Negocio)), "", "C", false)
	pdf.SetFont("Courier", "", 8)
	for _, header := range []struct {
		visible bool
		value   string
		bold    bool
	}{{r.MostrarSucursal, r.Sucursal, true}, {r.MostrarDireccion, r.Direccion, false}, {r.MostrarTelefono, r.Telefono, false}, {r.MostrarCorreo, r.Correo, false}} {
		if header.visible && strings.TrimSpace(header.value) != "" {
			style := ""
			if header.bold {
				style = "B"
			}
			pdf.SetFont("Courier", style, 8)
			pdf.MultiCell(70, 4, tr(header.value), "", "C", false)
		}
	}
	separator := strings.Repeat("-", 42)
	pdf.CellFormat(70, 4, separator, "", 1, "L", false, 0, "")
	for _, text := range []string{"Folio: " + r.Folio, "Fecha: " + r.Fecha.Format("02/01/2006 15:04"), "Cajero: " + r.Cajero} {
		pdf.CellFormat(70, 4, tr(text), "", 1, "L", false, 0, "")
	}
	pdf.CellFormat(70, 4, separator, "", 1, "L", false, 0, "")
	pdf.SetFont("Courier", "B", 8)
	pdf.CellFormat(50, 4, tr("Descripción"), "", 0, "L", false, 0, "")
	pdf.CellFormat(20, 4, "Importe", "", 1, "R", false, 0, "")
	for _, item := range r.Items {
		pdf.SetFont("Courier", "B", 8)
		pdf.MultiCell(70, 4, tr(strings.ToUpper(item.Descripcion)), "", "L", false)
		pdf.SetFont("Courier", "", 8)
		pdf.CellFormat(50, 4, fmt.Sprintf("%.2f x %s", item.Cantidad, money(item.Precio)), "", 0, "L", false, 0, "")
		pdf.CellFormat(20, 4, money(item.Importe), "", 1, "R", false, 0, "")
	}
	pdf.CellFormat(70, 4, separator, "", 1, "L", false, 0, "")
	for _, total := range [][2]string{{"Subtotal:", money(r.Subtotal)}, {"Descuento:", money(r.Descuento)}} {
		pdf.CellFormat(43, 4, total[0], "", 0, "R", false, 0, "")
		pdf.CellFormat(3, 4, "", "", 0, "", false, 0, "")
		pdf.CellFormat(24, 4, total[1], "", 1, "R", false, 0, "")
	}
	pdf.SetFont("Courier", "B", 11)
	pdf.CellFormat(43, 7, "TOTAL:", "", 0, "R", false, 0, "")
	pdf.CellFormat(3, 7, "", "", 0, "", false, 0, "")
	pdf.CellFormat(24, 7, money(r.Total), "", 1, "R", false, 0, "")
	pdf.SetFont("Courier", "", 8)
	for _, total := range [][2]string{{"Pago:", money(r.Pago)}, {"Cambio:", money(r.Cambio)}} {
		pdf.CellFormat(43, 4, total[0], "", 0, "R", false, 0, "")
		pdf.CellFormat(3, 4, "", "", 0, "", false, 0, "")
		pdf.CellFormat(24, 4, total[1], "", 1, "R", false, 0, "")
	}
	pdf.CellFormat(70, 4, separator, "", 1, "L", false, 0, "")
	if len(r.LeyendaGrupos) > 0 {
		for index, group := range r.LeyendaGrupos {
			if index > 0 {
				pdf.SetFont("Courier", "", 8)
				pdf.CellFormat(70, 4, separator, "", 1, "L", false, 0, "")
			}
			style := ""
			if group.Bold {
				style = "B"
			}
			pdf.SetFont("Courier", style, 8)
			pdf.MultiCell(70, 4, tr(strings.TrimSpace(group.Text)), "", "C", false)
		}
	} else {
		pdf.SetFont("Courier", "", 8)
		for _, legend := range r.Leyendas {
			pdf.MultiCell(70, 4, tr(strings.TrimSpace(legend)), "", "C", false)
		}
	}
	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func receiptImageType(data []byte) string {
	if len(data) >= 3 && data[0] == 0xff && data[1] == 0xd8 && data[2] == 0xff {
		return "JPG"
	}
	return "PNG"
}

func proportionalLogoSize(data []byte, maxWidth, maxHeight float64) (float64, float64) {
	config, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || config.Width < 1 || config.Height < 1 {
		return 0, 0
	}
	ratio := float64(config.Width) / float64(config.Height)
	width := maxWidth
	height := width / ratio
	if height > maxHeight {
		height = maxHeight
		width = height * ratio
	}
	return width, height
}

func estimatedTextLines(text string) int {
	lines := 0
	for _, paragraph := range strings.Split(strings.TrimSpace(text), "\n") {
		runes := len([]rune(paragraph))
		wrapped := (runes + 41) / 42
		if wrapped < 1 {
			wrapped = 1
		}
		lines += wrapped
	}
	if lines < 1 {
		return 1
	}
	return lines
}
