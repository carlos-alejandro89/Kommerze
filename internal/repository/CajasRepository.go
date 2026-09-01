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

func (c *CajasRepository) ObtenerPorClave(clave string) (*models.Caja, error) {
	var caja models.Caja
	if err := c.db.Where("clave = ? AND activa = ? AND deleted_at IS NULL", clave, true).First(&caja).Error; err != nil {
		return nil, err
	}
	return &caja, nil
}
