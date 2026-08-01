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

// ObtenerOperacionSucursalActiva devuelve la jornada activa de la sucursal.
func (o *OperacionesSucursalService) ObtenerOperacionSucursalActiva(sucursalID uint) *dto.ResponseDto {
	return o.operacionesSucursalRepo.ObtenerOperacionSucursalActiva(sucursalID)
}

func (o *OperacionesSucursalService) ObtenerResumenVentasOperacion(sucursalID uint) *dto.ResponseDto {
	return o.operacionesSucursalRepo.ObtenerResumenVentasOperacion(sucursalID)
}

// CerrarOperacionSucursal calcula acumulados automáticamente y cierra la jornada.
func (o *OperacionesSucursalService) CerrarOperacionSucursal(datos dto.CerrarOperacionSucursalDto) *dto.ResponseDto {
	return o.operacionesSucursalRepo.CerrarOperacionSucursal(datos)
}
