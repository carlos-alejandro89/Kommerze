package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"database/sql"
	"fmt"
	"time"

	"github.com/shopspring/decimal"

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

func (r *PosRepository) BeforeCreate(p *models.Pedido, tx *gorm.DB) (err error) {
	var seqName string

	// Suponiendo que tienes IDs de tipo de pedido fijos
	switch *p.TipoPedidoID {
	case 1: // Pedido
		seqName = "consecutivo_folio_pedido"
	case 2: // Cotización
		seqName = "consecutivo_folio_cotizacion"
	case 3: // Transferencia
		seqName = "consecutivo_folio_transferencia"
	}

	var siguienteFolio int
	// Obtenemos el siguiente valor de la secuencia de forma atómica
	tx.Raw("SELECT nextval(?)", seqName).Scan(&siguienteFolio)
	p.Folio = siguienteFolio

	return nil
}

func (r *PosRepository) ConfirmarTransaccion(tipoOperacion *uint, pagosAplicados []dto.PagosAplicadosDto, itemsPedido []dto.PedidoProductoDto) (*dto.ResponseDto, error) {
	var estatus = uint(1)
	var cliente = uint(1)
	pedido := models.Pedido{
		EstatusID:    &estatus,
		ClienteID:    &cliente,
		TipoPedidoID: tipoOperacion,
		Fecha:        time.Now(),
		EsCredito:    false,
		Sync:         false,
	}

	if err := r.BeforeCreate(&pedido, r.db); err != nil {
		return dto.NewResponseDto(false, "Ha ocurrido un error al asginar folio al pedido", nil, []string{err.Error()}), err
	}

	if err := r.db.Create(&pedido).Error; err != nil {
		return dto.NewResponseDto(false, "Ha ocurrido un error al confirmar la transacción", nil, []string{err.Error()}), err
	}

	dicNiveles := make(map[uuid.UUID]uint)

	var nivelesEmpaque []models.NivelEmpaque
	if err := r.db.Find(&nivelesEmpaque).Error; err == nil {
		for _, item := range nivelesEmpaque {
			dicNiveles[item.Guid] = item.ID
		}
	}

	for _, item := range itemsPedido {
		guid, _ := uuid.Parse(fmt.Sprintf("%v", item.ID))
		detalle := models.PedidoDetalle{
			PedidoID:      pedido.ID,
			NivelID:       dicNiveles[guid],
			Cantidad:      item.Quantity,
			PrecioVenta:   item.Price,
			PrecioCompra:  item.Price,
			TasaIVA:       decimal.NewFromFloat(16.0),
			TasaISR:       decimal.NewFromFloat(0.0),
			Descuento:     item.Discount,
			InfoAdicional: "",
		}

		if err := r.db.Create(&detalle).Error; err != nil {
			return dto.NewResponseDto(false, "Ha ocurrido un error al confirmar la transacción", nil, []string{err.Error()}), err
		}
	}

	return dto.NewResponseDto(true, "Transacción confirmada exitosamente", pedido, nil), nil
}
