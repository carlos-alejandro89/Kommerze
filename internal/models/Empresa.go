package models

type Empresa struct {
	BaseModel

	NombreComercial string `gorm:"size:150"`
	RazonSocial     string `gorm:"size:150"`
	RFC             string `gorm:"size:13"`
	Calle           string `gorm:"size:150"`
	Exterior        string `gorm:"size:20"`
	Interior        string `gorm:"size:20"`
	Colonia         string `gorm:"size:150"`
	Ciudad          string `gorm:"size:150"`
	Estado          string `gorm:"size:100"`
	CodigoPostal    string `gorm:"size:5"`
	Telefono        string `gorm:"size:20"`
	Correo          string `gorm:"size:200"`
	Logo            string `gorm:"type:text"`

	// Configuración de facturación
	RegimenFiscalID *uint
	RegimenFiscal   SATRegimenFiscal `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`

	// Certificados
	Certificado string `gorm:"type:text"`
	Llave       string `gorm:"type:text"`
	Password    string `gorm:"size:50"`

	Sync bool `gorm:"default:false"`
}

func (Empresa) TableName() string {
	return "empresas"
}
