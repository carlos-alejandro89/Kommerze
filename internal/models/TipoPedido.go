package models

type TipoPedido struct {
	BaseModel
	Nombre      string `gorm:"type:varchar(255);not null;uniqueIndex"`
	Descripcion string `gorm:"type:text"`
	Icon        string `gorm:"type:varchar(255)"`
}

func (TipoPedido) TableName() string {
	return "tipos_pedido"
}
