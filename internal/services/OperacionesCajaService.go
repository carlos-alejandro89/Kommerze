package services

import (
	"encoding/base64"
	"fmt"

	"BitComercio/internal/models"
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
	"BitComercio/internal/usecases/reports/renders"

	"gorm.io/gorm"
)

// OperacionesCajaService gestiona la apertura y cierre de turnos de cajero.
type OperacionesCajaService struct {
	repo      *repository.OperacionesCajaRepository
	cajasRepo *repository.CajasRepository
}

func NewOperacionesCajaService(db *gorm.DB) *OperacionesCajaService {
	return &OperacionesCajaService{
		repo:      repository.NewOperacionesCajaRepository(db),
		cajasRepo: repository.NewCajasRepository(db),
	}
}

func (s *OperacionesCajaService) ObtenerCajaConfigurada(clave string) (*models.Caja, error) {
	return s.cajasRepo.ObtenerPorClave(clave)
}

// AbrirCaja inicia el turno de un cajero.
func (s *OperacionesCajaService) AbrirCaja(datos dto.AbrirCajaDto) *dto.ResponseDto {
	return s.repo.AbrirCaja(datos)
}

// CerrarCaja finaliza el turno del cajero con los montos capturados.
func (s *OperacionesCajaService) CerrarCaja(datos dto.CerrarCajaDto) *dto.ResponseDto {
	result := s.repo.CerrarCaja(datos)
	if result == nil || !result.Success {
		return result
	}
	reporte, err := s.repo.ConstruirReporteCierreCaja(datos.OperacionCajeroID)
	if err != nil {
		return dto.NewResponseDto(true, "Caja cerrada, pero no se pudo generar el reporte", map[string]any{"operacion": result.Data}, []string{err.Error()})
	}
	pdf, err := renders.RenderCashClosingPDF(reporte)
	if err != nil {
		return dto.NewResponseDto(true, "Caja cerrada, pero no se pudo generar el reporte", map[string]any{"operacion": result.Data}, []string{err.Error()})
	}
	return dto.NewResponseDto(true, result.Message, map[string]any{
		"operacion": result.Data, "pdfBase64": base64.StdEncoding.EncodeToString(pdf),
		"pdfFileName": fmt.Sprintf("cierre-caja-%d.pdf", datos.OperacionCajeroID),
	}, nil)
}

// ObtenerOperacionesCajero devuelve todos los turnos de una jornada de sucursal.
func (s *OperacionesCajaService) ObtenerOperacionesCajero(operacionSucursalID uint) *dto.ResponseDto {
	return s.repo.ObtenerOperacionesCajero(operacionSucursalID)
}

// ObtenerOperacionCajeroActiva devuelve el turno activo del cajero indicado.
func (s *OperacionesCajaService) ObtenerOperacionCajeroActiva(responsableID uint) *dto.ResponseDto {
	return s.repo.ObtenerOperacionCajeroActiva(responsableID)
}

// ObtenerResumenCajero calcula y devuelve el resumen de ingresos del turno
// para mostrarlo en el formulario de cierre antes de confirmar.
func (s *OperacionesCajaService) ObtenerResumenCajero(operacionCajeroID uint) *dto.ResponseDto {
	return s.repo.ObtenerResumenCajero(operacionCajeroID)
}
