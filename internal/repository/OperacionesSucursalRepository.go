package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"

	gorm "gorm.io/gorm"
)

type OperacionesSucursalRepository struct {
	db *gorm.DB
}

func NewOperacionesSucursalRepository(db *gorm.DB) *OperacionesSucursalRepository {
	return &OperacionesSucursalRepository{db: db}
}

func (o *OperacionesSucursalRepository) ObtenerOperacionSucursal(licencia string) *dto.ResponseDto {
	var sucursal models.Sucursal

	err := o.db.Where("licencia = ?", licencia).First(&sucursal).Error
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	var operaciones []models.OperacionSucursal
	err = o.db.Where("sucursal_id = ?", sucursal.ID).Where("estatus_id = ?", 1).Find(&operaciones).Error
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	return dto.NewResponseDto(true, "Operaciones obtenidas correctamente", operaciones, nil)
}
