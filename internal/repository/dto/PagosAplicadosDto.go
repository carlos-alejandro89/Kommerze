package dto

type PagosAplicadosDto struct {
	ID         int    `json:"ID"`
	Nombre     string `json:"Nombre"`
	Monto      string `json:"Monto"`
	Referencia string `json:"Referencia"`
}
