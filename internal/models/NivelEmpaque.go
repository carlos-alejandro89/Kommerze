package models

type NivelEmpaque struct {
	BaseModel
	ProductoID uint
	EmpaqueID  uint
	Codigo     string
	CodigoBarra string
	ImgReferencia string
	Activo     bool

	Producto Producto
	Empaque  Empaque
}

func (NivelEmpaque) TableName() string {
	return "nivel_empaque"
}