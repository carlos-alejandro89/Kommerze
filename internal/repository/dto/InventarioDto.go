package dto

import (
	"github.com/shopspring/decimal"
)

type InventarioDto struct {
	Codigo      string
	CodigoBarra *string
	CodigoBase  *string

	// 🔹 Descripción
	Descripcion  string
	Empaque      string
	Contenido    float64
	Fraccionable bool

	// 🔹 Multimedia
	ImgReferencia *string

	// 🔹 Relaciones
	NivelID uint

	// 🔹 Información extendida
	InformacionProducto *string
	Caracteristicas     *string
	InstruccionesUso    *string

	// 💰 Precios
	PrecioCompra decimal.Decimal
	PrecioVenta  decimal.Decimal
	PrecioVenta2 decimal.Decimal
	Descuento    decimal.Decimal

	// 📦 Inventario
	Existencia         decimal.Decimal
	ExistenciaBase     *decimal.Decimal
	ExistenciaFraccion *decimal.Decimal

	// 🔹 GUIDs
	Guid             string
	GuidBase         *string
	ProductoBaseGuid *string
	ProductoGuid     string
}
