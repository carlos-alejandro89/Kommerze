package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/shopspring/decimal"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PosRepository struct {
	db              *gorm.DB
	ctx             context.Context
	cloudAPIURL     string
	cloudHTTPClient interface {
		Post(string, string, io.Reader) (*http.Response, error)
	}
}

func NewPosRepository(db *gorm.DB, ctx context.Context, cloudAPIURL string, cloudHTTPClient interface {
	Post(string, string, io.Reader) (*http.Response, error)
}) *PosRepository {
	return &PosRepository{db: db, ctx: ctx, cloudAPIURL: strings.TrimRight(cloudAPIURL, "/"), cloudHTTPClient: cloudHTTPClient}
}
func (r *PosRepository) SetContext(ctx context.Context) {
	r.ctx = ctx
}

func (r *PosRepository) ConsultaProductos(busqueda string, conExistencia bool) ([]dto.ProductoDto, error) {
	var productos []dto.ProductoDto

	guid, err := uuid.Parse(busqueda)
	if err != nil {
		guid = uuid.New()
	}

	query := `select nv.codigo,p.descripcion,e.empaque ,e.contenido ,
	                 p.fraccionable ,nv.codigo_barra ,nv.img_referencia , nivel_id,
					 precio_compra,precio_venta, descuento ,existencia ,
	                 p.informacion_producto,p.caracteristicas,p.instrucciones_uso,
					 nv.guid, pb.guid as producto_base_guid, p.guid as producto_guid,
					 l.nombre_linea as linea, m.nombre_marca as marca
					 from sucursal_producto sp
					 join nivel_empaque nv on sp.nivel_id  = nv.id
					 join empaques e on nv.empaque_id = e.id
					 join productos p on nv.producto_id  = p.id
                     left join productos pb on p.producto_base_id = pb.id
					 left join lineas l on p.linea_id = l.id
					 left join marcas m on p.marca_id = m.id
					 where (p.descripcion like @busqueda 
					 or codigo like @busqueda 
					 or codigo_barra = @buscar
					 or nv.guid = @guid)`

	if conExistencia {
		query += " and existencia > 0"
	}

	err = r.db.Raw(query,
		sql.Named("busqueda", "%"+busqueda+"%"),
		sql.Named("buscar", busqueda),
		sql.Named("guid", guid)).Scan(&productos).Error

	if err != nil {
		return nil, err
	}

	return productos, err
}

func (r *PosRepository) ConsultaTransacciones(tipoPedidoID *uint, sucursalID *uint) (*dto.ResponseDto, error) {
	var transacciones []dto.TransaccionDto

	query := `select p.id, p.guid as pedido_guid, p.folio, p.fecha, p.es_credito,
				coalesce(c.razon_social, 'Publico General') as razon_social,
				coalesce(c.correo, '') as correo, coalesce(c.telefono, '') as telefono,
				tp.nombre as tipo_operacion, tp.id as tipo_pedido_id, tp.guid::text as tipo_pedido_guid,
				e.nombre as estatus,
				p.estatus_autorizacion,
				coalesce(s.serie_cfdi, 'A') as serie_cfdi,
				(p.factura_id is not null and coalesce(f.uuid, '') <> '') as facturada,
				coalesce(f.uuid, '') as factura_uuid,
				coalesce(f.serie, '') as factura_serie,
				coalesce(f.folio, 0) as factura_folio,
				coalesce(ef.rfc, '') as receptor_rfc,
				sum((pd.cantidad * pd.precio_venta) - ((pd.cantidad * pd.precio_venta) * coalesce(pd.descuento, 0) / 100)) as monto_transaccion
				from pedidos p
				join tipos_pedido tp on p.tipo_pedido_id = tp.id
				left join clientes c on p.cliente_id = c.id
				join estatus e on p.estatus_id = e.id
				join pedido_detalle pd on pd.pedido_id = p.id
				left join sucursales s on s.id = p.sucursal_origen_id
				left join facturas f on f.id = p.factura_id and f.deleted_at is null
				left join entidades_fiscales ef on ef.id = f.receptor_id and ef.deleted_at is null
				where p.deleted_at is null and pd.deleted_at is null`

	var args []interface{}

	if tipoPedidoID != nil {
		query += " and tp.id = ?"
		args = append(args, *tipoPedidoID)
	}

	if sucursalID != nil {
		query += " and p.sucursal_origen_id = ?"
		args = append(args, *sucursalID)
	}

	query += ` group by p.id, p.guid, p.folio, p.fecha, p.es_credito, c.razon_social, c.correo, c.telefono,
				tp.nombre, tp.id, tp.guid, e.nombre, p.estatus_autorizacion, s.serie_cfdi,
				f.uuid, f.serie, f.folio, ef.rfc
				order by p.fecha desc, p.folio desc`

	err := r.db.Raw(query, args...).Scan(&transacciones).Error

	if err != nil {
		return dto.NewResponseDto(false, "Error al consultar transacciones", nil, []string{err.Error()}), err
	}

	return dto.NewResponseDto(true, "Transacciones consultadas correctamente", transacciones, nil), nil
}

// CancelarVenta cambia el estatus del pedido y reintegra cada cantidad al
// inventario de la sucursal. El bloqueo evita cancelar dos veces o perder
// actualizaciones concurrentes de existencia.
func (r *PosRepository) CancelarVenta(pedidoGuid string) (*dto.ResponseDto, error) {
	const estatusVentaCanceladaGuid = "86968037-975a-43ce-880c-043003010103"
	guid, err := uuid.Parse(strings.TrimSpace(pedidoGuid))
	if err != nil {
		return nil, fmt.Errorf("identificador de venta inválido")
	}
	err = r.db.Transaction(func(tx *gorm.DB) error {
		var pedido models.Pedido
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("TipoPedido").Preload("Estatus").
			Where("guid = ? AND deleted_at IS NULL", guid).First(&pedido).Error; err != nil {
			return fmt.Errorf("venta no encontrada: %w", err)
		}
		if pedido.TipoPedido.Guid.String() != models.TipoPedidoVentaGuid {
			return fmt.Errorf("únicamente se pueden cancelar ventas")
		}
		if strings.EqualFold(pedido.Estatus.Nombre, "Cancelado") || strings.EqualFold(pedido.Estatus.Nombre, "Cancelada") {
			return fmt.Errorf("la venta ya se encuentra cancelada")
		}
		if pedido.FacturaID != nil {
			return fmt.Errorf("la venta ya está facturada; primero deberá cancelarse su CFDI")
		}
		var detalles []models.PedidoDetalle
		if err := tx.Where("pedido_id = ? AND deleted_at IS NULL", pedido.ID).Find(&detalles).Error; err != nil {
			return err
		}
		if err := r.ReintegrarExistencias(detalles, tx); err != nil {
			return err
		}
		var cancelado models.Estatus
		if err := tx.Where("guid = ? AND deleted_at IS NULL", estatusVentaCanceladaGuid).First(&cancelado).Error; err != nil {
			return fmt.Errorf("estatus Cancelado no encontrado en el catálogo sincronizado: %w", err)
		}
		if !strings.EqualFold(strings.TrimSpace(cancelado.Nombre), "Cancelado") {
			return fmt.Errorf("el GUID configurado para Cancelado corresponde al estatus %q", cancelado.Nombre)
		}
		actualizacion := tx.Model(&models.Pedido{}).
			Where("id = ? AND deleted_at IS NULL", pedido.ID).
			UpdateColumns(map[string]any{"estatus_id": cancelado.ID, "sync": false})
		if actualizacion.Error != nil {
			return fmt.Errorf("no se pudo cambiar el estatus de la venta a Cancelado: %w", actualizacion.Error)
		}
		if actualizacion.RowsAffected != 1 {
			return fmt.Errorf("no se actualizó el estatus de la venta")
		}

		var estatusConfirmado uint
		if err := tx.Model(&models.Pedido{}).
			Select("estatus_id").Where("id = ?", pedido.ID).
			Scan(&estatusConfirmado).Error; err != nil {
			return fmt.Errorf("no se pudo confirmar el estatus de la venta: %w", err)
		}
		if estatusConfirmado != cancelado.ID {
			return fmt.Errorf("el estatus Cancelado no quedó aplicado a la venta")
		}
		return nil
	})
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()}), err
	}
	return dto.NewResponseDto(true, "Venta cancelada; las existencias fueron reintegradas", nil, nil), nil
}

func (r *PosRepository) ConsultarTransferencias() ([]dto.TransferenciaDto, error) {
	var transferencias []dto.TransferenciaDto

	query := `
		select
			t.guid::text as traspaso_guid,
			p.guid::text as pedido_guid,
			p.folio,
			so.guid::text as sucursal_origen_guid,
			sd.guid::text as sucursal_destino_guid,
			coalesce(so.nombre_sucursal, 'Sucursal no disponible') as sucursal_origen,
			coalesce(sd.nombre_sucursal, 'Sucursal no disponible') as sucursal_destino,
			t.fecha_envio,
			t.fecha_recepcion,
			e.guid::text as estatus_guid,
			e.nombre as estatus,
			count(distinct pd.id) as total_productos,
			coalesce(sum(pd.cantidad), 0)::double precision as unidades_totales,
			coalesce(sum((pd.cantidad * pd.precio_venta) - pd.descuento), 0)::double precision as valor_total,
			coalesce(p.comentarios, '') as comentarios
		from traspasos t
		join pedidos p on p.id = t.pedido_id and p.deleted_at is null
		join sucursales so on so.id = t.sucursal_origen_id and so.deleted_at is null
		join sucursales sd on sd.id = t.sucursal_destino_id and sd.deleted_at is null
		join estatus e on e.id = t.estatus_id and e.deleted_at is null
		left join pedido_detalle pd on pd.pedido_id = p.id and pd.deleted_at is null
		where t.deleted_at is null
		group by t.id, t.guid, p.guid, p.folio, p.comentarios,
			so.guid, sd.guid, so.nombre_sucursal, sd.nombre_sucursal, t.fecha_envio,
			t.fecha_recepcion, e.guid, e.nombre
		order by t.fecha_envio desc, p.folio desc`

	if err := r.db.Raw(query).Scan(&transferencias).Error; err != nil {
		return nil, err
	}

	if len(transferencias) == 0 {
		return transferencias, nil
	}

	type transferenciaProductoRow struct {
		TraspasoGuid string
		dto.TransferenciaProductoDto
	}
	var productos []transferenciaProductoRow
	if err := r.db.Raw(`
		select
			t.guid::text as traspaso_guid,
			ne.guid::text as nivel_guid,
			coalesce(ne.codigo, '') as codigo,
			coalesce(pr.descripcion, 'Producto') as producto,
			coalesce(em.empaque, '') as unidad_medida,
			pd.cantidad::double precision as cantidad,
			pd.precio_venta::double precision as precio_venta,
			pd.descuento::double precision as descuento,
			((pd.cantidad * pd.precio_venta) - pd.descuento)::double precision as importe
		from traspasos t
		join pedidos p on p.id = t.pedido_id and p.deleted_at is null
		join pedido_detalle pd on pd.pedido_id = p.id and pd.deleted_at is null
		join nivel_empaque ne on ne.id = pd.nivel_id and ne.deleted_at is null
		join productos pr on pr.id = ne.producto_id and pr.deleted_at is null
		left join empaques em on em.id = ne.empaque_id and em.deleted_at is null
		where t.deleted_at is null
		order by t.fecha_envio desc, pd.id
	`).Scan(&productos).Error; err != nil {
		return nil, err
	}

	indexByGuid := make(map[string]int, len(transferencias))
	for index := range transferencias {
		transferencias[index].Productos = make([]dto.TransferenciaProductoDto, 0)
		indexByGuid[transferencias[index].TraspasoGuid] = index
	}
	for _, producto := range productos {
		if index, ok := indexByGuid[producto.TraspasoGuid]; ok {
			transferencias[index].Productos = append(transferencias[index].Productos, producto.TransferenciaProductoDto)
		}
	}
	return transferencias, nil
}

func (r *PosRepository) ResolverTransferencia(pedidoGuid, sucursalGuid, estatusGuid string) error {
	req := dto.ResolverTransferenciaDto{PedidoGuid: pedidoGuid, SucursalGuid: sucursalGuid, EstatusGuid: estatusGuid}
	payload, err := json.Marshal(req)
	if err != nil {
		return err
	}
	resp, err := r.cloudHTTPClient.Post(r.cloudAPIURL+"/pedidos/transferencia/estatus", "application/json", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Cloud respondió %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return r.AplicarEstadoTransferencia(pedidoGuid, estatusGuid, sucursalGuid)
}

func (r *PosRepository) AplicarEstadoTransferencia(pedidoGuid, estatusGuid, sucursalGuid string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var pedido models.Pedido
		if err := tx.Where("guid = ?", pedidoGuid).First(&pedido).Error; err != nil {
			return err
		}
		var traspaso models.Traspaso
		if err := tx.Where("pedido_id = ?", pedido.ID).First(&traspaso).Error; err != nil {
			return err
		}
		var actual, nuevo models.Estatus
		if err := tx.First(&actual, traspaso.EstatusID).Error; err != nil {
			return err
		}
		if actual.Guid.String() == estatusTraspasoAceptadoGuid || actual.Guid.String() == estatusTraspasoRechazadoGuid || actual.Guid.String() == estatusTraspasoCanceladoGuid {
			return nil
		}
		if err := tx.Where("guid = ?", estatusGuid).First(&nuevo).Error; err != nil {
			return err
		}

		if estatusGuid == estatusTraspasoAceptadoGuid {
			var sucursal models.Sucursal
			if err := tx.Where("guid = ?", sucursalGuid).First(&sucursal).Error; err != nil {
				return err
			}
			var detalles []models.PedidoDetalle
			if err := tx.Where("pedido_id = ?", pedido.ID).Find(&detalles).Error; err != nil {
				return err
			}
			esDestino := sucursal.ID == traspaso.SucursalDestinoID
			if esDestino {
				if err := r.ReintegrarExistencias(detalles, tx); err != nil {
					return err
				}
			} else {
				var niveles []models.NivelEmpaque
				ids := make([]uint, 0, len(detalles))
				for _, d := range detalles {
					ids = append(ids, d.NivelID)
				}
				if err := tx.Where("id IN ?", ids).Find(&niveles).Error; err != nil {
					return err
				}
				guidPorID := map[uint]uuid.UUID{}
				for _, n := range niveles {
					guidPorID[n.ID] = n.Guid
				}
				items := make([]dto.PedidoProductoDto, 0, len(detalles))
				for _, d := range detalles {
					items = append(items, dto.PedidoProductoDto{ID: guidPorID[d.NivelID].String(), Quantity: d.Cantidad})
				}
				if err := r.ActualizarExistencias(items, tx); err != nil {
					return err
				}
			}
			now := time.Now()
			traspaso.FechaRecepcion = &now
		}
		traspaso.EstatusID = nuevo.ID
		if err := tx.Save(&traspaso).Error; err != nil {
			return err
		}
		return tx.Model(&pedido).Update("estatus_id", nuevo.ID).Error
	})
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
	if p.TipoPedidoID == nil {
		return fmt.Errorf("tipo de pedido requerido")
	}
	var tipo models.TipoPedido
	if err := tx.First(&tipo, *p.TipoPedidoID).Error; err != nil {
		return fmt.Errorf("tipo de pedido no encontrado: %w", err)
	}
	var seqName string

	switch tipo.Guid.String() {
	case models.TipoPedidoVentaGuid:
		seqName = "consecutivo_folio_pedido"
	case models.TipoPedidoCotizacionGuid:
		seqName = "consecutivo_folio_cotizacion"
	case models.TipoPedidoTraspasoGuid:
		seqName = "consecutivo_folio_transferencia"
	default:
		return fmt.Errorf("tipo de pedido no permitido en POS: %s", tipo.Guid)
	}

	var siguienteFolio int
	// Capturar el error: si la secuencia no existe o falla,
	// retornar el error para que la transacción se aborte limpiamente.
	if err := tx.Raw("SELECT nextval(?)", seqName).Scan(&siguienteFolio).Error; err != nil {
		return fmt.Errorf("error al obtener folio para secuencia '%s': %w", seqName, err)
	}
	p.Folio = siguienteFolio

	return nil
}

type consumoInventarioSolicitado struct {
	NivelGuid uuid.UUID
	Cantidad  decimal.Decimal
}

type resolucionNivelInventario struct {
	NivelGuid          uuid.UUID       `gorm:"column:nivel_guid"`
	Codigo             string          `gorm:"column:codigo"`
	Fraccionable       bool            `gorm:"column:fraccionable"`
	Contenido          decimal.Decimal `gorm:"column:contenido"`
	NivelInventarioID  *uint           `gorm:"column:nivel_inventario_id"`
	CodigoConcentrador *string         `gorm:"column:codigo_concentrador"`
}

// consumosInventario resuelve el nivel que realmente concentra la existencia y
// acumula el consumo de todos los hijos antes de validar o modificar inventario.
func (r *PosRepository) consumosInventario(solicitudes []consumoInventarioSolicitado, tx *gorm.DB) (map[uint]decimal.Decimal, map[uint]string, error) {
	guids := make([]uuid.UUID, 0, len(solicitudes))
	for _, solicitud := range solicitudes {
		if solicitud.NivelGuid == uuid.Nil {
			return nil, nil, fmt.Errorf("el nivel de empaque es inválido")
		}
		if !solicitud.Cantidad.IsPositive() {
			return nil, nil, fmt.Errorf("la cantidad solicitada debe ser mayor a cero")
		}
		guids = append(guids, solicitud.NivelGuid)
	}

	var resoluciones []resolucionNivelInventario
	err := tx.Raw(`
		SELECT nv.guid AS nivel_guid,
			nv.codigo,
			p.fraccionable,
			e.contenido,
			CASE WHEN p.fraccionable AND p.producto_base_id IS NOT NULL
				THEN nvb.id ELSE nv.id END AS nivel_inventario_id,
			CASE WHEN p.fraccionable AND p.producto_base_id IS NOT NULL
				THEN nvb.codigo ELSE nv.codigo END AS codigo_concentrador
		FROM nivel_empaque nv
		JOIN productos p ON p.id = nv.producto_id AND p.deleted_at IS NULL
		JOIN empaques e ON e.id = nv.empaque_id AND e.deleted_at IS NULL
		LEFT JOIN nivel_empaque nvb
			ON nvb.producto_id = p.producto_base_id
			AND nvb.empaque_id IN (1, 8)
			AND nvb.deleted_at IS NULL
		WHERE nv.guid IN ? AND nv.deleted_at IS NULL`, guids).Scan(&resoluciones).Error
	if err != nil {
		return nil, nil, fmt.Errorf("no se pudieron resolver los niveles de inventario: %w", err)
	}

	porGuid := make(map[uuid.UUID]resolucionNivelInventario, len(resoluciones))
	for _, resolucion := range resoluciones {
		if anterior, existe := porGuid[resolucion.NivelGuid]; existe && anterior.NivelInventarioID != nil && resolucion.NivelInventarioID != nil && *anterior.NivelInventarioID != *resolucion.NivelInventarioID {
			return nil, nil, fmt.Errorf("el artículo %s tiene más de un nivel concentrador configurado", resolucion.Codigo)
		}
		porGuid[resolucion.NivelGuid] = resolucion
	}

	consumos := make(map[uint]decimal.Decimal)
	codigos := make(map[uint]string)
	for _, solicitud := range solicitudes {
		resolucion, existe := porGuid[solicitud.NivelGuid]
		if !existe {
			return nil, nil, fmt.Errorf("no se encontró el nivel de empaque %s", solicitud.NivelGuid)
		}
		if resolucion.NivelInventarioID == nil {
			return nil, nil, fmt.Errorf("el artículo %s no tiene un producto concentrador válido configurado", resolucion.Codigo)
		}

		cantidadInventario := solicitud.Cantidad
		if resolucion.Fraccionable {
			if !resolucion.Contenido.IsPositive() {
				return nil, nil, fmt.Errorf("el artículo %s no tiene un contenido válido", resolucion.Codigo)
			}
			cantidadInventario = cantidadInventario.Mul(resolucion.Contenido)
		}

		nivelID := *resolucion.NivelInventarioID
		consumos[nivelID] = consumos[nivelID].Add(cantidadInventario)
		if resolucion.CodigoConcentrador != nil {
			codigos[nivelID] = *resolucion.CodigoConcentrador
		}
	}
	return consumos, codigos, nil
}

func (r *PosRepository) ActualizarExistencias(itemsPedido []dto.PedidoProductoDto, tx *gorm.DB) error {
	solicitudes := make([]consumoInventarioSolicitado, 0, len(itemsPedido))
	for _, item := range itemsPedido {
		nivelGuid, err := uuid.Parse(strings.TrimSpace(item.ID))
		if err != nil {
			return fmt.Errorf("nivel de empaque inválido: %s", item.ID)
		}
		solicitudes = append(solicitudes, consumoInventarioSolicitado{NivelGuid: nivelGuid, Cantidad: item.Quantity})
	}

	consumos, codigos, err := r.consumosInventario(solicitudes, tx)
	if err != nil {
		return err
	}

	niveles := make([]uint, 0, len(consumos))
	for nivelID := range consumos {
		niveles = append(niveles, nivelID)
	}
	sort.Slice(niveles, func(i, j int) bool { return niveles[i] < niveles[j] })

	var inventarios []models.SucursalProducto
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("nivel_id IN ? AND deleted_at IS NULL", niveles).
		Order("nivel_id").Find(&inventarios).Error; err != nil {
		return fmt.Errorf("no se pudo bloquear el inventario: %w", err)
	}
	porNivel := make(map[uint]*models.SucursalProducto, len(inventarios))
	for i := range inventarios {
		porNivel[inventarios[i].NivelID] = &inventarios[i]
	}

	for _, nivelID := range niveles {
		inventario, existe := porNivel[nivelID]
		if !existe {
			return fmt.Errorf("no existe inventario para el producto concentrador %s", codigos[nivelID])
		}
		requerido := consumos[nivelID]
		if inventario.Existencia.LessThan(requerido) {
			return fmt.Errorf("existencia insuficiente para el producto concentrador %s: disponible %s, solicitado %s", codigos[nivelID], inventario.Existencia.String(), requerido.String())
		}
	}

	for _, nivelID := range niveles {
		inventario := porNivel[nivelID]
		if err := tx.Model(inventario).Updates(map[string]any{
			"existencia": inventario.Existencia.Sub(consumos[nivelID]),
			"sync":       false,
		}).Error; err != nil {
			return fmt.Errorf("no se pudo actualizar el inventario del concentrador %s: %w", codigos[nivelID], err)
		}
	}
	return nil
}

func (r *PosRepository) ReintegrarExistencias(detalles []models.PedidoDetalle, tx *gorm.DB) error {
	nivelesID := make([]uint, 0, len(detalles))
	for _, detalle := range detalles {
		nivelesID = append(nivelesID, detalle.NivelID)
	}
	var niveles []models.NivelEmpaque
	if err := tx.Where("id IN ? AND deleted_at IS NULL", nivelesID).Find(&niveles).Error; err != nil {
		return fmt.Errorf("no se pudieron resolver los artículos de la venta: %w", err)
	}
	guidsPorID := make(map[uint]uuid.UUID, len(niveles))
	for _, nivel := range niveles {
		guidsPorID[nivel.ID] = nivel.Guid
	}

	solicitudes := make([]consumoInventarioSolicitado, 0, len(detalles))
	for _, detalle := range detalles {
		nivelGuid, existe := guidsPorID[detalle.NivelID]
		if !existe {
			return fmt.Errorf("no se encontró el nivel de empaque %d de la venta", detalle.NivelID)
		}
		solicitudes = append(solicitudes, consumoInventarioSolicitado{NivelGuid: nivelGuid, Cantidad: detalle.Cantidad})
	}

	consumos, codigos, err := r.consumosInventario(solicitudes, tx)
	if err != nil {
		return fmt.Errorf("no se pudo resolver el inventario a reintegrar: %w", err)
	}
	nivelesInventario := make([]uint, 0, len(consumos))
	for nivelID := range consumos {
		nivelesInventario = append(nivelesInventario, nivelID)
	}
	sort.Slice(nivelesInventario, func(i, j int) bool { return nivelesInventario[i] < nivelesInventario[j] })

	var inventarios []models.SucursalProducto
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("nivel_id IN ? AND deleted_at IS NULL", nivelesInventario).
		Order("nivel_id").Find(&inventarios).Error; err != nil {
		return fmt.Errorf("no se pudo bloquear el inventario a reintegrar: %w", err)
	}
	porNivel := make(map[uint]*models.SucursalProducto, len(inventarios))
	for i := range inventarios {
		porNivel[inventarios[i].NivelID] = &inventarios[i]
	}
	for _, nivelID := range nivelesInventario {
		inventario, existe := porNivel[nivelID]
		if !existe {
			return fmt.Errorf("no existe inventario para el producto concentrador %s", codigos[nivelID])
		}
		if err := tx.Model(inventario).Updates(map[string]any{
			"existencia": inventario.Existencia.Add(consumos[nivelID]),
			"sync":       false,
		}).Error; err != nil {
			return fmt.Errorf("no se pudo reintegrar el producto concentrador %s: %w", codigos[nivelID], err)
		}
	}
	return nil
}

func (r *PosRepository) RegistrarPagos(pagosAplicados []dto.PagosAplicadosDto, pedido *models.Pedido, tx *gorm.DB) error {
	for _, item := range pagosAplicados {
		formaID := uint(item.ID)
		if formaID == 0 {
			return fmt.Errorf("la forma de pago es requerida")
		}

		var existe int64
		if err := tx.Model(&models.SATFormaPago{}).
			Where("id = ? AND deleted_at IS NULL", formaID).
			Count(&existe).Error; err != nil {
			return fmt.Errorf("no fue posible validar la forma de pago: %w", err)
		}
		if existe == 0 {
			return fmt.Errorf("la forma de pago seleccionada ya no existe en el catálogo sincronizado")
		}
		pago := models.Pago{
			PedidoID: pedido.ID,
			FormaID:  formaID,
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
	var estatus models.Estatus
	if err := tx.Where("guid = ?", estatusTraspasoEnTransitoGuid).First(&estatus).Error; err != nil {
		return fmt.Errorf("estatus En Tránsito no encontrado: %w", err)
	}
	var tr models.Traspaso

	tr.PedidoID = pedido.ID
	tr.SucursalOrigenID = *sucursalOrigen
	tr.SucursalDestinoID = *sucursalDestino
	tr.FechaEnvio = time.Now()
	tr.EstatusID = estatus.ID
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
	operacionCajeroID *uint,
	clienteGuid string,
) (*dto.ResponseDto, error) {
	if tipoOperacion == nil {
		return dto.NewResponseDto(false, "Tipo de transacción requerido", nil, nil), fmt.Errorf("tipo de transacción requerido")
	}

	var pedido models.Pedido

	err := r.db.Transaction(func(tx *gorm.DB) error {
		var tipo models.TipoPedido
		if err := tx.First(&tipo, *tipoOperacion).Error; err != nil {
			return fmt.Errorf("tipo de transacción no encontrado: %w", err)
		}
		tipoGuid := tipo.Guid.String()
		if tipoGuid != models.TipoPedidoVentaGuid && tipoGuid != models.TipoPedidoCotizacionGuid && tipoGuid != models.TipoPedidoTraspasoGuid {
			return fmt.Errorf("tipo de transacción no permitido: %s", tipo.Nombre)
		}
		estatusNombre := "Pendiente"
		if tipoGuid == models.TipoPedidoVentaGuid {
			estatusNombre = "Completado"
		} else if tipoGuid == models.TipoPedidoTraspasoGuid {
			estatusNombre = "En proceso"
		}
		var estatusModel models.Estatus
		if err := tx.Where("LOWER(nombre) = LOWER(?)", estatusNombre).First(&estatusModel).Error; err != nil {
			return fmt.Errorf("estatus %s no encontrado: %w", estatusNombre, err)
		}
		estatus := estatusModel.ID
		var cliente uint = 1
		if strings.TrimSpace(clienteGuid) != "" {
			guid, parseErr := uuid.Parse(strings.TrimSpace(clienteGuid))
			if parseErr != nil {
				return fmt.Errorf("cliente inválido")
			}
			var clienteModel models.Cliente
			if err := tx.Where("guid = ? AND deleted_at IS NULL", guid).First(&clienteModel).Error; err != nil {
				return fmt.Errorf("cliente seleccionado no encontrado: %w", err)
			}
			cliente = clienteModel.ID
		}

		pedido = models.Pedido{
			EstatusID:         &estatus,
			ClienteID:         &cliente,
			TipoPedidoID:      tipoOperacion,
			Fecha:             time.Now(),
			EsCredito:         false,
			Sync:              false,
			SucursalOrigenID:  sucursalOrigen,
			OperacionCajeroID: operacionCajeroID, // vincula la venta al turno del cajero
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
		if tipoGuid == models.TipoPedidoVentaGuid {
			if err := r.RegistrarPagos(pagosAplicados, &pedido, tx); err != nil {
				return err
			}
		}

		//Actualizar existencias
		if tipoGuid == models.TipoPedidoVentaGuid {
			if err := r.ActualizarExistencias(itemsPedido, tx); err != nil {
				return err
			}
		}

		//Registrar Traspaso
		if tipoGuid == models.TipoPedidoTraspasoGuid && sucursalDestino != nil && sucursalOrigen != nil {
			if err := r.RegistrarTraspaso(tx, &pedido, sucursalOrigen, sucursalDestino); err != nil {
				return err
			}
		}

		return nil // ✅ COMMIT
	})

	if err != nil {
		return dto.NewResponseDto(false, "Error al confirmar transacción", nil, []string{err.Error()}), err
	}

	go r.CloudSync(pedido.ID)
	return dto.NewResponseDto(true, "Transacción confirmada exitosamente", pedido, nil), nil
}

const (
	estatusTraspasoEnTransitoGuid = "86968037-975a-43ce-880c-043003010104"
	estatusTraspasoAceptadoGuid   = "86968037-975a-43ce-880c-043003010105"
	estatusTraspasoRechazadoGuid  = "86968037-975a-43ce-880c-043003010106"
	estatusTraspasoCanceladoGuid  = "86968037-975a-43ce-880c-043003010103"
)

func (r *PosRepository) CrearSolicitudProductos(solicitud dto.SolicitudProductosDto) (*dto.ResponseDto, error) {
	tipoGuid, err := uuid.Parse(solicitud.TipoPedidoGuid)
	if err != nil || (tipoGuid.String() != models.TipoPedidoBajaMercanciaGuid && tipoGuid.String() != models.TipoPedidoTraspasoGuid) {
		return dto.NewResponseDto(false, "Tipo de solicitud inválido", nil, nil), fmt.Errorf("tipo de solicitud inválido")
	}
	if len(solicitud.Productos) == 0 {
		return dto.NewResponseDto(false, "Agrega al menos un producto", nil, nil), fmt.Errorf("la solicitud no contiene productos")
	}
	if solicitud.SucursalOrigenID == 0 {
		return dto.NewResponseDto(false, "No se identificó la sucursal de origen", nil, nil), fmt.Errorf("sucursal de origen requerida")
	}
	esTransferencia := tipoGuid.String() == models.TipoPedidoTraspasoGuid
	if esTransferencia {
		if solicitud.SucursalDestinoID == nil || *solicitud.SucursalDestinoID == 0 {
			return dto.NewResponseDto(false, "Selecciona una sucursal destino", nil, nil), fmt.Errorf("sucursal destino requerida")
		}
		if *solicitud.SucursalDestinoID == solicitud.SucursalOrigenID {
			return dto.NewResponseDto(false, "La sucursal destino debe ser diferente a la de origen", nil, nil), fmt.Errorf("sucursal destino inválida")
		}
	}

	var pedido models.Pedido
	var tipoPedido models.TipoPedido
	err = r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("guid = ?", tipoGuid).First(&tipoPedido).Error; err != nil {
			return fmt.Errorf("no se encontró el tipo de pedido configurado: %w", err)
		}

		var estatusPedido models.Estatus
		estatusNombre := "Completado"
		if esTransferencia {
			estatusNombre = "En proceso"
		}
		if err := tx.Where("LOWER(nombre) = LOWER(?)", estatusNombre).First(&estatusPedido).Error; err != nil {
			return fmt.Errorf("no se encontró el estatus de pedido %q: %w", estatusNombre, err)
		}

		seqName := "consecutivo_folio_baja_mercancia"
		if esTransferencia {
			seqName = "consecutivo_folio_transferencia"
		}
		var folio int
		if err := tx.Raw("SELECT nextval(?)", seqName).Scan(&folio).Error; err != nil {
			return fmt.Errorf("no se pudo generar el folio: %w", err)
		}

		clienteID := uint(1)
		tipoPedidoID := tipoPedido.ID
		estatusPedidoID := estatusPedido.ID
		sucursalOrigenID := solicitud.SucursalOrigenID
		pedido = models.Pedido{
			EstatusID:        &estatusPedidoID,
			ClienteID:        &clienteID,
			TipoPedidoID:     &tipoPedidoID,
			Fecha:            time.Now(),
			Folio:            folio,
			EsCredito:        false,
			Sync:             false,
			Comentarios:      strings.TrimSpace(solicitud.Comentarios),
			SucursalOrigenID: &sucursalOrigenID,
		}
		if err := tx.Create(&pedido).Error; err != nil {
			return fmt.Errorf("no se pudo crear el pedido: %w", err)
		}

		for _, item := range solicitud.Productos {
			nivelGuid, parseErr := uuid.Parse(item.NivelGuid)
			if parseErr != nil {
				return fmt.Errorf("producto con identificador inválido: %s", item.NivelGuid)
			}
			if item.Cantidad.LessThanOrEqual(decimal.Zero) {
				return fmt.Errorf("la cantidad solicitada debe ser mayor a cero")
			}

			var inventario models.SucursalProducto
			if err := tx.
				Clauses(clause.Locking{Strength: "UPDATE"}).
				Joins("JOIN nivel_empaque ON nivel_empaque.id = sucursal_producto.nivel_id").
				Where("nivel_empaque.guid = ?", nivelGuid).
				First(&inventario).Error; err != nil {
				return fmt.Errorf("no se encontró el producto %s en el inventario: %w", item.NivelGuid, err)
			}
			if inventario.Existencia.LessThan(item.Cantidad) {
				return fmt.Errorf(
					"existencia insuficiente para el producto %s: disponible %s, solicitado %s",
					item.NivelGuid,
					inventario.Existencia.String(),
					item.Cantidad.String(),
				)
			}

			detalle := models.PedidoDetalle{
				PedidoID:     pedido.ID,
				NivelID:      inventario.NivelID,
				Cantidad:     item.Cantidad,
				PrecioCompra: inventario.PrecioCompra,
				PrecioVenta:  inventario.PrecioVenta,
				Descuento:    decimal.Zero,
				TasaIVA:      decimal.NewFromInt(16),
				TasaISR:      decimal.Zero,
			}
			if err := tx.Create(&detalle).Error; err != nil {
				return fmt.Errorf("no se pudo registrar el detalle: %w", err)
			}

			if !esTransferencia {
				inventario.Existencia = inventario.Existencia.Sub(item.Cantidad)
				if err := tx.Model(&inventario).Update("existencia", inventario.Existencia).Error; err != nil {
					return fmt.Errorf("no se pudo actualizar la existencia: %w", err)
				}
			}
		}

		if esTransferencia {
			estatusTraspasoGuid := uuid.MustParse(estatusTraspasoEnTransitoGuid)
			var estatusTraspaso models.Estatus
			if err := tx.Where("guid = ?", estatusTraspasoGuid).First(&estatusTraspaso).Error; err != nil {
				return fmt.Errorf("no se encontró el estatus En Tránsito configurado: %w", err)
			}
			traspaso := models.Traspaso{
				PedidoID:          pedido.ID,
				SucursalOrigenID:  solicitud.SucursalOrigenID,
				SucursalDestinoID: *solicitud.SucursalDestinoID,
				EstatusID:         estatusTraspaso.ID,
				FechaEnvio:        time.Now(),
				FechaRecepcion:    nil,
				Sync:              false,
			}
			if err := tx.Create(&traspaso).Error; err != nil {
				return fmt.Errorf("no se pudo registrar el traspaso: %w", err)
			}
		}
		return nil
	})
	if err != nil {
		return dto.NewResponseDto(false, "No se pudo crear la solicitud", nil, []string{err.Error()}), err
	}

	go r.CloudSync(pedido.ID)
	resultado := dto.SolicitudCreadaDto{
		PedidoGuid:        pedido.Guid.String(),
		Folio:             pedido.Folio,
		TipoPedidoGuid:    tipoPedido.Guid.String(),
		TipoPedido:        tipoPedido.Nombre,
		Fecha:             pedido.Fecha,
		SucursalOrigenID:  solicitud.SucursalOrigenID,
		SucursalDestinoID: solicitud.SucursalDestinoID,
		Comentarios:       pedido.Comentarios,
	}
	return dto.NewResponseDto(true, "Solicitud creada correctamente", resultado, nil), nil
}

func (r *PosRepository) CloudSync(pedidoID uint) {
	if r.cloudHTTPClient == nil || r.cloudAPIURL == "" {
		r.emitPedidoSyncStatus(pedidoID, false, "La conexión Cloud no está configurada")
		return
	}

	var pedido models.Pedido
	// Cargar las relaciones del pedido para obtener sus Guids correspondientes
	if err := r.db.Preload("Estatus").Preload("Cliente").Preload("TipoPedido").Preload("SucursalOrigen").First(&pedido, pedidoID).Error; err != nil {
		r.emitPedidoSyncStatus(pedidoID, false, "No se pudo cargar el pedido para sincronizar")
		return
	}

	var detalles []models.PedidoDetalle
	if err := r.db.Preload("Nivel").Where("pedido_id = ?", pedido.ID).Find(&detalles).Error; err != nil {
		r.emitPedidoSyncStatus(pedidoID, false, "No se pudo cargar el detalle del pedido")
		return
	}

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

	tipoPedidoGuid := pedido.TipoPedido.Guid.String()
	var traspasoDto *dto.TraspasoRequestDto
	sucursalOrigenGuid := pedido.SucursalOrigen.Guid.String()
	if tipoPedidoGuid == models.TipoPedidoTraspasoGuid {
		var tr models.Traspaso
		if err := r.db.Preload("SucursalOrigen").Preload("SucursalDestino").Preload("Estatus").Where("pedido_id = ?", pedido.ID).First(&tr).Error; err != nil {
			r.emitPedidoSyncStatus(pedidoID, false, "No se pudo cargar la transferencia")
			return
		}
		traspasoDto = &dto.TraspasoRequestDto{
			SucursalOrigenGuid:  tr.SucursalOrigen.Guid.String(),
			SucursalDestinoGuid: tr.SucursalDestino.Guid.String(),
			EstatusGuid:         tr.Estatus.Guid.String(),
			FechaEnvio:          tr.FechaEnvio,
			FechaRecepcion:      tr.FechaRecepcion,
			Sync:                tr.Sync,
		}
	}

	var pagosDto []dto.PagoRequestDto
	if tipoPedidoGuid == models.TipoPedidoVentaGuid {
		var pagos []models.Pago
		if err := r.db.Preload("Forma").Where("pedido_id = ?", pedido.ID).Find(&pagos).Error; err != nil {
			r.emitPedidoSyncStatus(pedidoID, false, "No se pudieron cargar los pagos de la venta")
			return
		}
		for _, pago := range pagos {
			pagosDto = append(pagosDto, dto.PagoRequestDto{
				PedidoGuid: pedido.Guid.String(), FormaPagoGuid: pago.Forma.Guid.String(),
				Fecha: pago.Fecha, Monto: pago.Monto, Saldo: pago.Saldo,
			})
		}
	}

	pedidoRequestDto := dto.PedidoRequestDto{
		SucursalOrigenGuid: sucursalOrigenGuid,
		PedidoGuid:         pedido.Guid.String(),
		EstatusGuid:        pedido.Estatus.Guid.String(),
		ClienteGuid:        pedido.Cliente.Guid.String(),
		TipoPedidoGuid:     tipoPedidoGuid,
		Folio:              pedido.Folio,
		Fecha:              pedido.Fecha,
		EsCredito:          pedido.EsCredito,
		Sync:               pedido.Sync,
		Comentarios:        pedido.Comentarios,
		PedidoDetalle:      pedidoDetalleDto,
		Pagos:              pagosDto,
		Traspaso:           traspasoDto,
	}

	payload, err := json.Marshal(pedidoRequestDto)
	if err != nil {
		r.emitPedidoSyncStatus(pedidoID, false, "No se pudo convertir el pedido a JSON")
		return
	}

	resp, err := r.cloudHTTPClient.Post(r.cloudAPIURL+"/pedidos/registrar", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		r.emitPedidoSyncStatus(pedidoID, false, "No se pudo conectar con el servidor: "+err.Error())
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		r.emitPedidoSyncStatus(pedidoID, false, fmt.Sprintf("Cloud respondió %d: %s", resp.StatusCode, strings.TrimSpace(string(body))))
		return
	}
	if err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Pedido{}).Where("id = ?", pedidoID).Update("sync", true).Error; err != nil {
			return err
		}
		if tipoPedidoGuid == models.TipoPedidoVentaGuid {
			if err := tx.Model(&models.Pago{}).Where("pedido_id = ?", pedidoID).Update("sync", true).Error; err != nil {
				return err
			}
		}
		if tipoPedidoGuid == models.TipoPedidoTraspasoGuid {
			if err := tx.Model(&models.Traspaso{}).Where("pedido_id = ?", pedidoID).Update("sync", true).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		r.emitPedidoSyncStatus(pedidoID, false, "El pedido llegó a Cloud, pero no pudo marcarse como sincronizado")
		return
	}
	r.emitPedidoSyncStatus(pedidoID, true, "Sincronizado correctamente")
}

func (r *PosRepository) emitPedidoSyncStatus(pedidoID uint, success bool, message string) {
	if success {
		log.Printf("[PedidoSync] pedido=%d estado=OK detalle=%s", pedidoID, message)
	} else {
		log.Printf("[PedidoSync] pedido=%d estado=ERROR detalle=%s", pedidoID, message)
	}
	if r.ctx == nil {
		return
	}
	payload := map[string]interface{}{"pedido_id": pedidoID, "success": success}
	if success {
		payload["message"] = message
	} else {
		payload["error"] = message
	}
	runtime.EventsEmit(r.ctx, "sync_status", payload)
}
