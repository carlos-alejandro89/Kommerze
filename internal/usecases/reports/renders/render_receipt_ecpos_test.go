package renders

import (
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

func TestWrapReceiptTextHonorsColumnWidth(t *testing.T) {
	wrapped := wrapReceiptText("Artículo electrónico con descripción deliberadamente extensa", 32)
	for _, line := range strings.Split(wrapped, "\n") {
		if len([]rune(line)) > 32 {
			t.Fatalf("line exceeds 32 columns: %q", line)
		}
	}
}
