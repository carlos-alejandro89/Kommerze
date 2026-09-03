package main

import (
	"BitComercio/internal/database"
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"BitComercio/internal/services"
	requestdto "BitComercio/internal/services/requestDto"
	reportmodels "BitComercio/internal/usecases/reports/models"
	"BitComercio/internal/usecases/reports/renders"
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gorm.io/gorm"
)

// App struct
type App struct {
	ctx      context.Context
	db       *gorm.DB
	services *services.Services
	setupMu  sync.Mutex
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
	ConsultaProductos(string, bool) ([]dto.ProductoDto, error)
	ObtenerTiposPedido() ([]models.TipoPedido, error)
	ConsultarExistenciaProductos([]uuid.UUID) ([]dto.InventarioDto, error)
	ConfirmarTransaccion(*uint, []dto.PagosAplicadosDto, []dto.PedidoProductoDto, *uint, *uint, *uint, string) (*dto.ResponseDto, error)
	CrearSolicitudProductos(dto.SolicitudProductosDto) (*dto.ResponseDto, error)
	ConsultaTransacciones(*uint, *uint) (*dto.ResponseDto, error)
	CancelarVenta(string) (*dto.ResponseDto, error)
	ConsultarTransferencias() ([]dto.TransferenciaDto, error)
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

// clientesService devuelve la implementación correcta según el modo del dispositivo.
// Servidor Local → ClientesService (acceso directo a BD)
// Caja           → CajaProxyService (HTTP al Servidor Local)
func (a *App) clientesService() interface {
	BuscarClientes(string) ([]dto.ClienteDto, error)
	ListarClientes() ([]dto.ClienteDto, error)
	ObtenerCliente(string) (*dto.ClienteDetalleDto, error)
	GuardarCliente(dto.GuardarClienteDto) (*dto.ClienteDetalleDto, error)
	ConsultarEntidadFiscalCloud(string) (*dto.ProveedorFiscalDto, error)
} {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy
	}
	return a.services.Clientes
}

func (a *App) proveedoresService() interface {
	BuscarProveedores(string) ([]dto.ProveedorFiscalDto, error)
	BuscarEntidadFiscalPorRFC(string) (*dto.ProveedorFiscalDto, error)
	GuardarProveedor(dto.GuardarProveedorDto) (*dto.ProveedorFiscalDto, error)
} {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy
	}
	return a.services.Proveedores
}

func (a *App) comprasService() interface {
	CrearCompra(dto.CrearCompraDto) (*dto.ResponseDto, error)
	ConsultarHistorial() ([]dto.CompraHistorialDto, error)
} {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy
	}
	return a.services.Compras
}

// cotizacionService devuelve la implementacion correcta segun el modo del dispositivo.
func (a *App) cotizacionService() interface {
	SolicitarAutorizacion(string, string, string, string, string, []dto.ItemDescuentoDto) (*dto.ResponseDto, error)
	ConvertirAVenta(uint, []dto.PagosAplicadosDto, *uint) (*dto.ResponseDto, error)
	ObtenerDetalleCotizacion(uint) (*dto.CotizacionDetalleDto, error)
} {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy
	}
	return a.services.Cotizacion
}

func (a *App) receiptService() interface {
	BuildReceipt(string) (reportmodels.Receipt, error)
	BuildQuotation(string) (reportmodels.Quotation, error)
	BuildPurchaseReport(string) (reportmodels.PurchaseReport, error)
} {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy
	}
	return a.services.Receipt
}

func (a *App) ServiceGeneratePurchaseReport(pedidoGuid string) (*reportmodels.DocumentOutput, error) {
	report, err := a.receiptService().BuildPurchaseReport(pedidoGuid)
	if err != nil {
		return nil, err
	}
	pdf, err := renders.RenderPurchasePDF(report)
	if err != nil {
		return nil, fmt.Errorf("no se pudo generar el reporte de compra: %w", err)
	}
	return &reportmodels.DocumentOutput{Kind: "pdf", FileName: "reporte-compra-" + report.Folio + ".pdf", DataBase64: base64.StdEncoding.EncodeToString(pdf)}, nil
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

func (a *App) SyncSatUnidadesMedida() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncSatUnidadesMedida()
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

func (a *App) SyncPerfiles() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncPerfiles()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncRolesFiscales() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncRolesFiscales()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncClientes() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncClientes()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncUsuarios() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncUsuarios()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncTiposPedido() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncTiposPedido()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncTiposAutorizacion() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncTiposAutorizacion()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

func (a *App) SyncEstatus() (string, error) {
	if a.services.Sync == nil {
		return "", fmt.Errorf("sincronización no disponible en modo Caja")
	}
	_, err := a.services.Sync.SyncEstatus()
	if err != nil {
		return "Error al sincronizar", err
	}
	return "Sincronizado", nil
}

// ── POS ───────────────────────────────────────────────────────────────────────

func (a *App) ServiceConsultaProductos(busqueda string, conExistencia bool) ([]dto.ProductoDto, error) {
	return a.posService().ConsultaProductos(busqueda, conExistencia)
}

func (a *App) ServiceObtenerTiposPedido() ([]models.TipoPedido, error) {
	return a.posService().ObtenerTiposPedido()
}

func (a *App) ServiceConsultarExistenciaProductos(productosGuids []uuid.UUID) ([]dto.InventarioDto, error) {
	return a.posService().ConsultarExistenciaProductos(productosGuids)
}

func (a *App) ServiceGuardarInventarioJSON(nombreArchivo string, contenido string) *dto.ResponseDto {
	if a.services.Inventario == nil {
		return dto.NewResponseDto(false, "Servicio de inventario no disponible", nil, nil)
	}
	return a.services.Inventario.GuardarArchivoJSON(nombreArchivo, contenido)
}

func (a *App) ServiceConfirmarTransaccion(tipoOperacion *uint, pagosAplicados []dto.PagosAplicadosDto, itemsPedido []dto.PedidoProductoDto, sucursalOrigen *uint, sucursalDestino *uint, operacionCajeroID *uint, clienteGuid string) (*dto.ResponseDto, error) {
	return a.posService().ConfirmarTransaccion(tipoOperacion, pagosAplicados, itemsPedido, sucursalOrigen, sucursalDestino, operacionCajeroID, clienteGuid)
}

func (a *App) ServiceCrearSolicitudProductos(solicitud dto.SolicitudProductosDto) (*dto.ResponseDto, error) {
	return a.posService().CrearSolicitudProductos(solicitud)
}

func (a *App) ServiceCrearCompra(datos dto.CrearCompraDto) (*dto.ResponseDto, error) {
	return a.comprasService().CrearCompra(datos)
}

func (a *App) ServiceConsultarHistorialCompras() ([]dto.CompraHistorialDto, error) {
	return a.comprasService().ConsultarHistorial()
}

func (a *App) ServiceConsultaTransacciones(tipoPedidoID *uint, sucursalID *uint) (*dto.ResponseDto, error) {
	return a.posService().ConsultaTransacciones(tipoPedidoID, sucursalID)
}

func (a *App) ServiceCancelarVenta(pedidoGuid string) (*dto.ResponseDto, error) {
	return a.posService().CancelarVenta(pedidoGuid)
}

func (a *App) ServiceConsultarTransferencias() ([]dto.TransferenciaDto, error) {
	return a.posService().ConsultarTransferencias()
}

func (a *App) ServicePrintReceipt(pedidoGuid string) (*reportmodels.DocumentOutput, error) {
	receipt, err := a.receiptService().BuildReceipt(pedidoGuid)
	if err != nil {
		return nil, err
	}
	if receipt.TipoPedidoGuid == models.TipoPedidoCotizacionGuid {
		quotation, err := a.receiptService().BuildQuotation(pedidoGuid)
		if err != nil {
			return nil, err
		}
		pdf, err := renders.RenderQuotationPDF(quotation)
		if err != nil {
			return nil, fmt.Errorf("no se pudo generar la cotización PDF: %w", err)
		}
		return &reportmodels.DocumentOutput{Kind: "pdf", FileName: "cotizacion-" + quotation.Folio + ".pdf", DataBase64: base64.StdEncoding.EncodeToString(pdf)}, nil
	}
	cfg, err := services.LoadKommerzConfig()
	if err != nil {
		return nil, err
	}
	applyReceiptConfig(&receipt, cfg.Receipt)
	if err := services.PrintReceipt(receipt, cfg.Receipt); err != nil {
		return nil, err
	}
	return &reportmodels.DocumentOutput{Kind: "printed"}, nil
}

// ServiceGenerateSaleDocument genera el documento sin enviarlo a impresora.
// Las ventas producen el ticket PDF y las cotizaciones su formato comercial.
func (a *App) ServiceGenerateSaleDocument(pedidoGuid string) (*reportmodels.DocumentOutput, error) {
	receipt, err := a.receiptService().BuildReceipt(pedidoGuid)
	if err != nil {
		return nil, err
	}
	if receipt.TipoPedidoGuid == models.TipoPedidoCotizacionGuid {
		quotation, err := a.receiptService().BuildQuotation(pedidoGuid)
		if err != nil {
			return nil, err
		}
		pdf, err := renders.RenderQuotationPDF(quotation)
		if err != nil {
			return nil, fmt.Errorf("no se pudo generar la cotización PDF: %w", err)
		}
		return &reportmodels.DocumentOutput{Kind: "pdf", FileName: "cotizacion-" + quotation.Folio + ".pdf", DataBase64: base64.StdEncoding.EncodeToString(pdf)}, nil
	}
	cfg, err := services.LoadKommerzConfig()
	if err != nil {
		return nil, err
	}
	applyReceiptConfig(&receipt, cfg.Receipt)
	pdf, err := renders.RenderReceiptPDF(receipt)
	if err != nil {
		return nil, fmt.Errorf("no se pudo generar el ticket PDF: %w", err)
	}
	return &reportmodels.DocumentOutput{Kind: "pdf", FileName: "ticket-" + receipt.Folio + ".pdf", DataBase64: base64.StdEncoding.EncodeToString(pdf)}, nil
}

func (a *App) ServiceEmailReceipt(pedidoGuid, recipient string) error {
	receipt, err := a.receiptService().BuildReceipt(pedidoGuid)
	if err != nil {
		return err
	}
	cfg, err := services.LoadKommerzConfig()
	if err != nil {
		return err
	}
	if receipt.TipoPedidoGuid == models.TipoPedidoCotizacionGuid {
		quotation, err := a.receiptService().BuildQuotation(pedidoGuid)
		if err != nil {
			return err
		}
		return services.EmailQuotation(quotation, recipient, cfg.Receipt)
	}
	applyReceiptConfig(&receipt, cfg.Receipt)
	return services.EmailReceipt(receipt, recipient, cfg.Receipt)
}

func (a *App) ServiceTestPrintReceipt(cfg services.ReceiptConfig) error {
	now := time.Now()
	receipt := reportmodels.Receipt{
		Folio:     "DEMO-000001",
		Negocio:   cfg.BusinessName,
		Sucursal:  "Sucursal Demo",
		Logo:      "",
		Direccion: "Av. Ejemplo 123, Col. Centro, Ciudad, Estado, C.P. 00000",
		Telefono:  "(000) 000 0000",
		Correo:    "sucursal@ejemplo.com",
		Cajero:    "Usuario Demo",
		Fecha:     now,
		Items: []reportmodels.ReceiptItem{
			{
				Codigo:      "DEMO/TEST",
				Descripcion: "ARTICULO DEMO/TEST",
				Cantidad:    1,
				Precio:      10,
				Importe:     10,
			},
		},
		Subtotal: 10,
		Total:    10,
		Pago:     20,
		Cambio:   10,
		Leyendas: cfg.Legends,
	}
	if receipt.Negocio == "" {
		receipt.Negocio = "KOMMERZE"
	}
	receipt.LeyendaGrupos = receiptLegendGroups(cfg.LegendGroups)
	applyReceiptConfig(&receipt, cfg)
	return services.PrintReceipt(receipt, cfg)
}

func applyReceiptConfig(receipt *reportmodels.Receipt, cfg services.ReceiptConfig) {
	if cfg.BusinessName != "" {
		receipt.Negocio = cfg.BusinessName
	}
	if logo, err := services.LoadReceiptLogo(); err == nil && logo != "" {
		receipt.Logo = logo
	}
	receipt.MostrarLogo = cfg.ShowLogo
	receipt.MostrarSucursal = cfg.EffectiveShowBranchName()
	receipt.MostrarDireccion = cfg.ShowBranchAddress
	receipt.MostrarTelefono = cfg.ShowBranchPhone
	receipt.MostrarCorreo = cfg.ShowBranchEmail
	receipt.Leyendas = cfg.Legends
	receipt.LeyendaGrupos = receiptLegendGroups(cfg.LegendGroups)
}

func receiptLegendGroups(groups []services.ReceiptLegendGroup) []reportmodels.ReceiptLegendGroup {
	result := make([]reportmodels.ReceiptLegendGroup, 0, len(groups))
	for _, group := range groups {
		result = append(result, reportmodels.ReceiptLegendGroup{Text: group.Text, Bold: group.Bold})
	}
	return result
}

// ── NetPay ──────────────────────────────────────────────────────────────────────

func (a *App) NetPayAuthGetToken() (*dto.ResponseDto, error) {
	if a.services.NetPayService == nil {
		return dto.NewResponseDto(false, "servicio de NetPay no disponible", nil, nil), nil
	}
	return a.services.NetPayService.AuthGetToken(), nil
}

func (a *App) NetPaySaleTransaction(payload services.NetPaySaleRequest) (*dto.ResponseDto, error) {
	if a.services.NetPayService == nil {
		return dto.NewResponseDto(false, "servicio de NetPay no disponible", nil, nil), nil
	}
	return a.services.NetPayService.SaleTransaction(payload), nil
}

// ── Tipos de Autorización ─────────────────────────────────────────────────────

// ServiceGetTiposAutorizacion devuelve el catálogo de tipos de autorización.
// Es un catálogo local fijo sincronizado con la tabla del cloud.
// No requiere BD ni modo dual.
func (a *App) ServiceGetTiposAutorizacion() []dto.TipoAutorizacionDto {
	return dto.TiposAutorizacion
}

// ── Cotizaciones ───────────────────────────────────────────────────

func (a *App) ServiceCotizacionSolicitarAutorizacion(
	pedidoGuid string,
	sucursalGuid string,
	tipoAutorizacionGuid string,
	usuarioSolicitanteGuid string,
	comentarios string,
	items []dto.ItemDescuentoDto,
) (*dto.ResponseDto, error) {
	return a.cotizacionService().SolicitarAutorizacion(pedidoGuid, sucursalGuid, tipoAutorizacionGuid, usuarioSolicitanteGuid, comentarios, items)
}

func (a *App) ServiceCotizacionConvertirAVenta(
	pedidoID uint,
	pagos []dto.PagosAplicadosDto,
	sucursalOrigenID *uint,
) (*dto.ResponseDto, error) {
	return a.cotizacionService().ConvertirAVenta(pedidoID, pagos, sucursalOrigenID)
}

func (a *App) ServiceCotizacionObtenerDetalle(pedidoID uint) (*dto.CotizacionDetalleDto, error) {
	return a.cotizacionService().ObtenerDetalleCotizacion(pedidoID)
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

// ServiceGetWebSocketStatus permite que el frontend conozca el estado actual
// aunque la conexión se haya establecido antes de montar sus listeners.
func (a *App) ServiceGetWebSocketStatus() bool {
	if a.services == nil {
		return false
	}
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy.WebSocketConnected()
	}
	if a.services.Cotizacion != nil {
		return a.services.Cotizacion.WebSocketConnected()
	}
	return false
}

// ── Auditoria ────────────────────────────────────────────────────────────────

func (a *App) ServiceObtenerResumenInventario() *dto.ResponseDto {
	if a.services.Auditoria == nil {
		return dto.NewResponseDto(false, "No disponible en modo Caja", nil, nil)
	}
	return a.services.Auditoria.ObtenerResumenInventario()
}

func (a *App) ServiceVerificarAuditoriasEnCurso() *dto.ResponseDto {
	if a.services.Auditoria == nil {
		return dto.NewResponseDto(false, "No disponible en modo Caja", nil, nil)
	}
	return a.services.Auditoria.VerificarAuditoriasEnCurso()
}

func (a *App) ServiceIniciarAuditoria(sucursalGuid string, usuarioEncargadoGuid string) *dto.ResponseDto {
	if a.services.Auditoria == nil {
		return dto.NewResponseDto(false, "No disponible en modo Caja", nil, nil)
	}
	return a.services.Auditoria.IniciarAuditoria(sucursalGuid, usuarioEncargadoGuid)
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

// ServiceObtenerOperacionSucursalActiva devuelve la jornada activa de la sucursal.
// Funciona en ambos modos: Servidor Local (BD directa) y Caja (proxy HTTP).
func (a *App) ServiceObtenerOperacionSucursalActiva(sucursalID uint) *dto.ResponseDto {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy.ObtenerOperacionSucursalActiva(sucursalID)
	}
	if a.services.OperacionesSucursal == nil {
		return dto.NewResponseDto(false, "No disponible", nil, nil)
	}
	return a.services.OperacionesSucursal.ObtenerOperacionSucursalActiva(sucursalID)
}

// ServiceObtenerResumenVentasOperacion devuelve el total y la serie horaria de
// ventas de la jornada activa. Funciona en Servidor Local y Caja.
func (a *App) ServiceObtenerResumenVentasOperacion(sucursalID uint) *dto.ResponseDto {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy.ObtenerResumenVentasOperacion(sucursalID)
	}
	if a.services.OperacionesSucursal == nil {
		return dto.NewResponseDto(false, "No disponible", nil, nil)
	}
	return a.services.OperacionesSucursal.ObtenerResumenVentasOperacion(sucursalID)
}

// ServiceCerrarOperacionSucursal calcula acumulados y cierra la jornada.
// Tras el cierre emite el evento "jornada:cerrada" al frontend local (Wails)
// y hace broadcast WebSocket a todas las Cajas conectadas.
func (a *App) ServiceCerrarOperacionSucursal(datos dto.CerrarOperacionSucursalDto) *dto.ResponseDto {
	if a.services.OperacionesSucursal == nil {
		return dto.NewResponseDto(false, "No disponible en modo Caja", nil, nil)
	}
	res := a.services.OperacionesSucursal.CerrarOperacionSucursal(datos)
	if res != nil && res.Success {
		payload := map[string]any{"operacionID": datos.OperacionID}
		runtime.EventsEmit(a.ctx, "jornada:cerrada", payload)
		if a.services.LocalServer != nil {
			a.services.LocalServer.BroadcastToClients("jornada:cerrada", payload)
		}
	}
	return res
}

// ── Operaciones de Caja ───────────────────────────────────────────────────────

// ServiceAbrirCaja inicia el turno de un cajero. Solo disponible en Servidor Local.
func (a *App) ServiceAbrirCaja(datos dto.AbrirCajaDto) *dto.ResponseDto {
	if a.services.OperacionesCaja == nil {
		return dto.NewResponseDto(false, "No disponible en modo Caja", nil, nil)
	}
	return a.services.OperacionesCaja.AbrirCaja(datos)
}

// ServiceCerrarCaja finaliza el turno del cajero. Solo disponible en Servidor Local.
// Tras el cierre emite el evento "turno:cerrado" al frontend local (Wails)
// y hace broadcast WebSocket a todas las Cajas conectadas.
func (a *App) ServiceCerrarCaja(datos dto.CerrarCajaDto) *dto.ResponseDto {
	if a.services.CajaProxy != nil {
		// En modo Caja: delegar al Servidor Local
		res := a.services.CajaProxy.CerrarCaja(datos)
		// No necesitamos broadcast: el Servidor Local lo hace al procesar la petición HTTP
		return res
	}
	if a.services.OperacionesCaja == nil {
		return dto.NewResponseDto(false, "No disponible", nil, nil)
	}
	res := a.services.OperacionesCaja.CerrarCaja(datos)
	if res != nil && res.Success {
		payload := map[string]any{"operacionCajeroID": datos.OperacionCajeroID}
		runtime.EventsEmit(a.ctx, "turno:cerrado", payload)
		if a.services.LocalServer != nil {
			a.services.LocalServer.BroadcastToClients("turno:cerrado", payload)
		}
	}
	return res
}

// ServiceObtenerOperacionesCajero devuelve los turnos de una jornada de sucursal.
func (a *App) ServiceObtenerOperacionesCajero(operacionSucursalID uint) *dto.ResponseDto {
	if a.services.OperacionesCaja == nil {
		return dto.NewResponseDto(false, "No disponible en modo Caja", nil, nil)
	}
	return a.services.OperacionesCaja.ObtenerOperacionesCajero(operacionSucursalID)
}

// ServiceObtenerOperacionCajeroActiva devuelve el turno activo del cajero.
func (a *App) ServiceObtenerOperacionCajeroActiva(responsableID uint) *dto.ResponseDto {
	if a.services.OperacionesCaja == nil && a.services.CajaProxy == nil {
		return dto.NewResponseDto(false, "No disponible", nil, nil)
	}
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy.ObtenerOperacionCajeroActiva(responsableID)
	}
	return a.services.OperacionesCaja.ObtenerOperacionCajeroActiva(responsableID)
}

func (a *App) ServiceObtenerCajaConfigurada() (*models.Caja, error) {
	clave, err := services.GetMachineID()
	if err != nil {
		return nil, fmt.Errorf("no se pudo identificar el dispositivo: %w", err)
	}
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy.ObtenerCajaConfigurada(clave)
	}
	if a.services.OperacionesCaja == nil {
		return nil, fmt.Errorf("servicio de caja no disponible")
	}
	return a.services.OperacionesCaja.ObtenerCajaConfigurada(clave)
}

// ServiceObtenerResumenCajero calcula y devuelve el resumen de ingresos del turno del cajero.
// Los montos son calculados desde la tabla de pagos; no requieren entrada del usuario.
func (a *App) ServiceObtenerResumenCajero(operacionCajeroID uint) *dto.ResponseDto {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy.ObtenerResumenCajero(operacionCajeroID)
	}
	if a.services.OperacionesCaja == nil {
		return dto.NewResponseDto(false, "No disponible en modo Caja", nil, nil)
	}
	return a.services.OperacionesCaja.ObtenerResumenCajero(operacionCajeroID)
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

func (a *App) facturacionService() interface {
	PrepararFactura(string) (*dto.FacturacionPreparacionDto, error)
	BuscarEntidadesReceptoras(string) ([]dto.FacturacionEntidadDto, error)
	EmitirFactura(dto.EmitirFacturacionRequestDto) (*dto.FacturacionResultadoDto, error)
	ObtenerFacturaPDF(string) (*dto.FacturacionResultadoDto, error)
	EnviarFacturaCorreo(dto.EnviarFacturaEmailRequestDto) error
} {
	if a.services.CajaProxy != nil {
		return a.services.CajaProxy
	}
	return a.services.Facturacion
}

func (a *App) ServicePrepararFacturacion(pedidoGuid string) (*dto.FacturacionPreparacionDto, error) {
	return a.facturacionService().PrepararFactura(pedidoGuid)
}

func (a *App) ServiceBuscarEntidadesFacturacion(termino string) ([]dto.FacturacionEntidadDto, error) {
	return a.facturacionService().BuscarEntidadesReceptoras(termino)
}

func (a *App) ServiceEmitirFacturacion(req dto.EmitirFacturacionRequestDto) (*dto.FacturacionResultadoDto, error) {
	return a.facturacionService().EmitirFactura(req)
}

func (a *App) ServiceObtenerFacturaPDF(pedidoGuid string) (*dto.FacturacionResultadoDto, error) {
	return a.facturacionService().ObtenerFacturaPDF(pedidoGuid)
}

func (a *App) ServiceEnviarFacturaCorreo(req dto.EnviarFacturaEmailRequestDto) error {
	return a.facturacionService().EnviarFacturaCorreo(req)
}

// ServiceOpenInvoiceLocation abre en el administrador de archivos nativo la
// carpeta que contiene el PDF y XML de una factura.
func (a *App) ServiceOpenInvoiceLocation(filePath string) error {
	filePath = filepath.Clean(filePath)
	if filePath == "." || filePath == "" {
		return fmt.Errorf("la factura no tiene una ubicación de archivos registrada")
	}
	absolutePath, err := filepath.Abs(filePath)
	if err != nil {
		return fmt.Errorf("ubicación de factura inválida: %w", err)
	}
	info, err := os.Stat(absolutePath)
	if err != nil {
		return fmt.Errorf("no se encontró la ubicación de la factura: %w", err)
	}
	directory := absolutePath
	if !info.IsDir() {
		directory = filepath.Dir(absolutePath)
	}
	var command *exec.Cmd
	switch goruntime.GOOS {
	case "darwin":
		command = exec.Command("open", directory)
	case "windows":
		command = exec.Command("explorer", directory)
	default:
		command = exec.Command("xdg-open", directory)
	}
	if err = command.Start(); err != nil {
		return fmt.Errorf("no se pudo abrir la ubicación de los archivos: %w", err)
	}
	return nil
}

// ── Clientes ──────────────────────────────────────────────────────────────────

// ServiceBuscarClientes busca clientes por razón social, RFC o teléfono.
// Funciona en modo Servidor Local (BD directa) y Caja (proxy HTTP).
func (a *App) ServiceBuscarClientes(q string) ([]dto.ClienteDto, error) {
	return a.clientesService().BuscarClientes(q)
}

// ServiceListarClientes obtiene el catálogo completo para el tablero.
func (a *App) ServiceListarClientes() ([]dto.ClienteDto, error) {
	return a.clientesService().ListarClientes()
}

func (a *App) ServiceObtenerCliente(guid string) (*dto.ClienteDetalleDto, error) {
	return a.clientesService().ObtenerCliente(guid)
}

func (a *App) ServiceGuardarCliente(datos dto.GuardarClienteDto) (*dto.ClienteDetalleDto, error) {
	return a.clientesService().GuardarCliente(datos)
}

func (a *App) ServiceBuscarEntidadFiscalProveedor(rfc string) (*dto.ProveedorFiscalDto, error) {
	return a.proveedoresService().BuscarEntidadFiscalPorRFC(rfc)
}

func (a *App) ServiceBuscarProveedores(termino string) ([]dto.ProveedorFiscalDto, error) {
	return a.proveedoresService().BuscarProveedores(termino)
}

// ServiceBuscarEntidadFiscalPorRFC es la consulta neutral que reutilizan los
// flujos de clientes y proveedores antes de crear una entidad fiscal.
func (a *App) ServiceBuscarEntidadFiscalPorRFC(rfc string) (*dto.ProveedorFiscalDto, error) {
	return a.clientesService().ConsultarEntidadFiscalCloud(rfc)
}

func (a *App) ServiceGuardarProveedor(datos dto.GuardarProveedorDto) (*dto.ProveedorFiscalDto, error) {
	return a.proveedoresService().GuardarProveedor(datos)
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

// ServiceInitializeDatabase conecta la BD sin reiniciar la aplicación y
// ejecuta migraciones y datos iniciales dentro del mismo paso del onboarding.
// Los servicios se crean después de configurar Cloud para que nazcan con la
// URL y las credenciales definitivas.
func (a *App) ServiceInitializeDatabase(host, port, user, password, name, sslMode, timeZone string) *dto.ResponseDto {
	a.setupMu.Lock()
	defer a.setupMu.Unlock()

	cfg, err := services.LoadKommerzConfig()
	if err != nil {
		return dto.NewResponseDto(false, "No se pudo leer la configuración", nil, []string{err.Error()})
	}
	if cfg.Role != services.RoleLocalServer {
		return dto.NewResponseDto(false, "La base de datos local solo se configura en el rol Servidor Local", nil, nil)
	}
	cfg.DBHost = strings.TrimSpace(host)
	cfg.DBPort = strings.TrimSpace(port)
	cfg.DBUser = strings.TrimSpace(user)
	cfg.DBPassword = password
	cfg.DBName = strings.TrimSpace(name)
	cfg.DBSSLMode = strings.TrimSpace(sslMode)
	cfg.TimeZone = strings.TrimSpace(timeZone)

	db, err := database.NewDB(cfg)
	if err != nil {
		return dto.NewResponseDto(false, "No se pudo conectar a PostgreSQL", nil, []string{err.Error()})
	}
	if err = database.RunMigrations(db); err != nil {
		return dto.NewResponseDto(false, "No se pudieron ejecutar las migraciones", nil, []string{err.Error()})
	}
	if err = database.RunSeeder(db); err != nil {
		return dto.NewResponseDto(false, "No se pudieron cargar los datos iniciales", nil, []string{err.Error()})
	}
	if err = services.SaveKommerzConfig(cfg); err != nil {
		return dto.NewResponseDto(false, "La base de datos quedó lista, pero no se pudo guardar la configuración", nil, []string{err.Error()})
	}
	a.db = db
	if loc, loadErr := time.LoadLocation(cfg.TimeZone); loadErr == nil {
		time.Local = loc
	}
	return dto.NewResponseDto(true, "Base de datos conectada y migrada correctamente", nil, nil)
}

// ServiceConfigureCloud valida el acceso, persiste sus parámetros y termina
// de inicializar los servicios del Servidor Local sin reiniciar la app.
func (a *App) ServiceConfigureCloud(email, password, apiURL string) *dto.ResponseDto {
	a.setupMu.Lock()
	defer a.setupMu.Unlock()

	if a.db == nil {
		return dto.NewResponseDto(false, "Primero configura la base de datos", nil, nil)
	}
	cfg, err := services.LoadKommerzConfig()
	if err != nil {
		return dto.NewResponseDto(false, "No se pudo leer la configuración", nil, []string{err.Error()})
	}
	email = strings.TrimSpace(email)
	apiURL = strings.TrimRight(strings.TrimSpace(apiURL), "/")
	if email == "" || password == "" {
		return dto.NewResponseDto(false, "Correo y contraseña de Cloud son obligatorios", nil, nil)
	}
	if err = services.ValidateCloudAPIURL(apiURL); err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	cloud := services.NewCloudHttpClient(apiURL)
	if err = cloud.LoginWithCredentials(email, password); err != nil {
		return dto.NewResponseDto(false, "No se pudo establecer la conexión con Cloud", nil, []string{err.Error()})
	}
	cfg.CloudEmail = email
	cfg.CloudPassword = password
	cfg.CloudAPIURL = apiURL
	if err = services.SaveKommerzConfig(cfg); err != nil {
		return dto.NewResponseDto(false, "No se pudo guardar la configuración Cloud", nil, []string{err.Error()})
	}
	if a.services != nil && a.services.Sync != nil {
		return dto.NewResponseDto(true, "Conexión Cloud validada", nil, nil)
	}
	a.services = services.NewServices(a.db, a.ctx, cfg)
	a.services.SetContext(a.ctx)
	return dto.NewResponseDto(true, "Conexión Cloud establecida correctamente", nil, nil)
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

// ServiceSelectInvoiceFolder permite elegir la carpeta donde se conservarán
// los XML timbrados sin exponer acceso arbitrario al filesystem en React.
func (a *App) ServiceSelectInvoiceFolder() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Seleccionar carpeta de facturas",
	})
}

func (a *App) ServiceLoadReceiptLogo() (string, error) {
	return services.LoadReceiptLogo()
}

func (a *App) ServiceSaveReceiptLogo(value string) error {
	return services.SaveReceiptLogo(value)
}

func (a *App) ServiceDeleteReceiptLogo() error {
	return services.DeleteReceiptLogo()
}

// ServiceTestDBConnection prueba una conexión a PostgreSQL con los valores
// proporcionados sin modificar la configuración guardada.
// Usada por DatabaseSetupPage para validar credenciales antes de guardar.
func (a *App) ServiceTestDBConnection(host, port, user, password, name, sslMode, timeZone string) *dto.ResponseDto {
	testCfg := &services.KommerzConfig{
		DBHost:     host,
		DBPort:     port,
		DBUser:     user,
		DBPassword: password,
		DBName:     name,
		DBSSLMode:  sslMode,
		TimeZone:   timeZone,
	}
	if err := database.TestDBConnection(testCfg); err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	return dto.NewResponseDto(true, "Conexión exitosa", nil, nil)
}

// ServiceSaveDBConfig persiste solo los campos de BD en KommerzConfig
// haciendo merge con la configuración existente para no perder otros campos.
func (a *App) ServiceSaveDBConfig(host, port, user, password, name, sslMode, timeZone string) error {
	cfg, err := services.LoadKommerzConfig()
	if err != nil {
		return err
	}
	cfg.DBHost = host
	cfg.DBPort = port
	cfg.DBUser = user
	cfg.DBPassword = password
	cfg.DBName = name
	cfg.DBSSLMode = sslMode
	cfg.TimeZone = timeZone
	return services.SaveKommerzConfig(cfg)
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

// ServiceObtenerSucursalLocal busca la sucursal en la base de datos local usando el GUID
// guardado en la licencia (kommerze_config.json). Retorna el objeto Sucursal con su ID local.
// Úsalo para obtener el sucursalID necesario para las operaciones de jornada.
func (a *App) ServiceObtenerSucursalLocal() *dto.ResponseDto {
	cfg, err := services.LoadKommerzConfig()
	if err != nil || cfg.License == nil {
		return dto.NewResponseDto(false, "Sin licencia configurada", nil, nil)
	}

	guid := cfg.License.Sucursal.Guid
	if guid == "" {
		return dto.NewResponseDto(false, "GUID de sucursal no encontrado en la licencia", nil, nil)
	}

	var sucursal models.Sucursal
	err = a.db.Where("guid = ?", guid).First(&sucursal).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return dto.NewResponseDto(false, "Sucursal no encontrada en la base de datos local. Sincronice primero.", nil, nil)
		}
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	return dto.NewResponseDto(true, "Sucursal encontrada", sucursal, nil)
}

// ServiceTestLocalServerConnection verifica que el Servidor Local responda.
func (a *App) ServiceTestLocalServerConnection(serverURL string) *dto.ResponseDto {
	data, err := services.TestLocalServerConnection(serverURL)
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	return dto.NewResponseDto(true, "Conexión exitosa al Servidor Local", data, nil)
}

// ServiceRestartApp relanza el ejecutable actual y luego cierra la instancia en curso.
// El nuevo proceso se desacopla del padre para que sobreviva al cierre.
func (a *App) ServiceRestartApp() {
	exe, err := os.Executable()
	if err != nil {
		log.Printf("[ServiceRestartApp] No se pudo obtener la ruta del ejecutable: %v", err)
		runtime.Quit(a.ctx)
		return
	}

	cmd := exec.Command(exe)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	setSysProcAttr(cmd) // desacopla el proceso hijo (ver restart_unix.go / restart_windows.go)

	if err := cmd.Start(); err != nil {
		log.Printf("[ServiceRestartApp] No se pudo relanzar la app: %v", err)
	}

	runtime.Quit(a.ctx)
}

// ServiceGetLocalIP devuelve la dirección IP local del dispositivo en la red LAN.
func (a *App) ServiceGetLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "127.0.0.1"
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "127.0.0.1"
}
