package services

import (
	"BitComercio/internal/repository"
	"context"
	"log"

	"gorm.io/gorm"
)

const netPayBaseURL = "https://api-154.api-netpay.com"

type Services struct {
	Sync                *SyncService
	Pos                 *PosService
	Auth                *AuthService
	Clientes            *ClientesService
	Proveedores         *ProveedoresService
	License             *LicenseService
	Auditoria           *AuditoriaService
	OperacionesSucursal *OperacionesSucursalService
	OperacionesCaja     *OperacionesCajaService
	Catalogos           *CatalogosService
	Inventario          *InventarioService
	Cloud               *ApiCloudService
	LocalServer         *LocalServerService
	NetPayService       *NetPayService
	Cotizacion          *CotizacionService
	Receipt             *ReceiptService
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
	if s.Auditoria != nil {
		s.Auditoria.SetContext(ctx)
	}
	if s.NetPayService != nil {
		s.NetPayService.SetContext(ctx)
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
		return &Services{
			CajaProxy:  proxy,
			Inventario: NewInventarioService(nil),
		}
	}

	// ── Servidor Local (comportamiento actual) ──────────────────────────────
	apiURL := cfg.EffectiveCloudAPIURL()
	repo := repository.NewCatalogosRepository(db)
	repoPrecios := repository.NewListaPreciosRepository(db)
	repoUsuarios := repository.NewUsuarioRepository(db)
	repoInventario := repository.NewInventarioRepository(db)

	cloudClient := NewCloudHttpClient(apiURL)
	repoAuditoria := repository.NewAuditoriaSucursalRepository(apiURL, db, cloudClient)

	pos := NewPosService(db, ctx)
	auditoria := NewAuditoriaService(repoAuditoria, apiURL, cloudClient)
	auth := NewAuthService(repoUsuarios)
	catalogos := NewCatalogosService(repo)
	clientes := NewClientesService(db, apiURL, cloudClient)
	proveedores := NewProveedoresService(db, apiURL, cloudClient)
	cotizacion := NewCotizacionService(db, apiURL, cloudClient)
	receipt := NewReceiptService(db)
	operacionesCaja := NewOperacionesCajaService(db)
	operacionesSucursal := NewOperacionesSucursalService(db)
	netPayService := NewNetPayService(netPayBaseURL, apiURL, cloudClient)

	// Levantar servidor HTTP interno para que las Cajas se conecten
	localServer := NewLocalServerService(db, pos, auth, catalogos, clientes, proveedores, cotizacion, receipt, operacionesSucursal, operacionesCaja)
	cotizacion.SetBroadcast(localServer.BroadcastToClients)
	go localServer.Start(":8989")
	log.Printf("[Services] Modo SERVIDOR LOCAL — API interna activa en :8989")

	// Arrancar WebSocket al cloud para recibir resoluciones de cotizaciones
	cfgWS, errWS := LoadKommerzConfig()
	if errWS == nil && cfgWS.License != nil && cfgWS.License.Sucursal.Guid != "" {
		cotizacion.ConnectWS(cfgWS.License.Sucursal.Guid)
	}

	// Tarea periódica de sincronización de operaciones con la nube
	syncSvc := NewSyncService(db, repo, repoPrecios, apiURL, cloudClient)
	StartSyncOperacionesTicker(db, syncSvc)

	return &Services{
		Sync:                syncSvc,
		Pos:                 pos,
		Auditoria:           auditoria,
		Auth:                auth,
		Clientes:            clientes,
		Proveedores:         proveedores,
		License:             NewLicenseService(db, apiURL),
		OperacionesSucursal: operacionesSucursal,
		OperacionesCaja:     operacionesCaja,
		Catalogos:           catalogos,
		Inventario:          NewInventarioService(repoInventario),
		Cloud:               NewApiCloudService(apiURL, repo, cloudClient),
		LocalServer:         localServer,
		NetPayService:       netPayService,
		Cotizacion:          cotizacion,
		Receipt:             receipt,
	}
}
