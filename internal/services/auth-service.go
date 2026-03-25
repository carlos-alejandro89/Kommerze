package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository"
	"BitComercio/internal/security"
	"errors"
	"fmt"
)

type AuthService struct {
	userRepo *repository.UsuarioRepository
}

func NewAuthService(userRepo *repository.UsuarioRepository) *AuthService {
	return &AuthService{userRepo: userRepo}
}

// Login intenta iniciar sesión
func (s *AuthService) LoginService(username, password string) (*models.Usuario, error) {
	user, err := s.userRepo.FindByUsername(username)
	if err != nil {
		return nil, errors.New("usuario o contraseña incorrectos")
	}

	// Verificar contraseña
	if err := security.CheckPassword(password, user.Password); err != nil {
		return nil, errors.New("usuario o contraseña incorrectos")
	}

	return user, nil
}

// Register registra un nuevo usuario
func (s *AuthService) Register(username, password, role string) (*models.Usuario, error) {
	// Verificar si el usuario ya existe
	_, err := s.userRepo.FindByUsername(username)
	if err == nil {
		return nil, fmt.Errorf("el usuario '%s' ya existe", username)
	}

	// Generar hash de la contraseña
	hash, err := security.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("error al generar hash de contraseña: %w", err)
	}

	// Crear usuario
	user := &models.Usuario{
		CorreoElectronico: username,
		Password:          hash,
		Nombre:            "",
		PerfilID:          1,
	}

	return s.userRepo.Create(user)
}

func (s *AuthService) ResetPassword(username, password string) (*models.Usuario, error) {
	user, err := s.userRepo.FindByUsername(username)
	if err != nil {
		return nil, errors.New("usuario no encontrado")
	}

	hash, err := security.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("error al generar hash de contraseña: %w", err)
	}

	user.Password = hash
	return s.userRepo.Update(user)
}
