package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PosService struct {
	db            *gorm.DB
	posRepository *repository.PosRepository
}

func NewPosService(db *gorm.DB) *PosService {
	return &PosService{
		db:            db,
		posRepository: repository.NewPosRepository(db),
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
