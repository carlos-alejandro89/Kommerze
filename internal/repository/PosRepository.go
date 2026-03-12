package repository

import (
	"BitComercio/internal/repository/dto"
	"database/sql"

	"gorm.io/gorm"
)

type PosRepository struct {
	db *gorm.DB
}

func NewPosRepository(db *gorm.DB) *PosRepository {
	return &PosRepository{db: db}
}

func (r *PosRepository) ConsultaProductos(busqueda string) ([]dto.ProductoDto, error) {
	var productos []dto.ProductoDto
	err := r.db.Raw(`select nv.codigo,p.descripcion,e.empaque ,e.contenido ,p.fraccionable ,nv.codigo_barra ,nv.img_referencia , nivel_id, precio_compra,precio_venta, descuento ,existencia 
					from sucursal_producto sp
					join nivel_empaque nv on sp.nivel_id  = nv.id
					join empaques e on nv.empaque_id = e.id
					join productos p on nv.producto_id  = p.id where p.descripcion like @busqueda or codigo like @busqueda or codigo_barra = @busqueda`,
		sql.Named("busqueda", "%"+busqueda+"%")).Scan(&productos).Error

	if err != nil {
		return nil, err
	}

	return productos, err
}
