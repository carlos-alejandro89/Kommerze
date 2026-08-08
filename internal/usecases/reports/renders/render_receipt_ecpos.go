package renders

import (
	"bytes"
	"fmt"
	"strings"

	"BitComercio/internal/usecases/reports/models"

	"golang.org/x/text/encoding"
	"golang.org/x/text/encoding/charmap"
)

// writeEscPosText convierte el texto UTF-8 de la aplicación a Windows-1252,
// que corresponde a la tabla de caracteres 16 seleccionada con ESC t 16.
// Los comandos ESC/POS se escriben por separado y nunca pasan por el encoder.
func writeEscPosText(b *bytes.Buffer, text string) {
	encoded, err := encoding.ReplaceUnsupported(charmap.Windows1252.NewEncoder()).String(text)
	if err != nil {
		// ReplaceUnsupported evita errores por caracteres fuera de la tabla; este
		// fallback conserva una salida legible aun ante UTF-8 inválido.
		encoded = strings.ToValidUTF8(text, "?")
	}
	b.WriteString(encoded)
}

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
	// Inicializar, seleccionar Windows-1252 y forzar Font A. Font A es la
	// tipografía interna ESC/POS de aspecto más cercano a Arial/Helvetica.
	b.Write([]byte{0x1B, 0x40, 0x1B, 0x74, 0x10, 0x1B, 0x4D, 0x00})
	b.Write([]byte{0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01, 0x1D, 0x21, 0x11})
	writeEscPosText(&b, strings.ToUpper(r.Negocio)+"\n")
	b.Write([]byte{0x1D, 0x21, 0x00})
	writeEscPosText(&b, "PUNTO DE VENTA\n")
	b.Write([]byte{0x1B, 0x45, 0x00, 0x1B, 0x61, 0x00})
	writeEscPosText(&b, strings.Repeat("-", width)+"\n")
	writeEscPosText(&b, wrapReceiptText("Sucursal: "+r.Sucursal, width)+"\n")
	writeEscPosText(&b, wrapReceiptText("Folio: "+r.Folio, width)+"\n")
	writeEscPosText(&b, wrapReceiptText("Fecha: "+r.Fecha.Format("02/01/2006 15:04"), width)+"\n")
	writeEscPosText(&b, wrapReceiptText("Cajero: "+r.Cajero, width)+"\n")
	writeEscPosText(&b, strings.Repeat("-", width)+"\n")
	writeEscPosText(&b, line("Descripción", "Importe", width))
	for _, item := range r.Items {
		writeEscPosText(&b, wrapReceiptText(strings.ToUpper(item.Descripcion), width)+"\n")
		writeEscPosText(&b, line(fmt.Sprintf("%.2f x $%.2f", item.Cantidad, item.Precio), fmt.Sprintf("$%.2f", item.Importe), width))
	}
	writeEscPosText(&b, strings.Repeat("-", width)+"\n")
	writeEscPosText(&b, line("Subtotal:", fmt.Sprintf("$%.2f", r.Subtotal), width))
	writeEscPosText(&b, line("Descuento:", fmt.Sprintf("$%.2f", r.Descuento), width))
	b.Write([]byte{0x1B, 0x45, 0x01, 0x1D, 0x21, 0x11})
	writeEscPosText(&b, line("TOTAL:", fmt.Sprintf("$%.2f", r.Total), width/2))
	b.Write([]byte{0x1D, 0x21, 0x00, 0x1B, 0x45, 0x00})
	writeEscPosText(&b, line("Pago:", fmt.Sprintf("$%.2f", r.Pago), width))
	writeEscPosText(&b, line("Cambio:", fmt.Sprintf("$%.2f", r.Cambio), width))
	writeEscPosText(&b, strings.Repeat("-", width)+"\n")
	b.Write([]byte{0x1B, 0x61, 0x01})
	if len(r.LeyendaGrupos) > 0 {
		for index, group := range r.LeyendaGrupos {
			if index > 0 {
				b.Write([]byte{0x1B, 0x45, 0x00})
				writeEscPosText(&b, strings.Repeat("-", width)+"\n")
			}
			b.Write([]byte{0x1B, 0x45, boolByte(group.Bold)})
			if text := strings.TrimSpace(group.Text); text != "" {
				writeEscPosText(&b, wrapReceiptText(text, width)+"\n")
			}
		}
		b.Write([]byte{0x1B, 0x45, 0x00})
	} else {
		for _, legend := range r.Leyendas {
			if strings.TrimSpace(legend) != "" {
				writeEscPosText(&b, wrapReceiptText(legend, width)+"\n")
			}
		}
	}
	writeEscPosText(&b, "\n\n\n")
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
