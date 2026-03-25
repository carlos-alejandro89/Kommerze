package repository

import (
	"BitComercio/internal/models"

	"gorm.io/gorm"
)

type UsuarioRepository struct {
	db *gorm.DB
}

func NewUsuarioRepository(db *gorm.DB) *UsuarioRepository {
	return &UsuarioRepository{db: db}
}

func (u *UsuarioRepository) FindByUsername(username string) (*models.Usuario, error) {
	var user models.Usuario
	if err := u.db.Where("correo_electronico = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (u *UsuarioRepository) Create(user *models.Usuario) (*models.Usuario, error) {
	if err := u.db.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func (u *UsuarioRepository) Update(user *models.Usuario) (*models.Usuario, error) {
	if err := u.db.Save(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}
