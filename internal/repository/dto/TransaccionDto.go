package dto

type TransaccionDto struct {
	ID               uint
	Folio            string
	Fecha            string
	EsCredito        bool
	RazonSocial      string
	Correo           string
	Telefono         string
	TipoOperacion    string
	Estatus          string
	MontoTransaccion float64
	EstatusAutorizacion string
	TipoPedidoID        uint
	PedidoGuid          string
}
