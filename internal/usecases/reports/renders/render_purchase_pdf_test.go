package renders

import (
	"os"
	"testing"
	"time"

	"BitComercio/internal/usecases/reports/models"
)

func TestRenderPurchasePDF(t *testing.T) {
	if logo, err := os.ReadFile("../../../../frontend/public/media/kommerze-logo-horizontal.png"); err == nil {
		SetKommerzeHorizontalLogo(logo)
	}
	documentDate := time.Date(2026, 8, 4, 0, 0, 0, 0, time.Local)
	report := models.PurchaseReport{
		Folio: "CP-000123", Proveedor: "Distribuidora del Sureste, S.A. de C.V.", RFCProveedor: "DSU0503218J2",
		RegimenProveedor: "601 - General de Ley Personas Morales", TelefonoProveedor: "993 123 4567",
		CorreoProveedor: "ventas@distribuidorasur.com", CodigoPostalProveedor: "86035",
		FechaCompra: time.Date(2026, 8, 4, 9, 15, 23, 0, time.Local), FechaDocumento: &documentDate,
		FolioFactura: "FA-0001234", UUIDFiscal: "D2A6F3C8-9B1E-4F02-8D2A-0F5E3C9B7A11",
		Items: []models.PurchaseReportItem{
			{Codigo: "ART-001", Descripcion: "Pintura vinílica profesional blanco 19L", Unidad: "Pieza", Cantidad: 2, PrecioCompra: 1077.59, Impuestos: 344.83, ImporteCompra: 2500, PrecioVenta: 1500, ImporteVenta: 3000},
			{Codigo: "ART-002", Descripcion: "Brocha profesional 4 pulgadas", Unidad: "Pieza", Cantidad: 3, PrecioCompra: 58.62, Impuestos: 9.38, ImporteCompra: 204, PrecioVenta: 116, ImporteVenta: 348},
			{Codigo: "ART-003", Descripcion: "Rodillo profesional 9 pulgadas", Unidad: "Pieza", Cantidad: 3, PrecioCompra: 81.90, Impuestos: 13.10, ImporteCompra: 285, PrecioVenta: 140, ImporteVenta: 420},
		},
		SubtotalCompra: 2566.28, ImpuestosCompra: 422.72, TotalCompra: 2989, TotalVenta: 3768,
		Notas: "Compra registrada conforme a la información del documento del proveedor.",
	}
	pdf, err := RenderPurchasePDF(report)
	if err != nil {
		t.Fatal(err)
	}
	if len(pdf) < 1000 {
		t.Fatalf("PDF demasiado pequeño: %d bytes", len(pdf))
	}
	if path := os.Getenv("PURCHASE_PDF_QA_PATH"); path != "" {
		if err := os.WriteFile(path, pdf, 0o644); err != nil {
			t.Fatal(err)
		}
	}
}
