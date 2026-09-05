package dto

import "github.com/shopspring/decimal"

type ConversionProductoDto struct {
	ReglaID           uint            `json:"reglaId"`
	ReglaGuid         string          `json:"reglaGuid"`
	NivelOrigenID     uint            `json:"nivelOrigenId"`
	NivelOrigenGuid   string          `json:"nivelOrigenGuid"`
	CodigoOrigen      string          `json:"codigoOrigen"`
	ProductoOrigen    string          `json:"productoOrigen"`
	EmpaqueOrigen     string          `json:"empaqueOrigen"`
	ContenidoOrigen   float64         `json:"contenidoOrigen"`
	UnidadOrigen      string          `json:"unidadOrigen"`
	ImagenOrigen      string          `json:"imagenOrigen"`
	ExistenciaOrigen  decimal.Decimal `json:"existenciaOrigen"`
	NivelDestinoID    uint            `json:"nivelDestinoId"`
	NivelDestinoGuid  string          `json:"nivelDestinoGuid"`
	CodigoDestino     string          `json:"codigoDestino"`
	ProductoDestino   string          `json:"productoDestino"`
	EmpaqueDestino    string          `json:"empaqueDestino"`
	ContenidoDestino  float64         `json:"contenidoDestino"`
	UnidadDestino     string          `json:"unidadDestino"`
	ImagenDestino     string          `json:"imagenDestino"`
	ExistenciaDestino decimal.Decimal `json:"existenciaDestino"`
	FactorSugerido    decimal.Decimal `json:"factorSugerido"`
	FactorConversion  float64         `json:"factorConversion"`
}

type EjecutarConversionDto struct {
	ReglaGuid string  `json:"reglaGuid"`
	Cantidad  float64 `json:"cantidad"`
}

type ResultadoConversionDto struct {
	CantidadOrigen    decimal.Decimal `json:"cantidadOrigen"`
	CantidadDestino   decimal.Decimal `json:"cantidadDestino"`
	ExistenciaOrigen  decimal.Decimal `json:"existenciaOrigen"`
	ExistenciaDestino decimal.Decimal `json:"existenciaDestino"`
}
