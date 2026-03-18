package dto

import (
	"github.com/shopspring/decimal"
	"gorm.io/datatypes"
)

type ProductoDto struct {
	ID                  int
	Codigo              string
	Descripcion         string
	Empaque             string
	Contenido           float64
	Fraccionable        bool
	CodigoBarra         string
	ImgReferencia       string
	NivelId             int
	PrecioCompra        float64
	PrecioVenta         float64
	Descuento           float64
	Existencia          decimal.Decimal
	Guid                string
	ProductoBaseGuid    string
	ProductoGuid        string
	InformacionProducto datatypes.JSON
	Caracteristicas     datatypes.JSON
	InstruccionesUso    datatypes.JSON
}
