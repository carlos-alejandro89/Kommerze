package services

import (
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
)

type CatalogosService struct {
	repo *repository.CatalogosRepository
}

func NewCatalogosService(repo *repository.CatalogosRepository) *CatalogosService {
	return &CatalogosService{repo: repo}
}

func (s *CatalogosService) GetEmpaques() (*dto.ResponseDto, error) {
	return s.repo.GetEmpaques()
}

func (s *CatalogosService) GetMarcas() (*dto.ResponseDto, error) {
	return s.repo.GetMarcas()
}

func (s *CatalogosService) GetLineas() (*dto.ResponseDto, error) {
	return s.repo.GetLineas()
}

func (s *CatalogosService) GetSatProductos() (*dto.ResponseDto, error) {
	return s.repo.GetSatProductos()
}

func (s *CatalogosService) GetSatFormasPago() (*dto.ResponseDto, error) {
	return s.repo.GetSatFormasPago()
}

func (s *CatalogosService) GetSatMetodosPago() (*dto.ResponseDto, error) {
	return s.repo.GetSatMetodosPago()
}

func (s *CatalogosService) GetSatRegimenFiscal() (*dto.ResponseDto, error) {
	return s.repo.GetSatRegimenFiscal()
}

func (s *CatalogosService) GetSatUsosCFDI() (*dto.ResponseDto, error) {
	return s.repo.GetSatUsosCFDI()
}

func (s *CatalogosService) GetSucursales() (*dto.ResponseDto, error) {
	return s.repo.GetSucursales()
}
