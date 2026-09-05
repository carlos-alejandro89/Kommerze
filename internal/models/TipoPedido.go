package models

const (
	TipoPedidoVentaGuid         = "f1b2c3d4-e5f6-4a7b-8c9d-012345678901"
	TipoPedidoCotizacionGuid    = "f1b2c3d4-e5f6-4a7b-8c9d-012345678902"
	TipoPedidoTraspasoGuid      = "f1b2c3d4-e5f6-4a7b-8c9d-012345678903"
	TipoPedidoCompraGuid        = "c82164a9-616c-4148-80fd-c4702d8a7cca"
	TipoPedidoBajaMercanciaGuid = "7a117386-2369-4fce-b2e7-b1dbd38ecf58"
	TipoPedidoConversionGuid    = "99f9f4c0-748a-4f8c-b820-9102085aa4cd"
)

type TipoPedido struct {
	BaseModel
	Nombre      string `gorm:"type:varchar(255);not null;uniqueIndex"`
	Descripcion string `gorm:"type:text"`
	Icon        string `gorm:"type:varchar(255)"`
}

func (TipoPedido) TableName() string {
	return "tipos_pedido"
}
