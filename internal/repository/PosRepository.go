package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/shopspring/decimal"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PosRepository struct {
	db  *gorm.DB
	ctx context.Context
}

func NewPosRepository(db *gorm.DB, ctx context.Context) *PosRepository {
	return &PosRepository{db: db, ctx: ctx}
}
func (r *PosRepository) SetContext(ctx context.Context) {
	r.ctx = ctx
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

func (r *PosRepository) ConsultaTransacciones() (*dto.ResponseDto, error) {
	var transacciones []dto.TransaccionDto

	err := r.db.Raw(`select p.id,folio,fecha,es_credito,c.razon_social,c.correo,c.telefono,
	                tp.nombre as tipo_operacion, e.nombre as estatus,
					sum(cantidad*precio_venta) - sum(descuento) as monto_transaccion
					from pedidos p, tipos_pedido tp, clientes c, estatus e, pedido_detalle pd
					where p.tipo_pedido_id = tp.id and
						p.cliente_id = c.id and
						p.estatus_id = e.id and
						pd.pedido_id = p.id
					group by p.id,folio,fecha,es_credito,c.razon_social,c.correo,c.telefono,tp.nombre, e.nombre
					order by tp.nombre, folio`).Scan(&transacciones).Error

	if err != nil {
		return dto.NewResponseDto(false, "Error al consultar transacciones", nil, []string{err.Error()}), err
	}

	return dto.NewResponseDto(true, "Transacciones consultadas correctamente", transacciones, nil), nil
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

func (r *PosRepository) RegistrarTraspaso(tx *gorm.DB, pedido *models.Pedido, sucursalOrigen *uint, sucursalDestino *uint) error {

	var tr models.Traspaso

	tr.PedidoID = pedido.ID
	tr.SucursalOrigenID = *sucursalOrigen
	tr.SucursalDestinoID = *sucursalDestino
	tr.FechaEnvio = time.Now()
	tr.EstatusID = 1
	tr.Sync = false

	if err := tx.Create(&tr).Error; err != nil {
		return err
	}

	return nil
}

func (r *PosRepository) ConfirmarTransaccion(
	tipoOperacion *uint,
	pagosAplicados []dto.PagosAplicadosDto,
	itemsPedido []dto.PedidoProductoDto,
	sucursalOrigen *uint,
	sucursalDestino *uint,
) (*dto.ResponseDto, error) {

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

		//Registrar Traspaso
		if *tipoOperacion == 3 && sucursalDestino != nil && sucursalOrigen != nil {
			if err := r.RegistrarTraspaso(tx, &pedido, sucursalOrigen, sucursalDestino); err != nil {
				return err
			}
		}

		return nil // ✅ COMMIT
	})

	if err != nil {
		return dto.NewResponseDto(false, "Error al confirmar transacción", nil, []string{err.Error()}), err
	}

	go r.CloudSync(&pedido, sucursalOrigen, sucursalDestino)
	return dto.NewResponseDto(true, "Transacción confirmada exitosamente", pedido, nil), nil
}

func (r *PosRepository) CloudSync(pedido *models.Pedido, sucursalOrigen *uint, sucursalDestino *uint) {
	// Cargar las relaciones del pedido para obtener sus Guids correspondientes
	r.db.Preload("Estatus").Preload("Cliente").Preload("TipoPedido").First(pedido, pedido.ID)

	var detalles []models.PedidoDetalle
	r.db.Preload("Nivel").Where("pedido_id = ?", pedido.ID).Find(&detalles)

	var pedidoDetalleDto []dto.PedidoDetalleRequestDto
	for _, d := range detalles {
		pedidoDetalleDto = append(pedidoDetalleDto, dto.PedidoDetalleRequestDto{
			NivelGuid:     d.Nivel.Guid.String(),
			Cantidad:      d.Cantidad.InexactFloat64(),
			PrecioCompra:  d.PrecioCompra.InexactFloat64(),
			PrecioVenta:   d.PrecioVenta.InexactFloat64(),
			Descuento:     d.Descuento.InexactFloat64(),
			TrasladoIVA:   d.TrasladoIVA.InexactFloat64(),
			TasaIVA:       d.TasaIVA.InexactFloat64(),
			RetencionISR:  d.RetencionISR.InexactFloat64(),
			TasaISR:       d.TasaISR.InexactFloat64(),
			InfoAdicional: d.InfoAdicional,
		})
	}

	var tr models.Traspaso
	r.db.Preload("SucursalOrigen").Preload("SucursalDestino").Preload("Estatus").Where("pedido_id = ?", pedido.ID).First(&tr)

	var traspasoDto *dto.TraspasoRequestDto
	var sucursalOrigenGuid string

	if tr.ID != 0 && *sucursalOrigen != 0 && *sucursalDestino != 0 {
		var fechaRecepcion time.Time
		if tr.FechaRecepcion != nil {
			fechaRecepcion = *tr.FechaRecepcion
		}

		traspasoDto = &dto.TraspasoRequestDto{
			SucursalOrigenGuid:  tr.SucursalOrigen.Guid.String(),
			SucursalDestinoGuid: tr.SucursalDestino.Guid.String(),
			EstatusGuid:         tr.Estatus.Guid.String(),
			FechaEnvio:          tr.FechaEnvio,
			FechaRecepcion:      fechaRecepcion,
			Sync:                tr.Sync,
		}

		sucursalOrigenGuid = tr.SucursalOrigen.Guid.String()
	}

	pedidoRequestDto := dto.PedidoRequestDto{
		SucursalOrigenGuid: sucursalOrigenGuid,
		PedidoGuid:         pedido.Guid.String(),
		EstatusGuid:        pedido.Estatus.Guid.String(),
		ClienteGuid:        pedido.Cliente.Guid.String(),
		TipoPedidoGuid:     pedido.TipoPedido.Guid.String(),
		Folio:              pedido.Folio,
		Fecha:              pedido.Fecha,
		EsCredito:          pedido.EsCredito,
		Sync:               pedido.Sync,
		PedidoDetalle:      pedidoDetalleDto,
		Traspaso:           traspasoDto,
	}

	// 1. Lógica de la API
	client := &http.Client{Timeout: 10 * time.Second}

	// Convertir pedido a JSON, etc...
	payload, err := json.Marshal(pedidoRequestDto)
	if err != nil {
		runtime.EventsEmit(r.ctx, "sync_status", map[string]interface{}{
			"pedido_id": pedidoRequestDto.PedidoGuid,
			"success":   false,
			"error":     "No se pudo convertir el pedido a JSON",
		})
		return
	}

	fmt.Println(string(payload))
	resp, err := client.Post("http://localhost:5242/pedidos/registrar", "application/json", bytes.NewBuffer(payload))

	fmt.Println(resp)
	fmt.Println(err)
	if err != nil {
		// 2. Notificar error al frontend de forma independiente
		runtime.EventsEmit(r.ctx, "sync_status", map[string]interface{}{
			"pedido_id": pedido.ID,
			"success":   false,
			"error":     "No se pudo conectar con el servidor",
		})
		return
	}
	defer resp.Body.Close()

	// 3. Notificar éxito
	runtime.EventsEmit(r.ctx, "sync_status", map[string]interface{}{
		"pedido_id": pedido.ID,
		"success":   true,
		"message":   "Sincronizado correctamente",
	})
}
