package services

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/shopspring/decimal"
)

func TestCalculateSATLineKeepsConceptAndTaxInsideSATBounds(t *testing.T) {
	cases := []struct {
		quantity, price, discount, rate string
	}{
		{"1", "10.00", "0", "16"},
		{"3", "10.00", "0", "16"},
		{"2.5", "1653.00", "7.5", "16"},
		{"1", "0.01", "0", "16"},
	}
	for _, tc := range cases {
		result, err := calculateSATLine(decimal.RequireFromString(tc.quantity), decimal.RequireFromString(tc.price), decimal.RequireFromString(tc.discount), decimal.RequireFromString(tc.rate))
		if err != nil {
			t.Fatalf("calculateSATLine(%+v): %v", tc, err)
		}
		if !satInRange(result.Amount, result.AmountLower, result.AmountUpper) {
			t.Fatalf("importe %s fuera de [%s,%s]", result.Amount, result.AmountLower, result.AmountUpper)
		}
		if !satInRange(result.TaxAmount, result.TaxLower, result.TaxUpper) {
			t.Fatalf("impuesto %s fuera de [%s,%s]", result.TaxAmount, result.TaxLower, result.TaxUpper)
		}
	}
}

func TestSaveStampedXMLDecodesBase64(t *testing.T) {
	folder := t.TempDir()
	expected := []byte(`<?xml version="1.0"?><cfdi:Comprobante/>`)
	path, err := saveStampedXML(folder, "A", 1049, "uuid-prueba", base64.StdEncoding.EncodeToString(expected))
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Dir(path) != folder {
		t.Fatalf("ruta fuera de la carpeta configurada: %s", path)
	}
	actual, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(actual) != string(expected) {
		t.Fatalf("XML guardado = %q", actual)
	}
}

func TestParseStampDateAcceptsProviderUSFormat(t *testing.T) {
	got, err := parseStampDate("08/28/2026 13:47:51")
	if err != nil {
		t.Fatal(err)
	}
	if want := "2026-08-28T13:47:51-06:00"; got.Format(time.RFC3339) != want {
		t.Fatalf("fecha timbrado = %q, want %q", got.Format(time.RFC3339), want)
	}
}

func TestFechaFacturacionUsesMexicoCityAndSubtractsOneMinute(t *testing.T) {
	fechaVenta := time.Date(2026, time.August, 24, 16, 30, 0, 0, time.UTC)
	got, err := fechaFacturacion(fechaVenta)
	if err != nil {
		t.Fatal(err)
	}
	if want := "2026-08-24T10:29:00-06:00"; got != want {
		t.Fatalf("fecha CFDI = %q, want %q", got, want)
	}
}

func TestSATHeaderTotalsAreRoundedOnlyAfterAggregation(t *testing.T) {
	line, err := calculateSATLine(decimal.NewFromInt(3), decimal.NewFromInt(10), decimal.Zero, decimal.NewFromInt(16))
	if err != nil {
		t.Fatal(err)
	}
	if got := satCurrency(line.Amount).StringFixed(2); got != "25.86" {
		t.Fatalf("subtotal: %s", got)
	}
	if got := satCurrency(line.TaxAmount).StringFixed(2); got != "4.14" {
		t.Fatalf("IVA: %s", got)
	}
	if got := satCurrency(line.Amount.Sub(line.Discount).Add(line.TaxAmount)).StringFixed(2); got != "30.00" {
		t.Fatalf("total: %s", got)
	}
}

func TestCalculateSATInvoiceDoesNotInventDiscounts(t *testing.T) {
	result, err := calculateSATInvoice([]satSaleLineInput{{
		Quantity: decimal.NewFromInt(3), GrossUnit: decimal.NewFromInt(10),
		DiscountPercent: decimal.Zero, TaxRate: decimal.NewFromInt(16),
	}})
	if err != nil {
		t.Fatal(err)
	}
	if !result.Discounts.IsZero() || !result.Lines[0].Discount.IsZero() {
		t.Fatalf("se agregó un descuento inexistente: encabezado=%s concepto=%s", result.Discounts, result.Lines[0].Discount)
	}
}

func TestCalculateSATInvoicePreservesCommercialTotal1984(t *testing.T) {
	result, err := calculateSATInvoice([]satSaleLineInput{{
		Quantity: decimal.NewFromInt(1), GrossUnit: decimal.RequireFromString("1984.00"),
		DiscountPercent: decimal.Zero, TaxRate: decimal.NewFromInt(16),
	}})
	if err != nil {
		t.Fatal(err)
	}
	if got := result.Total.StringFixed(2); got != "1984.00" {
		t.Fatalf("total fiscal=%s; esperado 1984.00", got)
	}
	if !result.Discounts.IsZero() || !result.Lines[0].Discount.IsZero() {
		t.Fatalf("se agregó un descuento inexistente: encabezado=%s concepto=%s", result.Discounts, result.Lines[0].Discount)
	}
}
