package dto

type AuditoriaConteoWsDto struct {
	GuidAuditoria string  `json:"guidAuditoria"`
	GuidNivel     string  `json:"guidNivel"`
	Conteo        float64 `json:"conteo"`
	Channel       string  `json:"channel"`
}
