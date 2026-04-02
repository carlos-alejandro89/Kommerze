package repository

import (
	"BitComercio/internal/models"
	"errors"

	gorm "gorm.io/gorm"
)

type CajasRepository struct {
	db *gorm.DB
}

func NewCajasRepository(db *gorm.DB) *CajasRepository {
	return &CajasRepository{db: db}
}

func (c *CajasRepository) ActivarCaja(caja models.Caja) error {

	result := c.db.Where("clave = ?", caja.Clave).Find(&caja)

	if result.RowsAffected > 0 {
		return errors.New("Caja activada previamente")
	}

	c.db.Create(&caja)

	return nil
}
