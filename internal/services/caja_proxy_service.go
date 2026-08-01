package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	reportmodels "BitComercio/internal/usecases/reports/models"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// CajaProxyService implementa las mismas firmas de método que PosService,
// AuthService y CatalogosService, pero internamente hace peticiones HTTP
// al Servidor Local. El código de app.go no necesita cambios.
type CajaProxyService struct {
	serverURL string
	client    *http.Client
}

func NewCajaProxyService(serverURL string) *CajaProxyService {
	return &CajaProxyService{
		serverURL: serverURL,
		client:    &http.Client{},
	}
}

// ── Helpers internos ──────────────────────────────────────────────────────────

func (c *CajaProxyService) get(path string, out any) error {
	resp, err := c.client.Get(fmt.Sprintf("%s%s", c.serverURL, path))
	if err != nil {
		return fmt.Errorf("error conectando al Servidor Local: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Servidor Local respondió %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func (c *CajaProxyService) post(path string, body any, out any) error {
	data, err := json.Marshal(body)
	if err != nil {
		return err
	}
	resp, err := c.client.Post(
		fmt.Sprintf("%s%s", c.serverURL, path),
		"application/json",
		bytes.NewReader(data),
	)
	if err != nil {
		return fmt.Errorf("error conectando al Servidor Local: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var errBody map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&errBody)
		if msg, ok := errBody["message"].(string); ok {
			return fmt.Errorf("%s", msg)
		}
		return fmt.Errorf("Servidor Local respondió %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// ── PosService equivalentes ───────────────────────────────────────────────────

func (c *CajaProxyService) ConsultaProductos(busqueda string, conExistencia bool) ([]dto.ProductoDto, error) {
	var result struct {
		Success bool              `json:"success"`
		Data    []dto.ProductoDto `json:"data"`
	}
	if err := c.get(fmt.Sprintf("/local/productos?q=%s&existencia=%t", busqueda, conExistencia), &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *CajaProxyService) ObtenerTiposPedido() ([]models.TipoPedido, error) {
	var result struct {
		Success bool                `json:"success"`
		Data    []models.TipoPedido `json:"data"`
	}
	if err := c.get("/local/tipos-pedido", &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *CajaProxyService) ConsultarExistenciaProductos(guids []uuid.UUID) ([]dto.InventarioDto, error) {
	var result struct {
		Success bool                `json:"success"`
		Data    []dto.InventarioDto `json:"data"`
	}
	if err := c.post("/local/existencias", guids, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *CajaProxyService) ConfirmarTransaccion(
	tipoOperacion *uint,
	pagosAplicados []dto.PagosAplicadosDto,
	itemsPedido []dto.PedidoProductoDto,
	sucursalOrigen *uint,
	sucursalDestino *uint,
	operacionCajeroID *uint,
) (*dto.ResponseDto, error) {
	body := map[string]any{
		"tipoOperacion":     tipoOperacion,
		"pagosAplicados":    pagosAplicados,
		"itemsPedido":       itemsPedido,
		"sucursalOrigen":    sucursalOrigen,
		"sucursalDestino":   sucursalDestino,
		"operacionCajeroID": operacionCajeroID,
	}
	var result dto.ResponseDto
	if err := c.post("/local/transacciones", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *CajaProxyService) CrearSolicitudProductos(solicitud dto.SolicitudProductosDto) (*dto.ResponseDto, error) {
	var result dto.ResponseDto
	if err := c.post("/local/solicitudes-productos", solicitud, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *CajaProxyService) ConsultaTransacciones(tipoPedidoID *uint, sucursalID *uint) (*dto.ResponseDto, error) {
	path := "/local/transacciones/historial"
	params := ""
	if tipoPedidoID != nil {
		params += fmt.Sprintf("?tipo=%d", *tipoPedidoID)
	}
	if sucursalID != nil {
		if params == "" {
			params += "?"
		} else {
			params += "&"
		}
		params += fmt.Sprintf("sucursal=%d", *sucursalID)
	}
	var result dto.ResponseDto
	if err := c.get(path+params, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *CajaProxyService) ConsultarTransferencias() ([]dto.TransferenciaDto, error) {
	var result struct {
		Success bool                   `json:"success"`
		Data    []dto.TransferenciaDto `json:"data"`
	}
	if err := c.get("/local/transferencias", &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *CajaProxyService) BuildReceipt(pedidoGuid string) (reportmodels.Receipt, error) {
	var result struct {
		Success bool                 `json:"success"`
		Data    reportmodels.Receipt `json:"data"`
	}
	if err := c.get(fmt.Sprintf("/local/recibos?pedidoGuid=%s", pedidoGuid), &result); err != nil {
		return reportmodels.Receipt{}, err
	}
	return result.Data, nil
}

// SetContext inicia la conexión WebSocket hacia el Servidor Local
// para recibir eventos en tiempo real y emitirlos al frontend de esta Caja.
func (c *CajaProxyService) SetContext(ctx context.Context) {
	go c.listenWS(ctx)
}

func (c *CajaProxyService) listenWS(ctx context.Context) {
	wsURL := strings.ReplaceAll(c.serverURL, "https://", "wss://")
	wsURL = strings.ReplaceAll(wsURL, "http://", "ws://")
	wsURL = fmt.Sprintf("%s/local/ws", wsURL)

	backoff := 2 * time.Second
	for {
		err := c.connectWS(ctx, wsURL)
		if err != nil {
			log.Printf("[CajaProxy] Error WS: %v. Reintentando en %v", err, backoff)
			time.Sleep(backoff)
		}
	}
}

func (c *CajaProxyService) connectWS(ctx context.Context, wsURL string) error {
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		return err
	}
	defer conn.Close()
	log.Printf("[CajaProxy] ✅ Conectado al Servidor Local WS: %s", wsURL)

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			return err
		}
		var msg map[string]any
		if err := json.Unmarshal(raw, &msg); err == nil {
			if eventType, ok := msg["type"].(string); ok {
				runtime.EventsEmit(ctx, eventType, msg["data"])
			}
		}
	}
}

// ── AuthService equivalente ───────────────────────────────────────────────────

func (c *CajaProxyService) LoginService(username, password string) (*models.Usuario, error) {
	body := map[string]string{"username": username, "password": password}
	var result struct {
		Success bool            `json:"success"`
		Message string          `json:"message"`
		Data    *models.Usuario `json:"data"`
	}
	if err := c.post("/local/auth/login", body, &result); err != nil {
		return nil, err
	}
	if !result.Success || result.Data == nil {
		return nil, fmt.Errorf("%s", result.Message)
	}
	return result.Data, nil
}

func (c *CajaProxyService) ResetPassword(_, _ string) (*models.Usuario, error) {
	return nil, fmt.Errorf("operación no disponible en modo Caja")
}

// ── CatalogosService equivalentes ─────────────────────────────────────────────

func (c *CajaProxyService) catalogoGet(path string) (*dto.ResponseDto, error) {
	var result dto.ResponseDto
	if err := c.get(path, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *CajaProxyService) GetMarcas() (*dto.ResponseDto, error) {
	return c.catalogoGet("/local/catalogos/marcas")
}

func (c *CajaProxyService) GetLineas() (*dto.ResponseDto, error) {
	return c.catalogoGet("/local/catalogos/lineas")
}

func (c *CajaProxyService) GetEmpaques() (*dto.ResponseDto, error) {
	return c.catalogoGet("/local/catalogos/empaques")
}

func (c *CajaProxyService) GetSatFormasPago() (*dto.ResponseDto, error) {
	return c.catalogoGet("/local/catalogos/formas-pago")
}

func (c *CajaProxyService) GetSatMetodosPago() (*dto.ResponseDto, error) {
	return c.catalogoGet("/local/catalogos/metodos-pago")
}

func (c *CajaProxyService) GetSatRegimenFiscal() (*dto.ResponseDto, error) {
	return c.catalogoGet("/local/catalogos/regimen-fiscal")
}

func (c *CajaProxyService) GetSatUsosCFDI() (*dto.ResponseDto, error) {
	return c.catalogoGet("/local/catalogos/usos-cfdi")
}

func (c *CajaProxyService) GetSatProductos() (*dto.ResponseDto, error) {
	return nil, fmt.Errorf("operación no disponible en modo Caja")
}

func (c *CajaProxyService) GetSucursales() (*dto.ResponseDto, error) {
	return c.catalogoGet("/local/catalogos/sucursales")
}

// ── ClientesService equivalente ───────────────────────────────────────────────

func (c *CajaProxyService) BuscarClientes(q string) ([]dto.ClienteDto, error) {
	var result struct {
		Success bool             `json:"success"`
		Data    []dto.ClienteDto `json:"data"`
	}
	if err := c.get(fmt.Sprintf("/local/clientes?q=%s", q), &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *CajaProxyService) ListarClientes() ([]dto.ClienteDto, error) {
	var result struct {
		Success bool             `json:"success"`
		Data    []dto.ClienteDto `json:"data"`
	}
	if err := c.get("/local/clientes/listado", &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

// ── CotizacionService equivalentes ────────────────────────────────────────────

func (c *CajaProxyService) SolicitarAutorizacion(
	pedidoGuid, sucursalGuid string,
	tipoAutorizacionGuid, usuarioSolicitanteGuid, comentarios string,
	items []dto.ItemDescuentoDto,
) (*dto.ResponseDto, error) {
	body := map[string]any{
		"pedidoGuid":             pedidoGuid,
		"sucursalGuid":           sucursalGuid,
		"tipoAutorizacionGuid":   tipoAutorizacionGuid,
		"usuarioSolicitanteGuid": usuarioSolicitanteGuid,
		"comentarios":            comentarios,
		"items":                  items,
	}
	var result dto.ResponseDto
	if err := c.post("/local/cotizaciones/solicitar-autorizacion", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *CajaProxyService) ConvertirAVenta(pedidoID uint, pagos []dto.PagosAplicadosDto, sucursalOrigenID *uint) (*dto.ResponseDto, error) {
	body := map[string]any{
		"pedidoId":         pedidoID,
		"pagosAplicados":   pagos,
		"sucursalOrigenId": sucursalOrigenID,
	}
	var result dto.ResponseDto
	if err := c.post("/local/cotizaciones/convertir-venta", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *CajaProxyService) ObtenerDetalleCotizacion(pedidoID uint) (*dto.CotizacionDetalleDto, error) {
	var result struct {
		Success bool                     `json:"success"`
		Data    dto.CotizacionDetalleDto `json:"data"`
	}
	if err := c.get(fmt.Sprintf("/local/cotizaciones/detalle?pedidoId=%d", pedidoID), &result); err != nil {
		return nil, err
	}
	return &result.Data, nil
}

// ── OperacionesSucursal (proxy al Servidor Local) ─────────────────────────────

// ObtenerOperacionSucursalActiva consulta la jornada activa al Servidor Local.
func (c *CajaProxyService) ObtenerOperacionSucursalActiva(sucursalID uint) *dto.ResponseDto {
	var result dto.ResponseDto
	if err := c.get(fmt.Sprintf("/local/sucursal/operacion/activa?sucursalId=%d", sucursalID), &result); err != nil {
		return &dto.ResponseDto{Success: false, Message: err.Error()}
	}
	return &result
}

func (c *CajaProxyService) ObtenerResumenVentasOperacion(sucursalID uint) *dto.ResponseDto {
	var result dto.ResponseDto
	if err := c.get(fmt.Sprintf("/local/sucursal/operacion/resumen-ventas?sucursalId=%d", sucursalID), &result); err != nil {
		return &dto.ResponseDto{Success: false, Message: err.Error()}
	}
	return &result
}

// ── OperacionesCaja (proxy al Servidor Local) ─────────────────────────────────

// AbrirCaja delega la apertura de turno al Servidor Local.
func (c *CajaProxyService) AbrirCaja(datos dto.AbrirCajaDto) *dto.ResponseDto {
	var result dto.ResponseDto
	if err := c.post("/local/cajero/turno/abrir", datos, &result); err != nil {
		return &dto.ResponseDto{Success: false, Message: err.Error()}
	}
	return &result
}

// CerrarCaja delega el cierre de turno al Servidor Local.
func (c *CajaProxyService) CerrarCaja(datos dto.CerrarCajaDto) *dto.ResponseDto {
	var result dto.ResponseDto
	if err := c.post("/local/cajero/turno/cerrar", datos, &result); err != nil {
		return &dto.ResponseDto{Success: false, Message: err.Error()}
	}
	return &result
}

// ObtenerOperacionCajeroActiva consulta el turno activo del cajero al Servidor Local.
func (c *CajaProxyService) ObtenerOperacionCajeroActiva(responsableID uint) *dto.ResponseDto {
	var result dto.ResponseDto
	if err := c.get(fmt.Sprintf("/local/cajero/turno/activo?responsableId=%d", responsableID), &result); err != nil {
		return &dto.ResponseDto{Success: false, Message: err.Error()}
	}
	return &result
}

// ObtenerOperacionesCajero lista los turnos de una jornada de sucursal.
func (c *CajaProxyService) ObtenerOperacionesCajero(operacionSucursalID uint) *dto.ResponseDto {
	var result dto.ResponseDto
	if err := c.get(fmt.Sprintf("/local/cajero/turnos?operacionSucursalId=%d", operacionSucursalID), &result); err != nil {
		return &dto.ResponseDto{Success: false, Message: err.Error()}
	}
	return &result
}

// ObtenerResumenCajero consulta el resumen de ingresos calculado del turno al Servidor Local.
func (c *CajaProxyService) ObtenerResumenCajero(operacionCajeroID uint) *dto.ResponseDto {
	var result dto.ResponseDto
	if err := c.get(fmt.Sprintf("/local/cajero/turno/resumen?operacionCajeroId=%d", operacionCajeroID), &result); err != nil {
		return &dto.ResponseDto{Success: false, Message: err.Error()}
	}
	return &result
}
