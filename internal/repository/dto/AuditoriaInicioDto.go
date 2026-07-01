package dto

import "BitComercio/internal/models"

type AuditoriaInicioDto struct {
	Auditoria models.Auditoria       `json:"auditoria"`
	Productos []AuditoriaProductoDto `json:"productos"`
}
