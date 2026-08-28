package renders

import "testing"

func TestAmountInSpanishMXN(t *testing.T) {
	tests := map[float64]string{
		0:          "CERO PESOS 00/100 M.N.",
		21.05:      "VEINTIUN PESOS 05/100 M.N.",
		3855.84:    "TRES MIL OCHOCIENTOS CINCUENTA Y CINCO PESOS 84/100 M.N.",
		1_000_001:  "UN MILLON UN PESOS 00/100 M.N.",
		21_000_000: "VEINTIUN MILLONES PESOS 00/100 M.N.",
	}
	for value, expected := range tests {
		if actual := amountInSpanishMXN(value); actual != expected {
			t.Errorf("amountInSpanishMXN(%v) = %q; esperado %q", value, actual, expected)
		}
	}
}
