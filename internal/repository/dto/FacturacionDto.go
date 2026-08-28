package dto

import "time"

type FacturacionCatalogoDto struct {
	ID          uint   `json:"ID"`
	Guid        string `json:"Guid"`
	Clave       string `json:"Clave"`
	Descripcion string `json:"Descripcion"`
}

type FacturacionEntidadDto struct {
	ID           uint   `json:"ID"`
	Guid         string `json:"Guid"`
	RFC          string `json:"RFC"`
	RazonSocial  string `json:"RazonSocial"`
	CodigoPostal string `json:"CodigoPostal"`
	RegimenClave string `json:"RegimenClave"`
	Regimen      string `json:"Regimen"`
}

type FacturacionConceptoDto struct {
	Codigo       string  `json:"Codigo"`
	Descripcion  string  `json:"Descripcion"`
	Unidad       string  `json:"Unidad"`
	Cantidad     float64 `json:"Cantidad"`
	PrecioConIVA float64 `json:"PrecioConIVA"`
	Descuento    float64 `json:"Descuento"`
	Total        float64 `json:"Total"`
}

type FacturacionPreparacionDto struct {
	PedidoGuid              string                   `json:"PedidoGuid"`
	Folio                   int                      `json:"Folio"`
	Serie                   string                   `json:"Serie"`
	Fecha                   time.Time                `json:"Fecha"`
	Cliente                 string                   `json:"Cliente"`
	Entidades               []FacturacionEntidadDto  `json:"Entidades"`
	UsosCFDI                []FacturacionCatalogoDto `json:"UsosCFDI"`
	FormasPago              []FacturacionCatalogoDto `json:"FormasPago"`
	MetodosPago             []FacturacionCatalogoDto `json:"MetodosPago"`
	FormaPagoPredominanteID uint                     `json:"FormaPagoPredominanteID"`
	MetodoPagoSugeridoID    uint                     `json:"MetodoPagoSugeridoID"`
	Conceptos               []FacturacionConceptoDto `json:"Conceptos"`
	Subtotal                float64                  `json:"Subtotal"`
	Descuentos              float64                  `json:"Descuentos"`
	Impuestos               float64                  `json:"Impuestos"`
	Total                   float64                  `json:"Total"`
}

type EmitirFacturacionRequestDto struct {
	PedidoGuid      string `json:"pedidoGuid"`
	EntidadFiscalID uint   `json:"entidadFiscalID"`
	UsoCFDIID       uint   `json:"usoCFDIID"`
	FormaPagoID     uint   `json:"formaPagoID"`
	MetodoPagoID    uint   `json:"metodoPagoID"`
}

type EnviarFacturaEmailRequestDto struct {
	PedidoGuid    string   `json:"pedidoGuid"`
	Destinatarios []string `json:"destinatarios"`
}

type FacturacionResultadoDto struct {
	Success     bool   `json:"success"`
	Mensaje     string `json:"mensaje"`
	UUID        string `json:"uuid,omitempty"`
	PDFBase64   string `json:"pdfBase64,omitempty"`
	PDFFileName string `json:"pdfFileName,omitempty"`
	Data        any    `json:"data,omitempty"`
}
