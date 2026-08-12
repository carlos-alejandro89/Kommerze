package renders

import (
	"os"
	"testing"
	"time"

	"BitComercio/internal/usecases/reports/models"
)

func TestRenderQuotationPDF(t *testing.T) {
	if logo, err := os.ReadFile("../../../../frontend/public/media/kommerze-logo-horizontal.png"); err == nil {
		SetKommerzeHorizontalLogo(logo)
	}
	q := models.Quotation{Folio: "COT-000001", Negocio: "KOMMERZE COMERCIAL", RFCNegocio: "KOM010101ABC",
		Sucursal: "Sucursal Centro", DireccionSucursal: "Av. Reforma 123, Centro, Villahermosa, Tabasco, 86000",
		TelefonoSucursal: "9931234567", CorreoSucursal: "centro@kommerze.mx", Asesor: "Carlos Alejandro",
		Cliente: "Comercializadora Martínez", RFCCliente: "CMA1203051K4", TelefonoCliente: "9939876543",
		CorreoCliente: "contacto@comercialmartinez.com", RegimenCliente: "601 - General de Ley Personas Morales",
		Fecha: time.Date(2026, 8, 11, 16, 0, 0, 0, time.Local), VigenciaDias: 15,
		Observaciones: "Precios sujetos a disponibilidad. Gracias por considerar nuestra propuesta.",
		Items: []models.QuotationItem{
			{Codigo: "ART-001", Descripcion: "Pintura vinílica profesional blanco 19 litros", Unidad: "Cubeta", Cantidad: 2, Precio: 1250, Importe: 2500},
			{Codigo: "ART-002", Descripcion: "Brocha profesional de cuatro pulgadas", Unidad: "Pieza", Cantidad: 3, Precio: 68, Descuento: 10, Importe: 194},
		}, Subtotal: 2704, Descuento: 10, Impuestos: 431.04, Total: 3125.04}
	pdf, err := RenderQuotationPDF(q)
	if err != nil {
		t.Fatal(err)
	}
	if len(pdf) < 1000 {
		t.Fatalf("PDF demasiado pequeño: %d bytes", len(pdf))
	}
	if path := os.Getenv("QUOTATION_PDF_QA_PATH"); path != "" {
		if err := os.WriteFile(path, pdf, 0o644); err != nil {
			t.Fatal(err)
		}
	}
}
