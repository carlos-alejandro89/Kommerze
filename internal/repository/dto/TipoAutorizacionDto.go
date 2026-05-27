package dto

// TipoAutorizacionDto representa un tipo de autorización disponible en el sistema.
type TipoAutorizacionDto struct {
	ID          uint   `json:"ID"`
	Guid        string `json:"Guid"`
	Descripcion string `json:"Descripcion"`
}

// TiposAutorizacion es el catálogo fijo de tipos de autorización reconocidos por el cloud.
// Mantener sincronizado con la tabla tipos_autorizacion del cloud.
var TiposAutorizacion = []TipoAutorizacionDto{
	{ID: 1, Guid: "e57b32c1-d9a4-4638-b02f-f481c7e93da0", Descripcion: "Descuento Especial"},
	{ID: 2, Guid: "7b4f81a2-92e6-4c7b-a1d5-83fb2946c0e8", Descripcion: "Baja de mercancia"},
	{ID: 3, Guid: "1f3e5b7a-9c2d-408b-a5f6-2d7c4b9e1a83", Descripcion: "Cambio de producto a Cliente"},
	{ID: 4, Guid: "c8a2b5d4-e1f0-4963-bc78-5d2a9f4e6b13", Descripcion: "Consumo interno"},
}
