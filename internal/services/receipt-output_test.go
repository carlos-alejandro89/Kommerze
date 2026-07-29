package services

import (
	"strings"
	"testing"
	"time"

	reportmodels "BitComercio/internal/usecases/reports/models"
)

func TestReceiptEmailHTMLContainsSaleSummaryAndEscapesContent(t *testing.T) {
	body := receiptEmailHTML(reportmodels.Receipt{
		Negocio:  `Tienda <Centro>`,
		Folio:    "VTA-000123",
		Sucursal: "Principal",
		Fecha:    time.Date(2026, 7, 28, 16, 30, 0, 0, time.Local),
		Total:    125.50,
	})
	for _, expected := range []string{
		"Tienda &lt;Centro&gt;",
		"VTA-000123",
		"Principal",
		"$125.50 MXN",
		"comprobante completo",
	} {
		if !strings.Contains(body, expected) {
			t.Fatalf("el HTML no contiene %q", expected)
		}
	}
}

func TestFormatEmailFromUsesEncodedDisplayName(t *testing.T) {
	got := formatEmailFrom("Súper Tienda", "ventas@example.com")
	if !strings.Contains(got, "ventas@example.com") || !strings.Contains(got, "=?utf-8?") {
		t.Fatalf("remitente MIME inesperado: %s", got)
	}
}
