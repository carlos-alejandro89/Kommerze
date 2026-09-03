package renders

import "strings"

// optionalText evita imprimir representaciones textuales de valores nulos que
// pueden llegar desde datos sincronizados o consultas antiguas.
func optionalText(value string) string {
	value = strings.TrimSpace(value)
	switch strings.ToLower(value) {
	case "<nil>", "nil", "null", "<null>":
		return ""
	default:
		return value
	}
}
