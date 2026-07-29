package renders

import (
	"bytes"
	"fmt"
	"strings"

	"BitComercio/internal/usecases/reports/models"
)

func line(left, right string, width int) string {
	leftRunes := []rune(left)
	rightRunes := []rune(right)
	if len(leftRunes)+len(rightRunes) >= width {
		max := width - len(rightRunes) - 1
		if max < 1 {
			max = 1
		}
		if len(leftRunes) > max {
			leftRunes = leftRunes[:max]
		}
	}
	return string(leftRunes) + strings.Repeat(" ", width-len(leftRunes)-len(rightRunes)) + string(rightRunes) + "\n"
}

func wrapReceiptText(text string, width int) string {
	var lines []string
	for _, paragraph := range strings.Split(strings.TrimSpace(text), "\n") {
		words := strings.Fields(paragraph)
		if len(words) == 0 {
			lines = append(lines, "")
			continue
		}
		current := []rune{}
		for _, word := range words {
			wordRunes := []rune(word)
			for len(wordRunes) > width {
				if len(current) > 0 {
					lines = append(lines, string(current))
					current = nil
				}
				lines = append(lines, string(wordRunes[:width]))
				wordRunes = wordRunes[width:]
			}
			required := len(wordRunes)
			if len(current) > 0 {
				required++
			}
			if len(current)+required > width {
				lines = append(lines, string(current))
				current = append([]rune(nil), wordRunes...)
			} else {
				if len(current) > 0 {
					current = append(current, ' ')
				}
				current = append(current, wordRunes...)
			}
		}
		lines = append(lines, string(current))
	}
	return strings.Join(lines, "\n")
}

func RenderReceiptEscPos(r models.Receipt, paperWidthMM int, paperCut, openDrawer bool) []byte {
	width := 42
	if paperWidthMM == 58 {
		width = 32
	}
	var b bytes.Buffer
	b.Write([]byte{0x1B, 0x40, 0x1B, 0x74, 0x10})
	b.Write([]byte{0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01, 0x1D, 0x21, 0x11})
	b.WriteString(strings.ToUpper(r.Negocio) + "\n")
	b.Write([]byte{0x1D, 0x21, 0x00})
	b.WriteString("PUNTO DE VENTA\n")
	b.Write([]byte{0x1B, 0x45, 0x00, 0x1B, 0x61, 0x00})
	b.WriteString(strings.Repeat("-", width) + "\n")
	b.WriteString(wrapReceiptText("Sucursal: "+r.Sucursal, width) + "\n")
	b.WriteString(wrapReceiptText("Folio: "+r.Folio, width) + "\n")
	b.WriteString(wrapReceiptText("Fecha: "+r.Fecha.Format("02/01/2006 15:04"), width) + "\n")
	b.WriteString(wrapReceiptText("Cajero: "+r.Cajero, width) + "\n")
	b.WriteString(strings.Repeat("-", width) + "\n")
	b.WriteString(line("Descripcion", "Importe", width))
	for _, item := range r.Items {
		b.WriteString(wrapReceiptText(strings.ToUpper(item.Descripcion), width) + "\n")
		b.WriteString(line(fmt.Sprintf("%.2f x $%.2f", item.Cantidad, item.Precio), fmt.Sprintf("$%.2f", item.Importe), width))
	}
	b.WriteString(strings.Repeat("-", width) + "\n")
	b.WriteString(line("Subtotal:", fmt.Sprintf("$%.2f", r.Subtotal), width))
	b.WriteString(line("Descuento:", fmt.Sprintf("$%.2f", r.Descuento), width))
	b.Write([]byte{0x1B, 0x45, 0x01, 0x1D, 0x21, 0x11})
	b.WriteString(line("TOTAL:", fmt.Sprintf("$%.2f", r.Total), width/2))
	b.Write([]byte{0x1D, 0x21, 0x00, 0x1B, 0x45, 0x00})
	b.WriteString(line("Pago:", fmt.Sprintf("$%.2f", r.Pago), width))
	b.WriteString(line("Cambio:", fmt.Sprintf("$%.2f", r.Cambio), width))
	b.WriteString(strings.Repeat("-", width) + "\n")
	b.Write([]byte{0x1B, 0x61, 0x01})
	if len(r.LeyendaGrupos) > 0 {
		for index, group := range r.LeyendaGrupos {
			if index > 0 {
				b.Write([]byte{0x1B, 0x45, 0x00})
				b.WriteString(strings.Repeat("-", width) + "\n")
			}
			b.Write([]byte{0x1B, 0x45, boolByte(group.Bold)})
			if text := strings.TrimSpace(group.Text); text != "" {
				b.WriteString(wrapReceiptText(text, width) + "\n")
			}
		}
		b.Write([]byte{0x1B, 0x45, 0x00})
	} else {
		for _, legend := range r.Leyendas {
			if strings.TrimSpace(legend) != "" {
				b.WriteString(wrapReceiptText(legend, width) + "\n")
			}
		}
	}
	b.WriteString("\n\n\n")
	if openDrawer {
		// ESC p m t1 t2: pulso en el pin 2 del conector de cajón.
		b.Write([]byte{0x1B, 0x70, 0x00, 0x19, 0xFA})
	}
	if paperCut {
		// GS V 1: corte parcial, ampliamente soportado por impresoras ESC/POS.
		b.Write([]byte{0x1D, 0x56, 0x01})
	}
	return b.Bytes()
}

func boolByte(value bool) byte {
	if value {
		return 0x01
	}
	return 0x00
}
