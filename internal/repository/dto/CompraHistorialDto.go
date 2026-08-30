package dto

type CompraHistorialDto struct {
	ID            uint
	PedidoGuid    string
	CompraGuid    string
	Folio         int
	Fecha         string
	Proveedor     string
	ProveedorRFC  string
	OrigenCaptura string
	FolioFactura  string
	UUIDFiscal    string
	Moneda        string
	Total         float64
	Estatus       string
}
