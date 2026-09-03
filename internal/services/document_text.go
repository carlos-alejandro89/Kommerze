package services

import "strings"

func cleanDocumentText(value string) string {
	value = strings.TrimSpace(value)
	lower := strings.ToLower(value)
	for _, marker := range []string{"<nil>", "<null>", "null"} {
		if lower == marker || strings.Contains(lower, marker) {
			return ""
		}
	}
	return value
}
