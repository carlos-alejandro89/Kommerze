package renders

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/color"
	"image/png"
	"strings"
	"testing"

	"BitComercio/internal/usecases/reports/models"
)

func TestRenderReceiptEscPosIncludesConfiguredLogoAndBranchDetails(t *testing.T) {
	var logo bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 4, 2))
	for y := 0; y < 2; y++ {
		for x := 0; x < 4; x++ {
			img.Set(x, y, color.Black)
		}
	}
	if err := png.Encode(&logo, img); err != nil {
		t.Fatal(err)
	}
	receipt := models.Receipt{
		Negocio: "Kommerze", Sucursal: "Centro", MostrarSucursal: true,
		Logo: base64.StdEncoding.EncodeToString(logo.Bytes()), MostrarLogo: true,
		Direccion: "Av. Reforma 123", MostrarDireccion: true,
		Telefono: "9931234567", MostrarTelefono: true,
		Correo: "centro@kommerze.mx", MostrarCorreo: true,
	}
	output := RenderReceiptEscPos(receipt, 80, false, false)
	if !bytes.Contains(output, []byte{0x1D, 0x76, 0x30, 0x00}) {
		t.Fatal("receipt must include the ESC/POS raster logo command")
	}
	encoded := string(output)
	for _, expected := range []string{"Centro", "Av. Reforma 123", "9931234567", "centro@kommerze.mx"} {
		if !strings.Contains(encoded, expected) {
			t.Fatalf("receipt must include branch detail %q", expected)
		}
	}
}

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

func TestRenderReceiptEscPosUsesThousandsSeparatorsForMoney(t *testing.T) {
	receipt := models.Receipt{
		Negocio:  "Kommerze",
		Subtotal: 1234567.89,
		Total:    1234567.89,
		Pago:     2000000,
		Cambio:   765432.11,
	}

	output := string(RenderReceiptEscPos(receipt, 80, false, false))
	for _, expected := range []string{"$1,234,567.89", "$2,000,000.00", "$765,432.11"} {
		if !strings.Contains(output, expected) {
			t.Fatalf("expected formatted amount %q in receipt", expected)
		}
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
