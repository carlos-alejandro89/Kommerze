package services

import (
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"

	"gorm.io/gorm"
)

type OperacionesSucursalService struct {
	operacionesSucursalRepo *repository.OperacionesSucursalRepository
}

func NewOperacionesSucursalService(db *gorm.DB) *OperacionesSucursalService {
	return &OperacionesSucursalService{
		operacionesSucursalRepo: repository.NewOperacionesSucursalRepository(db),
	}
}

func (o *OperacionesSucursalService) ObtenerOperacionSucursal(sucursalID string) *dto.ResponseDto {
	return o.operacionesSucursalRepo.ObtenerOperacionSucursal(sucursalID)
}

func (o *OperacionesSucursalService) ObtenerValorInventario() *dto.ResponseDto {
	return o.operacionesSucursalRepo.ObtenerValorInventario()
}

func (o *OperacionesSucursalService) SucursalInicioOperacion(datos dto.SucursalInicioOperacionesDto) *dto.ResponseDto {
	return o.operacionesSucursalRepo.SucursalInicioOperacion(datos)
}
