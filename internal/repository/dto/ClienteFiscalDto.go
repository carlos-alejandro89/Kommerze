package dto

type EntidadFiscalClienteDto struct {
	ID           uint   `json:"ID"`
	Guid         string `json:"Guid"`
	RegimenID    *uint  `json:"RegimenID"`
	RegimenClave string `json:"RegimenClave"`
	Regimen      string `json:"Regimen"`
	RazonSocial  string `json:"RazonSocial"`
	RFC          string `json:"RFC"`
	CodigoPostal string `json:"CodigoPostal"`
	Correo       string `json:"Correo"`
	Telefono     string `json:"Telefono"`
	Whatsapp     string `json:"Whatsapp"`
	RolFiscal    string `json:"RolFiscal"`
}

type ClienteDetalleDto struct {
	ClienteDto
	Whatsapp          string                    `json:"Whatsapp"`
	Puntos            int                       `json:"Puntos"`
	EntidadesFiscales []EntidadFiscalClienteDto `json:"EntidadesFiscales"`
}

type GuardarEntidadFiscalClienteDto struct {
	Guid         string `json:"Guid"`
	RegimenID    *uint  `json:"RegimenID"`
	RazonSocial  string `json:"RazonSocial"`
	RFC          string `json:"RFC"`
	CodigoPostal string `json:"CodigoPostal"`
	Correo       string `json:"Correo"`
	Telefono     string `json:"Telefono"`
	Whatsapp     string `json:"Whatsapp"`
}

type GuardarClienteDto struct {
	Guid              string                           `json:"Guid"`
	RazonSocial       string                           `json:"RazonSocial"`
	Correo            string                           `json:"Correo"`
	Telefono          string                           `json:"Telefono"`
	Whatsapp          string                           `json:"Whatsapp"`
	CreditoMaximo     float64                          `json:"CreditoMaximo"`
	DiasCredito       int                              `json:"DiasCredito"`
	Puntos            int                              `json:"Puntos"`
	EntidadesFiscales []GuardarEntidadFiscalClienteDto `json:"EntidadesFiscales"`
}
