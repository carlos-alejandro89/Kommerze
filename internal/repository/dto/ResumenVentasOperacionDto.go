package dto

import "time"

// VentaHoraDto representa el importe vendido dentro de una hora de la operación.
type VentaHoraDto struct {
	Hora  time.Time `json:"hora"`
	Total float64   `json:"total"`
}

// ActividadOperacionDto representa una operación comercial reciente.
type ActividadOperacionDto struct {
	Tipo    string    `json:"tipo"`
	Folio   int       `json:"folio"`
	Fecha   time.Time `json:"fecha"`
	Valor   float64   `json:"valor"`
	Detalle string    `json:"detalle"`
}

// ResumenVentasOperacionDto alimenta el indicador y la gráfica del menú principal.
type ResumenVentasOperacionDto struct {
	OperacionID uint                    `json:"operacionId"`
	FechaInicio time.Time               `json:"fechaInicio"`
	FechaFin    *time.Time              `json:"fechaFin"`
	Total       float64                 `json:"total"`
	Ventas      int64                   `json:"ventas"`
	PorHora     []VentaHoraDto          `json:"porHora"`
	Actividades []ActividadOperacionDto `json:"actividades"`
}
