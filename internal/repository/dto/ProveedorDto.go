package dto

type ProveedorFiscalDto struct {
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
	EsProveedor  bool   `json:"EsProveedor"`
}

type GuardarProveedorDto struct {
	RolFiscalGuid string `json:"RolFiscalGuid"`
	EntidadGuid   string `json:"EntidadGuid"`
	RegimenID     *uint  `json:"RegimenID"`
	RazonSocial   string `json:"RazonSocial"`
	RFC           string `json:"RFC"`
	CodigoPostal  string `json:"CodigoPostal"`
	Correo        string `json:"Correo"`
	Telefono      string `json:"Telefono"`
	Whatsapp      string `json:"Whatsapp"`
}
