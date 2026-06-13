package services

import (
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"

	"gorm.io/gorm"
)

// OperacionesCajaService gestiona la apertura y cierre de turnos de cajero.
type OperacionesCajaService struct {
	repo *repository.OperacionesCajaRepository
}

func NewOperacionesCajaService(db *gorm.DB) *OperacionesCajaService {
	return &OperacionesCajaService{
		repo: repository.NewOperacionesCajaRepository(db),
	}
}

// AbrirCaja inicia el turno de un cajero.
func (s *OperacionesCajaService) AbrirCaja(datos dto.AbrirCajaDto) *dto.ResponseDto {
	return s.repo.AbrirCaja(datos)
}

// CerrarCaja finaliza el turno del cajero con los montos capturados.
func (s *OperacionesCajaService) CerrarCaja(datos dto.CerrarCajaDto) *dto.ResponseDto {
	return s.repo.CerrarCaja(datos)
}

// ObtenerOperacionesCajero devuelve todos los turnos de una jornada de sucursal.
func (s *OperacionesCajaService) ObtenerOperacionesCajero(operacionSucursalID uint) *dto.ResponseDto {
	return s.repo.ObtenerOperacionesCajero(operacionSucursalID)
}

// ObtenerOperacionCajeroActiva devuelve el turno activo del cajero indicado.
func (s *OperacionesCajaService) ObtenerOperacionCajeroActiva(responsableID uint) *dto.ResponseDto {
	return s.repo.ObtenerOperacionCajeroActiva(responsableID)
}
