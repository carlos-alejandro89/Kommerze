package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"database/sql"

	"github.com/google/uuid"
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

	guid, err := uuid.Parse(busqueda)
	if err != nil {
		guid = uuid.New()
	}

	err = r.db.Raw(`select nv.codigo,p.descripcion,e.empaque ,e.contenido ,
	                 p.fraccionable ,nv.codigo_barra ,nv.img_referencia , nivel_id,
					 precio_compra,precio_venta, descuento ,existencia ,
	                 p.informacion_producto,p.caracteristicas,p.instrucciones_uso,
					 nv.guid, pb.guid as producto_base_guid, p.guid as producto_guid
					 from sucursal_producto sp
					 join nivel_empaque nv on sp.nivel_id  = nv.id
					 join empaques e on nv.empaque_id = e.id
					 join productos p on nv.producto_id  = p.id
                     left join productos pb on p.producto_base_id = pb.id
					 where p.descripcion like @busqueda 
					 or codigo like @busqueda 
					 or codigo_barra = @buscar
					 or nv.guid = @guid`,
		sql.Named("busqueda", "%"+busqueda+"%"),
		sql.Named("buscar", busqueda),
		sql.Named("guid", guid)).Scan(&productos).Error

	if err != nil {
		return nil, err
	}

	return productos, err
}

func (r *PosRepository) ConsultaProductosOld(busqueda string) ([]dto.ProductoDto, error) {
	var productos []dto.ProductoDto

	guid, err := uuid.Parse(busqueda)
	if err != nil {
		guid = uuid.New()
	}

	err = r.db.Raw(`select nv.codigo,p.descripcion,e.empaque ,e.contenido ,
	                 p.fraccionable ,nv.codigo_barra ,nv.img_referencia , nivel_id,
					 precio_compra,precio_venta, descuento ,existencia ,
	                 p.informacion_producto,p.caracteristicas,p.instrucciones_uso,nv.guid
					 from sucursal_producto sp
					 join nivel_empaque nv on sp.nivel_id  = nv.id
					 join empaques e on nv.empaque_id = e.id
					 join productos p on nv.producto_id  = p.id 
					 where p.descripcion like @busqueda 
					 or codigo like @busqueda 
					 or codigo_barra = @buscar
					 or nv.guid = @guid`,
		sql.Named("busqueda", "%"+busqueda+"%"),
		sql.Named("buscar", busqueda),
		sql.Named("guid", guid)).Scan(&productos).Error

	if err != nil {
		return nil, err
	}

	return productos, err
}

func (r *PosRepository) ObtenerTiposPedido() ([]models.TipoPedido, error) {
	var tipos []models.TipoPedido
	err := r.db.Raw(`select * from tipos_pedido`).Scan(&tipos).Error
	if err != nil {
		return nil, err
	}
	return tipos, nil
}

func (r *PosRepository) ConsultarExistenciaProductos(productosGuids []uuid.UUID) ([]dto.InventarioDto, error) {
	var productos []dto.InventarioDto
	err := r.db.Raw(`select * from vw_inventario_productos where guid in ?`, productosGuids).Scan(&productos).Error
	if err != nil {
		return nil, err
	}
	return productos, nil
}
