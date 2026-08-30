package renders

import (
	"os"
	"strings"
	"testing"
	"time"

	"BitComercio/internal/usecases/reports/models"
)

func TestRenderInvoicePDF(t *testing.T) {
	if logo, err := os.ReadFile("../../../../frontend/public/media/kommerze-logo-horizontal.png"); err == nil {
		SetKommerzeHorizontalLogo(logo)
	}
	longSeal := strings.Repeat("ABCdef0123456789/+=", 28)
	report := models.Invoice{Serie: "A", Folio: "1049", UUID: "550e8400-e29b-41d4-a716-446655440000", FechaEmision: time.Date(2026, 8, 28, 13, 46, 0, 0, time.FixedZone("CDMX", -6*3600)), FechaTimbrado: time.Date(2026, 8, 28, 13, 47, 51, 0, time.FixedZone("CDMX", -6*3600)), NombreComercial: "TIENDA SAYER", Emisor: "PINTURAS DEL SURESTE SA DE CV", RFCEmisor: "AAA010101AAA", RegimenEmisor: "601 - General de Ley Personas Morales", LugarExpedicion: "86270", Sucursal: "OCUILTZAPOTLAN", Direccion: "Mariano Abasolo esq. Aldama, Centro, Tabasco, C.P. 86270", Telefono: "9933170552", Correo: "ocuiltzapotlan@empresa.com", Receptor: "COMPAÑIA ADMINISTRADORA INTEGRAL DE BIENES MUEBLES DEL SURESTE", RFCReceptor: "XAXX010101000", RegimenReceptor: "616 - Sin obligaciones fiscales", DomicilioReceptor: "86270", UsoCFDI: "S01 - Sin efectos fiscales", MetodoPago: "PUE - Pago en una sola exhibicion", FormaPago: "01 - Efectivo", CertificadoEmisor: "00001000000500000001", CertificadoSAT: "00001000000500000000", SelloEmisor: longSeal, SelloSAT: "SAT" + longSeal, CadenaOriginalSAT: "||1.1|550e8400-e29b-41d4-a716-446655440000|2026-08-28T13:47:51|" + longSeal + "||", Subtotal: 3324, Impuestos: 531.84, Total: 3855.84, Items: []models.InvoiceItem{{Codigo: "MAG-0300", ClaveSAT: "31211500", Descripcion: "MAGICOLOR 0300 PINTURA VINILICA", Unidad: "19 LITROS", Cantidad: 2, PrecioUnitario: 1425, Impuestos: 456, Importe: 2850}, {Codigo: "BRO-004", ClaveSAT: "31211904", Descripcion: "BROCHA PROFESIONAL 4 PULGADAS", Unidad: "PIEZA", Cantidad: 1, PrecioUnitario: 68.10, Impuestos: 10.90, Importe: 68.10}}}
	pdf, err := RenderInvoicePDF(report)
	if err != nil {
		t.Fatal(err)
	}
	if len(pdf) < 5000 {
		t.Fatalf("PDF demasiado pequeño: %d", len(pdf))
	}
	if path := os.Getenv("INVOICE_PDF_QA_PATH"); path != "" {
		if err = os.WriteFile(path, pdf, 0644); err != nil {
			t.Fatal(err)
		}
	}
}
