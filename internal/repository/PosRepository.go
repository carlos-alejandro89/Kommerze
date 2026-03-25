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
	"gorm.io/gorm/clause"
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
	err := r.db.Raw(`select * from tipos_pedido order by id`).Scan(&tipos).Error
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

func (r *PosRepository) ActualizarExistencias(itemsPedido []dto.PedidoProductoDto, tx *gorm.DB) error {
	for _, item := range itemsPedido {
		// Actualizar existencias
		var sp models.SucursalProducto

		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("guid = ?", item.ID).
			First(&sp).Error; err != nil {
			return err
		}

		sp.Existencia = sp.Existencia.Sub(item.Quantity) // aqui hace resta: Funciones Sum, Sub, Mul, Div, Cmp

		if err := tx.Save(&sp).Error; err != nil {
			return err
		}
	}
	return nil
}

func (r *PosRepository) RegistrarPagos(pagosAplicados []dto.PagosAplicadosDto, pedido *models.Pedido, tx *gorm.DB) error {
	for _, item := range pagosAplicados {
		pago := models.Pago{
			PedidoID: pedido.ID,
			FormaID:  1,
			Monto:    item.Monto.InexactFloat64(),
			Fecha:    time.Now(),
			Saldo:    item.Monto.InexactFloat64(),
			Sync:     false,
		}

		if err := tx.Create(&pago).Error; err != nil {
			return err
		}
	}
	return nil
}

func (r *PosRepository) ConfirmarTransaccion(tipoOperacion *uint, pagosAplicados []dto.PagosAplicadosDto, itemsPedido []dto.PedidoProductoDto) (*dto.ResponseDto, error) {

	var pedido models.Pedido

	err := r.db.Transaction(func(tx *gorm.DB) error {

		var estatus uint = 1
		var cliente uint = 1

		pedido = models.Pedido{
			EstatusID:    &estatus,
			ClienteID:    &cliente,
			TipoPedidoID: tipoOperacion,
			Fecha:        time.Now(),
			EsCredito:    false,
			Sync:         false,
		}

		// 👇 IMPORTANTE: usa tx en lugar de r.db
		if err := r.BeforeCreate(&pedido, tx); err != nil {
			return err
		}

		if err := tx.Create(&pedido).Error; err != nil {
			return err
		}

		// Diccionario
		dicNiveles := make(map[uuid.UUID]uint)

		var guids []uuid.UUID
		for _, item := range itemsPedido {
			guid, _ := uuid.Parse(fmt.Sprintf("%v", item.ID))
			guids = append(guids, guid)
		}

		var nivelesEmpaque []models.NivelEmpaque
		if len(guids) > 0 {
			if err := tx.Where("guid IN ?", guids).Find(&nivelesEmpaque).Error; err != nil {
				return err
			}
		}

		for _, item := range nivelesEmpaque {
			dicNiveles[item.Guid] = item.ID
		}

		// Detalles
		for _, item := range itemsPedido {
			guid, _ := uuid.Parse(fmt.Sprintf("%v", item.ID))

			detalle := models.PedidoDetalle{
				PedidoID:     pedido.ID,
				NivelID:      dicNiveles[guid],
				Cantidad:     item.Quantity,
				PrecioVenta:  item.Price,
				PrecioCompra: item.Price,
				TasaIVA:      decimal.NewFromFloat(16.0),
				TasaISR:      decimal.NewFromFloat(0.0),
				Descuento:    item.Discount,
			}

			if err := tx.Create(&detalle).Error; err != nil {
				return err
			}
		}

		//Registrar Pagos
		if *tipoOperacion == 1 {
			if err := r.RegistrarPagos(pagosAplicados, &pedido, tx); err != nil {
				return err
			}
		}

		//Actualizar existencias
		if *tipoOperacion != 2 {
			if err := r.ActualizarExistencias(itemsPedido, tx); err != nil {
				return err
			}
		}

		return nil // ✅ COMMIT
	})

	if err != nil {
		return dto.NewResponseDto(false, "Error al confirmar transacción", nil, []string{err.Error()}), err
	}

	return dto.NewResponseDto(true, "Transacción confirmada exitosamente", pedido, nil), nil
}
