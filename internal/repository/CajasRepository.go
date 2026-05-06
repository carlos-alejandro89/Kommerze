package repository

import (
	"BitComercio/internal/models"

	gorm "gorm.io/gorm"
)

type CajasRepository struct {
	db *gorm.DB
}

func NewCajasRepository(db *gorm.DB) *CajasRepository {
	return &CajasRepository{db: db}
}

func (c *CajasRepository) ActivarCaja(caja models.Caja) error {
	result := c.db.
		Where(models.Caja{Clave: caja.Clave}).
		Assign(models.Caja{
			Nombre:   caja.Nombre,
			Licencia: caja.Licencia,
			Activa:   caja.Activa,
		}).
		FirstOrCreate(&caja)

	if result.Error != nil {
		return result.Error
	}

	return nil
}
