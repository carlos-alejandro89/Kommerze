package renders

import (
	"bytes"
	"fmt"
	"strings"

	"BitComercio/internal/usecases/reports/models"
	"github.com/jung-kurt/gofpdf"
)

func RenderReceiptPDF(r models.Receipt) ([]byte, error) {
	legendHeight := float64(len(r.Leyendas)) * 6
	if len(r.LeyendaGrupos) > 0 {
		legendHeight = 0
		for _, group := range r.LeyendaGrupos {
			legendHeight += float64(estimatedTextLines(group.Text))*4 + 6
		}
	}
	height := 80.0 + float64(len(r.Items))*16 + legendHeight
	pdf := gofpdf.NewCustom(&gofpdf.InitType{UnitStr: "mm", Size: gofpdf.SizeType{Wd: 80, Ht: height}})
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	pdf.SetMargins(5, 5, 5)
	pdf.SetAutoPageBreak(false, 0)
	pdf.AddPage()
	pdf.SetFont("Courier", "B", 17)
	pdf.MultiCell(70, 7, tr(strings.ToUpper(r.Negocio)), "", "C", false)
	pdf.SetFont("Courier", "B", 10)
	pdf.CellFormat(70, 5, "PUNTO DE VENTA", "", 1, "C", false, 0, "")
	pdf.SetFont("Courier", "", 8)
	separator := strings.Repeat("-", 42)
	pdf.CellFormat(70, 4, separator, "", 1, "L", false, 0, "")
	for _, text := range []string{"Sucursal: " + r.Sucursal, "Folio: " + r.Folio, "Fecha: " + r.Fecha.Format("02/01/2006 15:04"), "Cajero: " + r.Cajero} {
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
		pdf.CellFormat(50, 4, fmt.Sprintf("%.2f x $%.2f", item.Cantidad, item.Precio), "", 0, "L", false, 0, "")
		pdf.CellFormat(20, 4, fmt.Sprintf("$%.2f", item.Importe), "", 1, "R", false, 0, "")
	}
	pdf.CellFormat(70, 4, separator, "", 1, "L", false, 0, "")
	for _, total := range [][2]string{{"Subtotal:", fmt.Sprintf("$%.2f", r.Subtotal)}, {"Descuento:", fmt.Sprintf("$%.2f", r.Descuento)}} {
		pdf.CellFormat(50, 4, total[0], "", 0, "R", false, 0, "")
		pdf.CellFormat(20, 4, total[1], "", 1, "R", false, 0, "")
	}
	pdf.SetFont("Courier", "B", 12)
	pdf.CellFormat(50, 7, "TOTAL:", "", 0, "R", false, 0, "")
	pdf.CellFormat(20, 7, fmt.Sprintf("$%.2f", r.Total), "", 1, "R", false, 0, "")
	pdf.SetFont("Courier", "", 8)
	for _, total := range [][2]string{{"Pago:", fmt.Sprintf("$%.2f", r.Pago)}, {"Cambio:", fmt.Sprintf("$%.2f", r.Cambio)}} {
		pdf.CellFormat(50, 4, total[0], "", 0, "R", false, 0, "")
		pdf.CellFormat(20, 4, total[1], "", 1, "R", false, 0, "")
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
