package dto

type CrearCompraDto struct {
	SucursalID      uint                `json:"sucursalID"`
	ProveedorGuid   string              `json:"proveedorGuid"`
	OrigenCaptura   string              `json:"origenCaptura"`
	UUIDFiscal      string              `json:"uuidFiscal"`
	FolioFactura    string              `json:"folioFactura"`
	FechaFactura    string              `json:"fechaFactura"`
	FechaTimbrado   string              `json:"fechaTimbrado"`
	Moneda          string              `json:"moneda"`
	TipoComprobante string              `json:"tipoComprobante"`
	MetodoPago      string              `json:"metodoPago"`
	Subtotal        float64             `json:"subtotal"`
	Descuento       float64             `json:"descuento"`
	Impuestos       float64             `json:"impuestos"`
	Total           float64             `json:"total"`
	Productos       []CompraProductoDto `json:"productos"`
}

type CompraProductoDto struct {
	NivelGuid string  `json:"nivelGuid"`
	Cantidad  float64 `json:"cantidad"`
	Costo     float64 `json:"costo"`
}

type CompraCreadaDto struct {
	PedidoGuid string `json:"pedidoGuid"`
	CompraGuid string `json:"compraGuid"`
	Folio      int    `json:"folio"`
}
