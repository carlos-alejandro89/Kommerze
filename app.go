package main

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"BitComercio/internal/services"
	requestdto "BitComercio/internal/services/requestDto"
	"context"

	"github.com/google/uuid"
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
// The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Funcion que se expone para interactuar con el frontend
func (a *App) SyncLineas() (string, error) {
	_, err := a.services.Sync.SyncLinea()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncEmpaques() (string, error) {
	_, err := a.services.Sync.SyncEmpaques()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncMarcas() (string, error) {
	_, err := a.services.Sync.SyncMarcas()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSatProductos() (string, error) {
	_, err := a.services.Sync.SyncSatProductos()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncProductos() (string, error) {
	_, err := a.services.Sync.SyncProductos()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncNivelesEmpaque() (string, error) {
	_, err := a.services.Sync.SyncNivelesEmpaque()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSatFormasPago() (string, error) {
	_, err := a.services.Sync.SyncSatFormasPago()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSatMetodosPago() (string, error) {
	_, err := a.services.Sync.SyncSatMetodosPago()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSatUsosCfdi() (string, error) {
	_, err := a.services.Sync.SyncSatUsosCfdi()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSatRegimenFiscal() (string, error) {
	_, err := a.services.Sync.SyncSatRegimenFiscal()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", err
}

func (a *App) SyncEmpresas() (string, error) {
	_, err := a.services.Sync.SyncEmpresas()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSucursales() (string, error) {
	_, err := a.services.Sync.SyncSucursales()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncSucursalProductos(parameters map[string]any) (string, error) {
	_, err := a.services.Sync.SyncSucursalProductos(parameters)
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) ServiceConsultaProductos(busqueda string) ([]dto.ProductoDto, error) {
	result, err := a.services.Pos.ConsultaProductos(busqueda)
	return result, err
}

func (a *App) ServiceObtenerTiposPedido() ([]models.TipoPedido, error) {
	result, err := a.services.Pos.ObtenerTiposPedido()
	//fmt.Println("result", result)
	return result, err
}

func (a *App) ServiceConsultarExistenciaProductos(productosGuids []uuid.UUID) ([]dto.InventarioDto, error) {
	result, err := a.services.Pos.ConsultarExistenciaProductos(productosGuids)
	return result, err
}

func (a *App) ServiceConfirmarTransaccion(tipoOperacion *uint, pagosAplicados []dto.PagosAplicadosDto, itemsPedido []dto.PedidoProductoDto) (*dto.ResponseDto, error) {
	result, err := a.services.Pos.ConfirmarTransaccion(tipoOperacion, pagosAplicados, itemsPedido)
	return result, err
}

func (a *App) ServiceLogin(username, password string) (*models.Usuario, error) {
	result, err := a.services.Auth.LoginService(username, password)
	return result, err
}

func (a *App) ServiceResetPassword(username, password string) (*models.Usuario, error) {
	result, err := a.services.Auth.ResetPassword(username, password)
	return result, err
}

func (a *App) ServiceGetMachineID() (string, error) {
	machineID, err := services.GetMachineID()
	if err != nil {
		return "", err
	}
	return machineID, nil
}

func (a *App) ServiceActivateLicense(licenseKey requestdto.ActivateLicenseRequest) (any, error) {
	result, err := a.services.License.ActivateLicense(licenseKey)
	return result, err
}

func (a *App) ServiceVerifyLicense() *dto.ResponseDto {
	return services.VerifyLicense()
}

func (a *App) ServiceObtenerOperacionSucursal(licencia string) *dto.ResponseDto {
	return a.services.OperacionesSucursal.ObtenerOperacionSucursal(licencia)
}

func (a *App) ServiceObtenerValorInventario() *dto.ResponseDto {
	return a.services.OperacionesSucursal.ObtenerValorInventario()
}

func (a *App) ServiceSucursalInicioOperacion(datos dto.SucursalInicioOperacionesDto) *dto.ResponseDto {
	return a.services.OperacionesSucursal.SucursalInicioOperacion(datos)
}
