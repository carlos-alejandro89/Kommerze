package models

// SatMotivosCancelacion contiene los motivos oficiales del SAT permitidos para
// cancelar un CFDI. El catálogo será alimentado posteriormente por Sync.
type SatMotivosCancelacion struct {
	BaseModel
	CveMotivo                string `gorm:"size:10;not null;" json:"CveMotivo"`
	MotivoCancelacion        string `gorm:"size:250;not null" json:"MotivoCancelacion"`
	RequiereFolioSustitucion bool   `gorm:"not null;default:false" json:"RequiereFolioSustitucion"`
}

func (SatMotivosCancelacion) TableName() string {
	return "sat_motivos_cancelacion"
}
