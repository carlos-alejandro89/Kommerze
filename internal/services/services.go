package services

import (
	"BitComercio/internal/repository"
	"os"

	"gorm.io/gorm"
)

type Services struct {
	Sync    *SyncService
	Pos     *PosService
	Auth    *AuthService
	License *LicenseService
}

func NewServices(db *gorm.DB) *Services {
	repo := repository.NewCatalogosRepository(db)
	repoPrecios := repository.NewListaPreciosRepository(db)
	repoUsuarios := repository.NewUsuarioRepository(db)
	apiURL := os.Getenv("API_BASE_URL")

	return &Services{
		Sync:    NewSyncService(db, repo, repoPrecios, apiURL),
		Pos:     NewPosService(db),
		Auth:    NewAuthService(repoUsuarios),
		License: NewLicenseService(apiURL),
	}
}
