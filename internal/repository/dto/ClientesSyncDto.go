package dto

import (
	"bytes"
	"encoding/json"
	"fmt"
	"time"
)

// SyncTime acepta fechas ISO-8601 emitidas por .NET tanto con zona horaria
// (RFC3339) como sin ella. Los DateTime.MinValue históricos se consideran
// fechas ausentes y se normalizan al persistir en el POS.
type SyncTime struct{ time.Time }

func (value *SyncTime) UnmarshalJSON(data []byte) error {
	if bytes.Equal(data, []byte("null")) {
		value.Time = time.Time{}
		return nil
	}
	var raw string
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	if raw == "" {
		value.Time = time.Time{}
		return nil
	}
	for _, layout := range []string{time.RFC3339Nano, "2006-01-02T15:04:05.9999999", "2006-01-02T15:04:05"} {
		if parsed, err := time.Parse(layout, raw); err == nil {
			if parsed.Year() <= 1 {
				value.Time = time.Time{}
			} else {
				value.Time = parsed.UTC()
			}
			return nil
		}
	}
	return fmt.Errorf("fecha de sincronización inválida %q", raw)
}

type ClientesSyncDto struct {
	Clientes             []ClienteSyncItemDto              `json:"clientes"`
	EntidadesFiscales    []EntidadFiscalSyncItemDto        `json:"entidadesFiscales"`
	ClienteEntidadFiscal []ClienteEntidadFiscalSyncItemDto `json:"clienteEntidadFiscal"`
}

type ClienteSyncItemDto struct {
	Guid          string   `json:"guid"`
	RazonSocial   string   `json:"razonSocial"`
	Correo        string   `json:"correo"`
	Telefono      string   `json:"telefono"`
	CreditoMaximo float64  `json:"creditoMaximo"`
	DiasCredito   int      `json:"diasCredito"`
	CreatedAt     SyncTime `json:"createdAt"`
	UpdatedAt     SyncTime `json:"updatedAt"`
}
type EntidadFiscalSyncItemDto struct {
	Guid         string   `json:"guid"`
	RegimenGuid  *string  `json:"regimenGuid"`
	RazonSocial  string   `json:"razonSocial"`
	RFC          string   `json:"rfc"`
	CodigoPostal string   `json:"codigoPostal"`
	Correo       string   `json:"correo"`
	Telefono     string   `json:"telefono"`
	Whatsapp     string   `json:"whatsapp"`
	CreatedAt    SyncTime `json:"createdAt"`
	UpdatedAt    SyncTime `json:"updatedAt"`
}
type ClienteEntidadFiscalSyncItemDto struct {
	Guid              string   `json:"guid"`
	ClienteGuid       string   `json:"clienteGuid"`
	EntidadFiscalGuid string   `json:"entidadFiscalGuid"`
	CreatedAt         SyncTime `json:"createdAt"`
	UpdatedAt         SyncTime `json:"updatedAt"`
}
