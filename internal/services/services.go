package services

import (
	"BitComercio/internal/repository"
	"context"
	"os"

	"gorm.io/gorm"
)

type Services struct {
	Sync                *SyncService
	Pos                 *PosService
	Auth                *AuthService
	License             *LicenseService
	OperacionesSucursal *OperacionesSucursalService
	Catalogos           *CatalogosService
	Cloud               *ApiCloudService
}

func (s *Services) SetContext(ctx context.Context) {
	s.Pos.SetContext(ctx)
}

func NewServices(db *gorm.DB, ctx context.Context) *Services {
	repo := repository.NewCatalogosRepository(db)
	repoPrecios := repository.NewListaPreciosRepository(db)
	repoUsuarios := repository.NewUsuarioRepository(db)
	apiURL := os.Getenv("API_BASE_URL")
	cloudClient := NewCloudHttpClient(apiURL)

	return &Services{
		Sync:                NewSyncService(db, repo, repoPrecios, apiURL, cloudClient),
		Pos:                 NewPosService(db, ctx),
		Auth:                NewAuthService(repoUsuarios),
		License:             NewLicenseService(db, apiURL),
		OperacionesSucursal: NewOperacionesSucursalService(db),
		Catalogos:           NewCatalogosService(repo),
		Cloud:               NewApiCloudService(apiURL, repo, cloudClient),
	}
}
