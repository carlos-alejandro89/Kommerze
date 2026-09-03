package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PosService struct {
	db            *gorm.DB
	posRepository *repository.PosRepository
}

func (s *PosService) SetContext(ctx context.Context) {
	s.posRepository.SetContext(ctx)
}

func NewPosService(db *gorm.DB, ctx context.Context, apiURL string, cloudClient *CloudHttpClient) *PosService {
	return &PosService{
		db:            db,
		posRepository: repository.NewPosRepository(db, ctx, apiURL, cloudClient),
	}
}

func (s *PosService) SyncPedido(pedidoID uint) {
	s.posRepository.CloudSync(pedidoID)
}

func (s *PosService) SyncPedidosPendientes() {
	var pedidoIDs []uint
	err := s.db.Model(&models.Pedido{}).
		Joins("JOIN tipos_pedido ON tipos_pedido.id = pedidos.tipo_pedido_id").
		Where("pedidos.sync = ? AND tipos_pedido.guid IN ?", false, []string{
			models.TipoPedidoVentaGuid,
			models.TipoPedidoCotizacionGuid,
			models.TipoPedidoBajaMercanciaGuid,
			models.TipoPedidoTraspasoGuid,
		}).
		Order("pedidos.id ASC").
		Pluck("pedidos.id", &pedidoIDs).Error
	if err != nil {
		log.Printf("[PedidoSync] no se pudieron consultar pendientes: %v", err)
		return
	}
	for _, pedidoID := range pedidoIDs {
		s.SyncPedido(pedidoID)
	}
}

func StartSyncPedidosTicker(pos *PosService) {
	go func() {
		pos.SyncPedidosPendientes()
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			pos.SyncPedidosPendientes()
		}
	}()
}

func (s *PosService) ConsultaProductos(busqueda string, conExistencia bool) ([]dto.ProductoDto, error) {
	response, err := s.posRepository.ConsultaProductos(busqueda, conExistencia)
	return response, err
}

func (s *PosService) ObtenerTiposPedido() ([]models.TipoPedido, error) {
	response, err := s.posRepository.ObtenerTiposPedido()
	return response, err
}

func (s *PosService) ConsultarExistenciaProductos(productosGuids []uuid.UUID) ([]dto.InventarioDto, error) {
	response, err := s.posRepository.ConsultarExistenciaProductos(productosGuids)
	return response, err
}

func (s *PosService) ConfirmarTransaccion(tipoOperacion *uint, pagosAplicados []dto.PagosAplicadosDto, itemsPedido []dto.PedidoProductoDto, sucursalOrigen *uint, sucursalDestino *uint, operacionCajeroID *uint, clienteGuid string) (*dto.ResponseDto, error) {
	response, err := s.posRepository.ConfirmarTransaccion(tipoOperacion, pagosAplicados, itemsPedido, sucursalOrigen, sucursalDestino, operacionCajeroID, clienteGuid)
	return response, err
}

func (s *PosService) CrearSolicitudProductos(solicitud dto.SolicitudProductosDto) (*dto.ResponseDto, error) {
	return s.posRepository.CrearSolicitudProductos(solicitud)
}

func (s *PosService) ConsultaTransacciones(tipoPedidoID *uint, sucursalID *uint) (*dto.ResponseDto, error) {
	response, err := s.posRepository.ConsultaTransacciones(tipoPedidoID, sucursalID)
	return response, err
}

func (s *PosService) CancelarVenta(pedidoGuid string) (*dto.ResponseDto, error) {
	return s.posRepository.CancelarVenta(pedidoGuid)
}

func (s *PosService) ConsultarTransferencias() ([]dto.TransferenciaDto, error) {
	return s.posRepository.ConsultarTransferencias()
}
