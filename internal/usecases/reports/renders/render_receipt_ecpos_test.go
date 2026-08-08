package renders

import (
	"bytes"
	"strings"
	"testing"

	"BitComercio/internal/usecases/reports/models"
)

func TestRenderReceiptEscPosUsesConfiguredPaperWidth(t *testing.T) {
	receipt := models.Receipt{Negocio: "Kommerze"}

	for _, test := range []struct {
		name    string
		widthMM int
		columns int
	}{
		{name: "80 mm", widthMM: 80, columns: 42},
		{name: "58 mm", widthMM: 58, columns: 32},
	} {
		t.Run(test.name, func(t *testing.T) {
			output := string(RenderReceiptEscPos(receipt, test.widthMM, true, false))
			separator := strings.Repeat("-", test.columns) + "\n"
			if !strings.Contains(output, separator) {
				t.Fatalf("expected a %d-column separator", test.columns)
			}
		})
	}
}

func TestRenderReceiptEscPosEncodesSpanishTextAsWindows1252(t *testing.T) {
	receipt := models.Receipt{
		Negocio: "Comercio México",
		LeyendaGrupos: []models.ReceiptLegendGroup{
			{Text: "No hay devolución en artículos electrónicos"},
		},
	}

	output := RenderReceiptEscPos(receipt, 80, false, false)
	for _, expected := range [][]byte{[]byte("devoluci\xf3n"), []byte("art\xedculos"), []byte("electr\xf3nicos")} {
		if !bytes.Contains(output, expected) {
			t.Fatalf("expected Windows-1252 encoded text; output does not contain %v", expected)
		}
	}
	if bytes.Contains(output, []byte("devolución")) {
		t.Fatal("receipt must not send UTF-8 multibyte text to the ESC/POS code page")
	}
}

func TestRenderReceiptEscPosOptionalPeripheralCommands(t *testing.T) {
	receipt := models.Receipt{Negocio: "Kommerze"}
	cutCommand := string([]byte{0x1D, 0x56, 0x01})
	drawerCommand := string([]byte{0x1B, 0x70, 0x00, 0x19, 0xFA})

	withoutPeripherals := string(RenderReceiptEscPos(receipt, 80, false, false))
	if strings.Contains(withoutPeripherals, cutCommand) || strings.Contains(withoutPeripherals, drawerCommand) {
		t.Fatal("peripheral commands must not be emitted when disabled")
	}

	withPeripherals := string(RenderReceiptEscPos(receipt, 80, true, true))
	if !strings.Contains(withPeripherals, cutCommand) {
		t.Fatal("expected paper cut command")
	}
	if !strings.Contains(withPeripherals, drawerCommand) {
		t.Fatal("expected cash drawer pulse command")
	}
}

func TestRenderReceiptEscPosSelectsFontA(t *testing.T) {
	output := RenderReceiptEscPos(models.Receipt{Negocio: "Kommerze"}, 80, false, false)
	fontACommand := []byte{0x1B, 0x4D, 0x00}
	if !bytes.Contains(output, fontACommand) {
		t.Fatal("expected ESC/POS Font A selection command")
	}
}

func TestWrapReceiptTextHonorsColumnWidth(t *testing.T) {
	wrapped := wrapReceiptText("Artículo electrónico con descripción deliberadamente extensa", 32)
	for _, line := range strings.Split(wrapped, "\n") {
		if len([]rune(line)) > 32 {
			t.Fatalf("line exceeds 32 columns: %q", line)
		}
	}
}
