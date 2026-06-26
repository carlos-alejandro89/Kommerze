package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"

	"gorm.io/gorm"
)

type AuditoriaSucursalRepository struct {
	db *gorm.DB
}

func NewAuditoriaSucursalRepository(db *gorm.DB) *AuditoriaSucursalRepository {
	return &AuditoriaSucursalRepository{db: db}
}

type ResumenInventario struct {
	ValorInventario float64 `gorm:"column:valor_inventario"`
	TotalItems      int64   `gorm:"column:total_items"`
}

func (a *AuditoriaSucursalRepository) ObtenerResumenInventario() *dto.ResponseDto {
	var resumen ResumenInventario

	err := a.db.
		Model(&models.SucursalProducto{}).
		Select(`
			COALESCE(SUM(precio_venta * existencia), 0) AS valor_inventario,
			COUNT(*) AS total_items
		`).
		Scan(&resumen).Error

	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	return dto.NewResponseDto(
		true,
		"Resumen de inventario obtenido correctamente",
		resumen,
		nil,
	)
}
