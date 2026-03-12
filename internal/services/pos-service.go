package services

import (
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
	"fmt"

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
	fmt.Println(busqueda)
	response, err := s.posRepository.ConsultaProductos(busqueda)
	return response, err
}
