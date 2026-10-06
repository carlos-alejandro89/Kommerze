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
	if err := u.db.Preload("Perfil").Where("correo_electronico = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindPermissionKeysByProfile obtiene en una sola consulta las capacidades
// efectivamente concedidas al perfil que inició sesión.
func (u *UsuarioRepository) FindPermissionKeysByProfile(perfilID uint) ([]string, error) {
	keys := make([]string, 0)
	err := u.db.Table("perfil_permisos AS pp").
		Select("ps.clave").
		Joins("JOIN permisos_sistema AS ps ON ps.id = pp.permiso_id").
		Joins("JOIN modulos_sistema AS ms ON ms.id = ps.modulo_id").
		Where("pp.perfil_id = ? AND pp.permitido = ? AND ps.activo = ? AND ms.activo = ?", perfilID, true, true, true).
		Where("pp.deleted_at IS NULL AND ps.deleted_at IS NULL AND ms.deleted_at IS NULL").
		Order("ps.clave ASC").
		Pluck("ps.clave", &keys).Error
	return keys, err
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
