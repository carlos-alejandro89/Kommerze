package services

import (
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
)

type AuditoriaService struct {
	auditoriaRepo *repository.AuditoriaSucursalRepository
}

func NewAuditoriaService(auditoriaRepo *repository.AuditoriaSucursalRepository) *AuditoriaService {
	return &AuditoriaService{auditoriaRepo: auditoriaRepo}
}

func (a *AuditoriaService) ObtenerResumenInventario() *dto.ResponseDto {
	return a.auditoriaRepo.ObtenerResumenInventario()
}

func (a *AuditoriaService) IniciarAuditoria(sucursalGuid string, usuarioEncargadoGuid string) *dto.ResponseDto {
	return a.auditoriaRepo.IniciarAuditoria(sucursalGuid, usuarioEncargadoGuid)
}
