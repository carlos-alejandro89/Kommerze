package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
	"context"

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

func NewPosService(db *gorm.DB, ctx context.Context) *PosService {
	return &PosService{
		db:            db,
		posRepository: repository.NewPosRepository(db, ctx),
	}
}

func (s *PosService) ConsultaProductos(busqueda string) ([]dto.ProductoDto, error) {
	response, err := s.posRepository.ConsultaProductos(busqueda)
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

func (s *PosService) ConfirmarTransaccion(tipoOperacion *uint, pagosAplicados []dto.PagosAplicadosDto, itemsPedido []dto.PedidoProductoDto, sucursalOrigen *uint, sucursalDestino *uint) (*dto.ResponseDto, error) {
	response, err := s.posRepository.ConfirmarTransaccion(tipoOperacion, pagosAplicados, itemsPedido, sucursalOrigen, sucursalDestino)
	return response, err
}

func (s *PosService) ConsultaTransacciones() (*dto.ResponseDto, error) {
	response, err := s.posRepository.ConsultaTransacciones()
	return response, err
}
