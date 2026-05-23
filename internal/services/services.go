package services

import (
	"BitComercio/internal/repository"
	"context"
	"log"

	"gorm.io/gorm"
)

// apiCloudBaseURL es la URL base del API de Kommerze Cloud.
// Valor fijo del sistema; no varía por instalación.
const apiCloudBaseURL = "https://kommerze-cloud-api.developers-lab.com"

type Services struct {
	Sync                *SyncService
	Pos                 *PosService
	Auth                *AuthService
	Clientes            *ClientesService
	License             *LicenseService
	OperacionesSucursal *OperacionesSucursalService
	Catalogos           *CatalogosService
	Cloud               *ApiCloudService
	LocalServer         *LocalServerService
	Cotizacion          *CotizacionService
	// En modo Caja, los servicios directos quedan nil; se usa CajaProxy.
	CajaProxy *CajaProxyService
}

func (s *Services) SetContext(ctx context.Context) {
	if s.Pos != nil {
		s.Pos.SetContext(ctx)
	}
	if s.Cotizacion != nil {
		s.Cotizacion.SetContext(ctx)
	}
	if s.CajaProxy != nil {
		s.CajaProxy.SetContext(ctx)
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
	apiURL := apiCloudBaseURL
	cloudClient := NewCloudHttpClient(apiURL)

	pos := NewPosService(db, ctx)
	auth := NewAuthService(repoUsuarios)
	catalogos := NewCatalogosService(repo)
	clientes := NewClientesService(db)
	cotizacion := NewCotizacionService(db, apiURL, cloudClient)

	// Levantar servidor HTTP interno para que las Cajas se conecten
	localServer := NewLocalServerService(pos, auth, catalogos, clientes, cotizacion)
	cotizacion.SetBroadcast(localServer.BroadcastToClients)
	go localServer.Start(":8989")
	log.Printf("[Services] Modo SERVIDOR LOCAL — API interna activa en :8989")

	// Arrancar WebSocket al cloud para recibir resoluciones de cotizaciones
	cfgWS, errWS := LoadKommerzConfig()
	if errWS == nil && cfgWS.License != nil && cfgWS.License.Sucursal.Guid != "" {
		cotizacion.ConnectWS(cfgWS.License.Sucursal.Guid)
	}

	return &Services{
		Sync:                NewSyncService(db, repo, repoPrecios, apiURL, cloudClient),
		Pos:                 pos,
		Auth:                auth,
		Clientes:            clientes,
		License:             NewLicenseService(db, apiURL),
		OperacionesSucursal: NewOperacionesSucursalService(db),
		Catalogos:           catalogos,
		Cloud:               NewApiCloudService(apiURL, repo, cloudClient),
		LocalServer:         localServer,
		Cotizacion:          cotizacion,
	}
}
