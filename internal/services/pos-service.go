package services

import (
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"

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
