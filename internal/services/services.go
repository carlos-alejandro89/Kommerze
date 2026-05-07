package services

import (
	"BitComercio/internal/repository"
	"context"
	"log"
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
	LocalServer         *LocalServerService
	// En modo Caja, los servicios directos quedan nil; se usa CajaProxy.
	CajaProxy *CajaProxyService
}

func (s *Services) SetContext(ctx context.Context) {
	if s.Pos != nil {
		s.Pos.SetContext(ctx)
	}
}

// NewServices inicializa los servicios según el rol del dispositivo.
// Modo Servidor Local: comportamiento actual + levanta HTTP :8989.
// Modo Caja: solo CajaProxyService (stateless, sin BD).
func NewServices(db *gorm.DB, ctx context.Context, cfg *KommerzConfig) *Services {
	if cfg.Role == RoleCaja {
		proxy := NewCajaProxyService(cfg.LocalServerURL)
		log.Printf("[Services] Modo CAJA — Servidor Local: %s", cfg.LocalServerURL)
		return &Services{CajaProxy: proxy}
	}

	// ── Servidor Local (comportamiento actual) ──────────────────────────────
	repo := repository.NewCatalogosRepository(db)
	repoPrecios := repository.NewListaPreciosRepository(db)
	repoUsuarios := repository.NewUsuarioRepository(db)
	apiURL := os.Getenv("API_BASE_URL")
	cloudClient := NewCloudHttpClient(apiURL)

	pos := NewPosService(db, ctx)
	auth := NewAuthService(repoUsuarios)
	catalogos := NewCatalogosService(repo)

	// Levantar servidor HTTP interno para que las Cajas se conecten
	localServer := NewLocalServerService(pos, auth, catalogos)
	go localServer.Start(":8989")
	log.Printf("[Services] Modo SERVIDOR LOCAL — API interna activa en :8989")

	return &Services{
		Sync:                NewSyncService(db, repo, repoPrecios, apiURL, cloudClient),
		Pos:                 pos,
		Auth:                auth,
		License:             NewLicenseService(db, apiURL),
		OperacionesSucursal: NewOperacionesSucursalService(db),
		Catalogos:           catalogos,
		Cloud:               NewApiCloudService(apiURL, repo, cloudClient),
		LocalServer:         localServer,
	}
}
