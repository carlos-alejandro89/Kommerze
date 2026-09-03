package dto

import "time"

type TransferenciaProductoDto struct {
	NivelGuid    string  `json:"nivelGuid"`
	Codigo       string  `json:"codigo"`
	Producto     string  `json:"producto"`
	UnidadMedida string  `json:"unidadMedida"`
	Cantidad     float64 `json:"cantidad"`
	PrecioVenta  float64 `json:"precioVenta"`
	Descuento    float64 `json:"descuento"`
	Importe      float64 `json:"importe"`
}

// TransferenciaDto contiene la información de seguimiento de un traspaso entre
// sucursales. Los importes se exponen como float64 para simplificar el contrato
// JSON consumido por el WebView.
type TransferenciaDto struct {
	TraspasoGuid        string                     `json:"traspasoGuid"`
	PedidoGuid          string                     `json:"pedidoGuid"`
	Folio               string                     `json:"folio"`
	SucursalOrigenGuid  string                     `json:"sucursalOrigenGuid"`
	SucursalDestinoGuid string                     `json:"sucursalDestinoGuid"`
	SucursalOrigen      string                     `json:"sucursalOrigen"`
	SucursalDestino     string                     `json:"sucursalDestino"`
	FechaEnvio          time.Time                  `json:"fechaEnvio"`
	FechaRecepcion      *time.Time                 `json:"fechaRecepcion"`
	EstatusGuid         string                     `json:"estatusGuid"`
	Estatus             string                     `json:"estatus"`
	TotalProductos      int64                      `json:"totalProductos"`
	UnidadesTotales     float64                    `json:"unidadesTotales"`
	ValorTotal          float64                    `json:"valorTotal"`
	Comentarios         string                     `json:"comentarios"`
	Productos           []TransferenciaProductoDto `json:"productos" gorm:"-"`
}
