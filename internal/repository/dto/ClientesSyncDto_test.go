package dto

import (
	"encoding/json"
	"testing"
)

func TestSyncTimeAcceptsDotNetDateWithoutTimezone(t *testing.T) {
	var value SyncTime
	if err := json.Unmarshal([]byte(`"2026-08-12T16:02:07"`), &value); err != nil {
		t.Fatalf("fecha válida sin zona rechazada: %v", err)
	}
	if value.Year() != 2026 {
		t.Fatalf("año inesperado: %d", value.Year())
	}
}

func TestSyncTimeTreatsDotNetMinValueAsMissing(t *testing.T) {
	var value SyncTime
	if err := json.Unmarshal([]byte(`"0001-01-01T00:00:00"`), &value); err != nil {
		t.Fatalf("DateTime.MinValue no debe fallar: %v", err)
	}
	if !value.IsZero() {
		t.Fatalf("se esperaba fecha vacía, se obtuvo %v", value.Time)
	}
}
