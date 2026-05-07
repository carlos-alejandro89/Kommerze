package main

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"BitComercio/internal/services"
	requestdto "BitComercio/internal/services/requestDto"
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gorm.io/gorm"
)

// App struct
type App struct {
	ctx      context.Context
	db       *gorm.DB
	services *services.Services
}

// NewApp creates a new App application struct
func NewApp(db *gorm.DB, svc *services.Services) *App {
	return &App{
		db:       db,
		services: svc,
	}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.services.SetContext(ctx)
}

// ── Helpers internos para soporte dual (Servidor Local / Caja) ────────────────

// posService devuelve el servicio POS correcto según el rol del dispositivo.
func (a *App) posService() interface {
	ConsultaProductos(string) ([]dto.ProductoDto, error)
	ObtenerTiposPedido() ([]models.TipoPedido, error)
	ConsultarExistenciaProductos([]uuid.UUID) ([]dto.InventarioDto, error)
	ConfirmarTransaccion(*uint, []dto.PagosAplicadosDto, []dto.PedidoProductoDto, *uint, *uint) (*dto.ResponseDto, error)
	ConsultaTransacciones() (*dto.ResponseDto, error)
} {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy
	}
	return a.services.Pos
}

func (a *App) authService() interface {
	LoginService(string, string) (*models.Usuario, error)
	ResetPassword(string, string) (*models.Usuario, error)
} {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy
	}
	return a.services.Auth
}

func (a *App) catalogosService() interface {
	GetEmpaques() (*dto.ResponseDto, error)
	GetMarcas() (*dto.ResponseDto, error)
	GetLineas() (*dto.ResponseDto, error)
	GetSatProductos() (*dto.ResponseDto, error)
	GetSatFormasPago() (*dto.ResponseDto, error)
	GetSatMetodosPago() (*dto.ResponseDto, error)
	GetSatRegimenFiscal() (*dto.ResponseDto, error)
	GetSatUsosCFDI() (*dto.ResponseDto, error)
	GetSucursales() (*dto.ResponseDto, error)
} {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy
	}
	return a.services.Catalogos
}

// ── Sync (solo Servidor Local) ────────────────────────────────────────────────

func (a *App) SyncLineas() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncLinea()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncEmpaques() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncEmpaques()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncMarcas() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncMarcas()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSatProductos() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncSatProductos()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncProductos() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncProductos()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncNivelesEmpaque() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncNivelesEmpaque()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSatFormasPago() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncSatFormasPago()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSatMetodosPago() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncSatMetodosPago()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSatUsosCfdi() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncSatUsosCfdi()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSatRegimenFiscal() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncSatRegimenFiscal()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", err
}

func (a *App) SyncEmpresas() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncEmpresas()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSucursales() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncSucursales()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSucursalProductos(parameters map[string]any) (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncSucursalProductos(parameters)
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

// ── POS ───────────────────────────────────────────────────────────────────────

func (a *App) ServiceConsultaProductos(busqueda string) ([]dto.ProductoDto, error) {
	return a.posService().ConsultaProductos(busqueda)
}

func (a *App) ServiceObtenerTiposPedido() ([]models.TipoPedido, error) {
	return a.posService().ObtenerTiposPedido()
}

func (a *App) ServiceConsultarExistenciaProductos(productosGuids []uuid.UUID) ([]dto.InventarioDto, error) {
	return a.posService().ConsultarExistenciaProductos(productosGuids)
}

func (a *App) ServiceConfirmarTransaccion(tipoOperacion *uint, pagosAplicados []dto.PagosAplicadosDto, itemsPedido []dto.PedidoProductoDto, sucursalOrigen *uint, sucursalDestino *uint) (*dto.ResponseDto, error) {
	return a.posService().ConfirmarTransaccion(tipoOperacion, pagosAplicados, itemsPedido, sucursalOrigen, sucursalDestino)
}

func (a *App) ServiceConsultaTransacciones() (*dto.ResponseDto, error) {
	return a.posService().ConsultaTransacciones()
}

// ── Auth ──────────────────────────────────────────────────────────────────────

func (a *App) ServiceLogin(username, password string) (*models.Usuario, error) {
	return a.authService().LoginService(username, password)
}

func (a *App) ServiceResetPassword(username, password string) (*models.Usuario, error) {
	return a.authService().ResetPassword(username, password)
}

// ── License (solo Servidor Local) ─────────────────────────────────────────────

func (a *App) ServiceGetMachineID() (string, error) {
	return services.GetMachineID()
}

func (a *App) ServiceActivateLicense(licenseKey requestdto.ActivateLicenseRequest) (any, error) {
	if a.services.License == nil {
		return nil, fmt.Errorf("activación de licencia no disponible en modo Caja")
	}
	return a.services.License.ActivateLicense(licenseKey)
}

func (a *App) ServiceVerifyLicense() *dto.ResponseDto {
	return services.VerifyLicense()
}

// ── Operaciones Sucursal (solo Servidor Local) ────────────────────────────────

func (a *App) ServiceObtenerOperacionSucursal(licencia string) *dto.ResponseDto {
	if a.services.OperacionesSucursal == nil {
		return dto.NewResponseDto(false, "No disponible en modo Caja", nil, nil)
	}
	return a.services.OperacionesSucursal.ObtenerOperacionSucursal(licencia)
}

func (a *App) ServiceObtenerValorInventario() *dto.ResponseDto {
	if a.services.OperacionesSucursal == nil {
		return dto.NewResponseDto(false, "No disponible en modo Caja", nil, nil)
	}
	return a.services.OperacionesSucursal.ObtenerValorInventario()
}

func (a *App) ServiceSucursalInicioOperacion(datos dto.SucursalInicioOperacionesDto) *dto.ResponseDto {
	if a.services.OperacionesSucursal == nil {
		return dto.NewResponseDto(false, "No disponible en modo Caja", nil, nil)
	}
	return a.services.OperacionesSucursal.SucursalInicioOperacion(datos)
}

// ── Catálogos ─────────────────────────────────────────────────────────────────

func (a *App) ServiceGetEmpaques() (*dto.ResponseDto, error) {
	return a.catalogosService().GetEmpaques()
}

func (a *App) ServiceGetMarcas() (*dto.ResponseDto, error) {
	return a.catalogosService().GetMarcas()
}

func (a *App) ServiceGetLineas() (*dto.ResponseDto, error) {
	return a.catalogosService().GetLineas()
}

func (a *App) ServiceGetSatProductos() (*dto.ResponseDto, error) {
	return a.catalogosService().GetSatProductos()
}

func (a *App) ServiceGetSatFormasPago() (*dto.ResponseDto, error) {
	return a.catalogosService().GetSatFormasPago()
}

func (a *App) ServiceGetSatMetodosPago() (*dto.ResponseDto, error) {
	return a.catalogosService().GetSatMetodosPago()
}

func (a *App) ServiceGetSatRegimenFiscal() (*dto.ResponseDto, error) {
	return a.catalogosService().GetSatRegimenFiscal()
}

func (a *App) ServiceGetSatUsosCFDI() (*dto.ResponseDto, error) {
	return a.catalogosService().GetSatUsosCFDI()
}

func (a *App) ServiceGetSucursales() (*dto.ResponseDto, error) {
	return a.catalogosService().GetSucursales()
}

// ── Cloud (solo Servidor Local) ───────────────────────────────────────────────

func (a *App) ServiceApiCrearProducto(producto requestdto.ProductoCreate) (*dto.ResponseDto, error) {
	if a.services.Cloud == nil {
		return nil, fmt.Errorf("operación no disponible en modo Caja")
	}
	return a.services.Cloud.ApiCreateProducto(producto), nil
}

func (a *App) ServiceSaveCloudCredentials(email, password string) error {
	return services.SaveCloudCredentials(email, password)
}

func (a *App) ServiceLoadCloudCredentials() (*services.CloudCredentials, error) {
	return services.LoadCloudCredentials()
}

// ── Device Config (nuevo) ─────────────────────────────────────────────────────

// ServiceGetKommerzConfig devuelve la configuración del dispositivo al frontend.
func (a *App) ServiceGetKommerzConfig() (*services.KommerzConfig, error) {
	return services.LoadKommerzConfig()
}

// ServiceSaveKommerzConfig persiste la configuración del dispositivo.
func (a *App) ServiceSaveKommerzConfig(cfg services.KommerzConfig) error {
	return services.SaveKommerzConfig(&cfg)
}

// ServiceGetSucursalGuid devuelve el GUID de la sucursal guardado en kommerze_config.json.
// Lo usa el frontend para construir endpoints como /lista-precios/get-precios/{guid}.
func (a *App) ServiceGetSucursalGuid() string {
	cfg, err := services.LoadKommerzConfig()
	if err != nil || cfg.License == nil {
		return ""
	}
	return cfg.License.Sucursal.Guid
}

// ServiceTestLocalServerConnection verifica que el Servidor Local responda.
func (a *App) ServiceTestLocalServerConnection(serverURL string) *dto.ResponseDto {
	data, err := services.TestLocalServerConnection(serverURL)
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	return dto.NewResponseDto(true, "Conexión exitosa al Servidor Local", data, nil)
}

// ServiceRestartApp cierra la aplicación para que el usuario la reabra
// con los servicios inicializados según el rol guardado en kommerze_config.json.
func (a *App) ServiceRestartApp() {
	runtime.Quit(a.ctx)
}
