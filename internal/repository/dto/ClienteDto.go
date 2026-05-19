package dto

// ClienteDto es el DTO de búsqueda de clientes para el POS.
// Se usa en ServiceBuscarClientes y en el proxy de la Caja.
type ClienteDto struct {
	ID          uint   `json:"ID"`
	Guid        string `json:"Guid"`
	RazonSocial string `json:"RazonSocial"`
	RFC         string `json:"RFC"`
	Correo      string `json:"Correo"`
	Telefono    string `json:"Telefono"`
}
