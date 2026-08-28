package renders

import (
	"fmt"
	"math"
	"strings"
)

// amountInSpanishMXN converts a monetary value to the wording commonly used
// in Mexican fiscal documents, preserving cents as NN/100 M.N.
func amountInSpanishMXN(value float64) string {
	centsTotal := int64(math.Round(math.Abs(value) * 100))
	whole, cents := centsTotal/100, centsTotal%100
	words := apocopateOne(integerInSpanish(whole))
	if value < 0 {
		words = "MENOS " + words
	}
	currency := "PESOS"
	if whole == 1 {
		currency = "PESO"
	}
	return fmt.Sprintf("%s %s %02d/100 M.N.", words, currency, cents)
}

func integerInSpanish(value int64) string {
	if value == 0 {
		return "CERO"
	}
	groups := []struct {
		value int64
		one   string
		many  string
	}{
		{1_000_000_000_000, "UN BILLON", "BILLONES"},
		{1_000_000, "UN MILLON", "MILLONES"},
		{1_000, "MIL", "MIL"},
	}
	parts := make([]string, 0, 4)
	rest := value
	for _, group := range groups {
		if rest < group.value {
			continue
		}
		quantity := rest / group.value
		rest %= group.value
		if quantity == 1 {
			parts = append(parts, group.one)
		} else {
			parts = append(parts, apocopateOne(integerInSpanish(quantity))+" "+group.many)
		}
	}
	if rest > 0 {
		parts = append(parts, underThousandInSpanish(int(rest)))
	}
	return strings.Join(parts, " ")
}

func underThousandInSpanish(value int) string {
	if value == 100 {
		return "CIEN"
	}
	hundreds := []string{"", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"}
	parts := make([]string, 0, 2)
	if value >= 100 {
		parts = append(parts, hundreds[value/100])
		value %= 100
	}
	if value > 0 {
		parts = append(parts, underHundredInSpanish(value))
	}
	return strings.Join(parts, " ")
}

func underHundredInSpanish(value int) string {
	units := []string{"", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"}
	special := map[int]string{10: "DIEZ", 11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE", 16: "DIECISEIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE", 20: "VEINTE", 21: "VEINTIUNO", 22: "VEINTIDOS", 23: "VEINTITRES", 24: "VEINTICUATRO", 25: "VEINTICINCO", 26: "VEINTISEIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE"}
	if value < 10 {
		return units[value]
	}
	if word, ok := special[value]; ok {
		return word
	}
	tens := []string{"", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"}
	if value%10 == 0 {
		return tens[value/10]
	}
	return tens[value/10] + " Y " + units[value%10]
}

func apocopateOne(value string) string {
	if strings.HasSuffix(value, "VEINTIUNO") {
		return strings.TrimSuffix(value, "VEINTIUNO") + "VEINTIUN"
	}
	if strings.HasSuffix(value, " Y UNO") {
		return strings.TrimSuffix(value, " UNO") + " UN"
	}
	if strings.HasSuffix(value, " UNO") {
		return strings.TrimSuffix(value, " UNO") + " UN"
	}
	if value == "UNO" {
		return "UN"
	}
	return value
}
