package dto

// CotizacionItemDto representa un item de la cotizacion para mostrar en los modales.
type CotizacionItemDto struct {
	NivelGuid   string  `json:"nivelGuid"`
	NivelCodigo string  `json:"nivelCodigo"`
	Producto    string  `json:"producto"`
	Cantidad    float64 `json:"cantidad"`
	PrecioVenta float64 `json:"precioVenta"`
	Descuento   float64 `json:"descuento"`
	Subtotal    float64 `json:"subtotal"`
}

// CotizacionDetalleDto contiene toda la informacion de una cotizacion para los modales.
type CotizacionDetalleDto struct {
	ID                    uint                `json:"ID"`
	PedidoGuid            string              `json:"PedidoGuid"`
	Folio                 int                 `json:"Folio"`
	Fecha                 string              `json:"Fecha"`
	RazonSocial           string              `json:"RazonSocial"`
	EstatusAutorizacion   string              `json:"EstatusAutorizacion"`
	DescuentosSolicitados []ItemDescuentoDto  `json:"DescuentosSolicitados"`
	DescuentosAutorizados []ItemDescuentoDto  `json:"DescuentosAutorizados"`
	AutorizadoPor         string              `json:"AutorizadoPor"`
	ObsAutorizacion       string              `json:"ObsAutorizacion"`
	Items                 []CotizacionItemDto `json:"Items"`
	Subtotal              float64             `json:"Subtotal"`
	TotalDescuento        float64             `json:"TotalDescuento"`
	Total                 float64             `json:"Total"`
}
