package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type SolicitudProductoItemDto struct {
	NivelGuid string          `json:"nivelGuid"`
	Cantidad  decimal.Decimal `json:"cantidad"`
}

type SolicitudProductosDto struct {
	TipoPedidoGuid    string                     `json:"tipoPedidoGuid"`
	Productos         []SolicitudProductoItemDto `json:"productos"`
	SucursalOrigenID  uint                       `json:"sucursalOrigenId"`
	SucursalDestinoID *uint                      `json:"sucursalDestinoId,omitempty"`
	Comentarios       string                     `json:"comentarios,omitempty"`
}

type SolicitudCreadaDto struct {
	PedidoGuid        string    `json:"pedidoGuid"`
	Folio             int       `json:"folio"`
	TipoPedidoGuid    string    `json:"tipoPedidoGuid"`
	TipoPedido        string    `json:"tipoPedido"`
	Fecha             time.Time `json:"fecha"`
	SucursalOrigenID  uint      `json:"sucursalOrigenId"`
	SucursalDestinoID *uint     `json:"sucursalDestinoId,omitempty"`
	Comentarios       string    `json:"comentarios,omitempty"`
}
