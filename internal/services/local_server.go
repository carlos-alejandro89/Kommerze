package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

// wsHub gestiona las conexiones WebSocket activas de las Cajas.
type wsHub struct {
	mu      sync.RWMutex
	clients map[chan []byte]struct{}
}

func newWsHub() *wsHub {
	return &wsHub{clients: make(map[chan []byte]struct{})}
}

func (h *wsHub) register(ch chan []byte) {
	h.mu.Lock()
	h.clients[ch] = struct{}{}
	h.mu.Unlock()
}

func (h *wsHub) unregister(ch chan []byte) {
	h.mu.Lock()
	delete(h.clients, ch)
	h.mu.Unlock()
}

// broadcast envia el mensaje a todas las Cajas conectadas (non-blocking).
func (h *wsHub) broadcast(msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.clients {
		select {
		case ch <- msg:
		default: // caja lenta, se omite este mensaje
		}
	}
}

// LocalServerService expone los servicios existentes del Servidor Local
// como una API REST HTTP en :8989 para que las Cajas los consuman.
// No contiene lógica de negocio propia — solo wrappers JSON.
type LocalServerService struct {
	db                  *gorm.DB
	pos                 *PosService
	auth                *AuthService
	catalogos           *CatalogosService
	clientes            *ClientesService
	proveedores         *ProveedoresService
	compras             *ComprasService
	cotizacion          *CotizacionService
	receipt             *ReceiptService
	operacionesSucursal *OperacionesSucursalService
	operacionesCaja     *OperacionesCajaService
	hub                 *wsHub
	server              *http.Server
}

func NewLocalServerService(db *gorm.DB, pos *PosService, auth *AuthService, cat *CatalogosService, clientes *ClientesService, proveedores *ProveedoresService, compras *ComprasService, cotizacion *CotizacionService, receipt *ReceiptService, opSucursal *OperacionesSucursalService, opCaja *OperacionesCajaService) *LocalServerService {
	return &LocalServerService{
		db:                  db,
		pos:                 pos,
		auth:                auth,
		catalogos:           cat,
		clientes:            clientes,
		proveedores:         proveedores,
		compras:             compras,
		cotizacion:          cotizacion,
		receipt:             receipt,
		operacionesSucursal: opSucursal,
		operacionesCaja:     opCaja,
		hub:                 newWsHub(),
	}
}

// BroadcastToClients serializa y envía un evento a todas las Cajas conectadas por WS.
func (l *LocalServerService) BroadcastToClients(eventType string, data any) {
	msg, err := json.Marshal(map[string]any{"type": eventType, "data": data})
	if err != nil {
		log.Printf("[LocalServer] Error serializando broadcast: %v", err)
		return
	}
	l.hub.broadcast(msg)
}

// Start levanta el servidor HTTP en la goroutine del caller.
// Llamar en una goroutine separada: go svc.Start(":8989")
func (l *LocalServerService) Start(addr string) {
	mux := http.NewServeMux()

	mux.HandleFunc("/local/health", l.handleHealth)
	mux.HandleFunc("/local/auth/login", l.handleLogin)
	mux.HandleFunc("/local/productos", l.handleProductos)
	mux.HandleFunc("/local/transacciones", l.handleTransacciones)
	mux.HandleFunc("/local/solicitudes-productos", l.handleSolicitudesProductos)
	mux.HandleFunc("/local/tipos-pedido", l.handleTiposPedido)
	mux.HandleFunc("/local/existencias", l.handleExistencias)
	mux.HandleFunc("/local/clientes", l.handleClientes)
	mux.HandleFunc("/local/clientes/listado", l.handleListadoClientes)
	mux.HandleFunc("/local/clientes/detalle", l.handleDetalleCliente)
	mux.HandleFunc("/local/clientes/guardar", l.handleGuardarCliente)
	mux.HandleFunc("/local/clientes/entidad-fiscal", l.handleBuscarEntidadFiscalCloud)
	mux.HandleFunc("/local/proveedores/buscar-rfc", l.handleBuscarProveedorRFC)
	mux.HandleFunc("/local/proveedores", l.handleBuscarProveedores)
	mux.HandleFunc("/local/proveedores/guardar", l.handleGuardarProveedor)
	mux.HandleFunc("/local/compras", l.handleCrearCompra)
	mux.HandleFunc("/local/catalogos/marcas", l.handleMarcas)
	mux.HandleFunc("/local/catalogos/lineas", l.handleLineas)
	mux.HandleFunc("/local/catalogos/empaques", l.handleEmpaques)
	mux.HandleFunc("/local/catalogos/formas-pago", l.handleFormasPago)
	mux.HandleFunc("/local/catalogos/metodos-pago", l.handleMetodosPago)
	mux.HandleFunc("/local/catalogos/regimen-fiscal", l.handleRegimenFiscal)
	mux.HandleFunc("/local/catalogos/usos-cfdi", l.handleUsosCFDI)
	mux.HandleFunc("/local/catalogos/sucursales", l.handleSucursales)
	mux.HandleFunc("/local/transacciones/historial", l.handleHistorialTransacciones)
	mux.HandleFunc("/local/transacciones/cancelar", l.handleCancelarVenta)
	mux.HandleFunc("/local/transferencias", l.handleTransferencias)
	mux.HandleFunc("/local/recibos", l.handleReceipt)
	mux.HandleFunc("/local/cotizaciones/pdf-data", l.handleQuotationPDFData)
	mux.HandleFunc("/local/compras/pdf-data", l.handlePurchasePDFData)
	mux.HandleFunc("/local/cotizaciones/solicitar-autorizacion", l.handleSolicitarAutorizacion)
	mux.HandleFunc("/local/cotizaciones/convertir-venta", l.handleConvertirVenta)
	mux.HandleFunc("/local/cotizaciones/detalle", l.handleDetalleCotizacion)
	mux.HandleFunc("/local/ws", l.handleCajaWs)
	// Operaciones sucursal
	mux.HandleFunc("/local/sucursal/operacion/activa", l.handleOperacionSucursalActiva)
	mux.HandleFunc("/local/sucursal/operacion/resumen-ventas", l.handleResumenVentasOperacion)
	mux.HandleFunc("/local/sucursal/operacion/cerrar", l.handleCerrarOperacionSucursal)
	// Turnos de cajero
	mux.HandleFunc("/local/cajero/turno/abrir", l.handleAbrirCaja)
	mux.HandleFunc("/local/cajero/turno/cerrar", l.handleCerrarCaja)
	mux.HandleFunc("/local/cajero/turno/activo", l.handleOperacionCajeroActiva)
	mux.HandleFunc("/local/cajero/turno/resumen", l.handleResumenCajero)
	mux.HandleFunc("/local/cajero/turnos", l.handleOperacionesCajero)

	l.server = &http.Server{
		Addr:    addr,
		Handler: corsMiddleware(mux),
	}

	log.Printf("[LocalServer] Escuchando en %s", addr)
	if err := l.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Printf("[LocalServer] Error: %v", err)
	}
}

func (l *LocalServerService) handleReceipt(w http.ResponseWriter, r *http.Request) {
	guid := r.URL.Query().Get("pedidoGuid")
	if guid == "" {
		writeError(w, http.StatusBadRequest, "pedidoGuid requerido")
		return
	}
	result, err := l.receipt.BuildReceipt(guid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result})
}

func (l *LocalServerService) handleQuotationPDFData(w http.ResponseWriter, r *http.Request) {
	guid := r.URL.Query().Get("pedidoGuid")
	if guid == "" {
		writeError(w, http.StatusBadRequest, "pedidoGuid requerido")
		return
	}
	result, err := l.receipt.BuildQuotation(guid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result})
}

func (l *LocalServerService) handlePurchasePDFData(w http.ResponseWriter, r *http.Request) {
	guid := r.URL.Query().Get("pedidoGuid")
	if guid == "" {
		writeError(w, http.StatusBadRequest, "pedidoGuid requerido")
		return
	}
	result, err := l.receipt.BuildPurchaseReport(guid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result})
}

func (l *LocalServerService) Stop() {
	if l.server != nil {
		_ = l.server.Close()
	}
}

// ── Middleware ───────────────────────────────────────────────────────────────

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]any{"success": false, "message": msg})
}

// ── Handlers ─────────────────────────────────────────────────────────────────

func (l *LocalServerService) handleHealth(w http.ResponseWriter, r *http.Request) {
	branchName := "Kommerze POS"
	branchID := uint(0)
	branchGuid := ""

	cfg, err := LoadKommerzConfig()
	if err == nil && cfg.License != nil && cfg.License.Sucursal.NombreSucursal != "" {
		branchName = cfg.License.Sucursal.NombreSucursal
		branchGuid = cfg.License.Sucursal.Guid

		// Buscar el ID numérico en la BD si tenemos el GUID
		if branchGuid != "" && l.db != nil {
			var sucursal models.Sucursal
			if err := l.db.Where("guid = ?", branchGuid).First(&sucursal).Error; err == nil {
				branchID = sucursal.ID
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success":    true,
		"message":    "Servidor Local activo",
		"branchName": branchName,
		"branchId":   branchID,
		"branchGuid": branchGuid,
	})
}

func (l *LocalServerService) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo inválido")
		return
	}
	user, err := l.auth.LoginService(body.Username, body.Password)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": user})
}

func (l *LocalServerService) handleProductos(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	q := r.URL.Query().Get("q")
	conExistencia := r.URL.Query().Get("existencia") == "true"
	productos, err := l.pos.ConsultaProductos(q, conExistencia)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": productos})
}

func (l *LocalServerService) handleTiposPedido(w http.ResponseWriter, r *http.Request) {
	tipos, err := l.pos.ObtenerTiposPedido()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": tipos})
}

func (l *LocalServerService) handleExistencias(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var guids []uuid.UUID
	if err := json.NewDecoder(r.Body).Decode(&guids); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo inválido")
		return
	}
	result, err := l.pos.ConsultarExistenciaProductos(guids)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result})
}

func (l *LocalServerService) handleTransacciones(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var body struct {
		TipoOperacion     *uint                   `json:"tipoOperacion"`
		PagosAplicados    []dto.PagosAplicadosDto `json:"pagosAplicados"`
		ItemsPedido       []dto.PedidoProductoDto `json:"itemsPedido"`
		SucursalOrigen    *uint                   `json:"sucursalOrigen"`
		SucursalDestino   *uint                   `json:"sucursalDestino"`
		OperacionCajeroID *uint                   `json:"operacionCajeroID"`
		ClienteGuid       string                  `json:"clienteGuid"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo inválido")
		return
	}
	result, err := l.pos.ConfirmarTransaccion(
		body.TipoOperacion,
		body.PagosAplicados,
		body.ItemsPedido,
		body.SucursalOrigen,
		body.SucursalDestino,
		body.OperacionCajeroID,
		body.ClienteGuid,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleSolicitudesProductos(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var solicitud dto.SolicitudProductosDto
	if err := json.NewDecoder(r.Body).Decode(&solicitud); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo inválido")
		return
	}
	result, err := l.pos.CrearSolicitudProductos(solicitud)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleCrearCompra(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var datos dto.CrearCompraDto
	if err := json.NewDecoder(r.Body).Decode(&datos); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo inválido")
		return
	}
	result, err := l.compras.CrearCompra(datos)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleHistorialTransacciones(w http.ResponseWriter, r *http.Request) {
	var tipoPedidoID *uint
	var sucursalID *uint

	if tipoStr := r.URL.Query().Get("tipo"); tipoStr != "" {
		var tipo uint
		if _, err := fmt.Sscanf(tipoStr, "%d", &tipo); err == nil {
			tipoPedidoID = &tipo
		}
	}
	if sucStr := r.URL.Query().Get("sucursal"); sucStr != "" {
		var suc uint
		if _, err := fmt.Sscanf(sucStr, "%d", &suc); err == nil {
			sucursalID = &suc
		}
	}

	result, err := l.pos.ConsultaTransacciones(tipoPedidoID, sucursalID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleCancelarVenta(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var body struct {
		PedidoGuid string `json:"pedidoGuid"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Solicitud inválida")
		return
	}
	result, err := l.pos.CancelarVenta(body.PedidoGuid)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleTransferencias(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	result, err := l.pos.ConsultarTransferencias()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    result,
	})
}

// ── Clientes handler ──────────────────────────────────────────────────────────

func (l *LocalServerService) handleClientes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	q := r.URL.Query().Get("q")
	clientes, err := l.clientes.BuscarClientes(q)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": clientes})
}

func (l *LocalServerService) handleListadoClientes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	clientes, err := l.clientes.ListarClientes()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": clientes})
}

func (l *LocalServerService) handleDetalleCliente(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	client, err := l.clientes.ObtenerCliente(r.URL.Query().Get("guid"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": client})
}

func (l *LocalServerService) handleGuardarCliente(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var body dto.GuardarClienteDto
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo inválido")
		return
	}
	client, err := l.clientes.GuardarCliente(body)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": client})
}

func (l *LocalServerService) handleBuscarEntidadFiscalCloud(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	entity, err := l.clientes.ConsultarEntidadFiscalCloud(r.URL.Query().Get("rfc"))
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": entity})
}

func (l *LocalServerService) handleBuscarProveedorRFC(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	entity, err := l.proveedores.BuscarEntidadFiscalPorRFC(r.URL.Query().Get("rfc"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": entity})
}

func (l *LocalServerService) handleBuscarProveedores(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	proveedores, err := l.proveedores.BuscarProveedores(r.URL.Query().Get("query"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": proveedores})
}

func (l *LocalServerService) handleGuardarProveedor(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var body dto.GuardarProveedorDto
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo inválido")
		return
	}
	entity, err := l.proveedores.GuardarProveedor(body)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": entity})
}

// ── Catalogos handlers ────────────────────────────────────────────────────────

func catalogoHandler(w http.ResponseWriter, fn func() (*dto.ResponseDto, error)) {
	result, err := fn()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleMarcas(w http.ResponseWriter, _ *http.Request) {
	catalogoHandler(w, l.catalogos.GetMarcas)
}

func (l *LocalServerService) handleLineas(w http.ResponseWriter, _ *http.Request) {
	catalogoHandler(w, l.catalogos.GetLineas)
}

func (l *LocalServerService) handleEmpaques(w http.ResponseWriter, _ *http.Request) {
	catalogoHandler(w, l.catalogos.GetEmpaques)
}

func (l *LocalServerService) handleFormasPago(w http.ResponseWriter, _ *http.Request) {
	catalogoHandler(w, l.catalogos.GetSatFormasPago)
}

func (l *LocalServerService) handleMetodosPago(w http.ResponseWriter, _ *http.Request) {
	catalogoHandler(w, l.catalogos.GetSatMetodosPago)
}

func (l *LocalServerService) handleRegimenFiscal(w http.ResponseWriter, _ *http.Request) {
	catalogoHandler(w, l.catalogos.GetSatRegimenFiscal)
}

func (l *LocalServerService) handleUsosCFDI(w http.ResponseWriter, _ *http.Request) {
	catalogoHandler(w, l.catalogos.GetSatUsosCFDI)
}

func (l *LocalServerService) handleSucursales(w http.ResponseWriter, _ *http.Request) {
	catalogoHandler(w, l.catalogos.GetSucursales)
}

// ── Helper: extraer Bearer token (usado por CajaProxyService) ──────────────────

func extractBearerToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return ""
}

// TestLocalServerConnection verifica que el Servidor Local en serverURL responda.
func TestLocalServerConnection(serverURL string) (map[string]any, error) {
	resp, err := http.Get(fmt.Sprintf("%s/local/health", serverURL))
	if err != nil {
		return nil, fmt.Errorf("no se pudo conectar al Servidor Local: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("el Servidor Local respondió con estado %d", resp.StatusCode)
	}

	var result struct {
		Success    bool   `json:"success"`
		Message    string `json:"message"`
		BranchName string `json:"branchName"`
		BranchId   uint   `json:"branchId"`
		BranchGuid string `json:"branchGuid"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&result)
	if !result.Success {
		return nil, fmt.Errorf("respuesta inesperada del Servidor Local")
	}
	return map[string]any{
		"branchName": result.BranchName,
		"branchId":   result.BranchId,
		"branchGuid": result.BranchGuid,
	}, nil
}

// Asegurar que models se importa (Usuario se usa en handleLogin)
var _ *models.Usuario

// ── WebSocket hub para Cajas ──────────────────────────────────────────────────

var cajaUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// handleCajaWs acepta conexiones WebSocket de las Cajas y les envía
// eventos en tiempo real (ej. cotizacion_resuelta).
func (l *LocalServerService) handleCajaWs(w http.ResponseWriter, r *http.Request) {
	conn, err := cajaUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[LocalServer WS] Error upgrade: %v", err)
		return
	}
	defer conn.Close()

	ch := make(chan []byte, 16)
	l.hub.register(ch)
	defer l.hub.unregister(ch)

	log.Printf("[LocalServer WS] Caja conectada desde %s", r.RemoteAddr)

	// Responder pings de la caja
	conn.SetPingHandler(func(data string) error {
		return conn.WriteMessage(websocket.PongMessage, []byte(data))
	})

	// Ping periódico para mantener la conexión viva
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case msg := <-ch:
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				log.Printf("[LocalServer WS] Caja desconectada: %v", err)
				return
			}
		case <-ticker.C:
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("[LocalServer WS] Ping fallido, caja desconectada: %v", err)
				return
			}
		}
	}
}

func (l *LocalServerService) handleSolicitarAutorizacion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Metodo no permitido")
		return
	}
	var body struct {
		PedidoGuid             string                 `json:"pedidoGuid"`
		SucursalGuid           string                 `json:"sucursalGuid"`
		TipoAutorizacionGuid   string                 `json:"tipoAutorizacionGuid"`
		UsuarioSolicitanteGuid string                 `json:"usuarioSolicitanteGuid"`
		Comentarios            string                 `json:"comentarios"`
		Items                  []dto.ItemDescuentoDto `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo invalido")
		return
	}
	result, err := l.cotizacion.SolicitarAutorizacion(
		body.PedidoGuid,
		body.SucursalGuid,
		body.TipoAutorizacionGuid,
		body.UsuarioSolicitanteGuid,
		body.Comentarios,
		body.Items,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleConvertirVenta(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Metodo no permitido")
		return
	}
	var body struct {
		PedidoID         uint                    `json:"pedidoId"`
		PagosAplicados   []dto.PagosAplicadosDto `json:"pagosAplicados"`
		SucursalOrigenID *uint                   `json:"sucursalOrigenId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo invalido")
		return
	}
	result, err := l.cotizacion.ConvertirAVenta(body.PedidoID, body.PagosAplicados, body.SucursalOrigenID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleDetalleCotizacion(w http.ResponseWriter, r *http.Request) {
	pedidoIDStr := r.URL.Query().Get("pedidoId")
	var pedidoID uint
	fmt.Sscanf(pedidoIDStr, "%d", &pedidoID)
	if pedidoID == 0 {
		writeError(w, http.StatusBadRequest, "pedidoId requerido")
		return
	}
	result, err := l.cotizacion.ObtenerDetalleCotizacion(pedidoID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": result})
}

// ── Handlers: Operaciones de Sucursal ────────────────────────────────────────

func (l *LocalServerService) handleOperacionSucursalActiva(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var sucursalID uint
	fmt.Sscanf(r.URL.Query().Get("sucursalId"), "%d", &sucursalID)
	if sucursalID == 0 {
		writeError(w, http.StatusBadRequest, "sucursalId requerido")
		return
	}
	result := l.operacionesSucursal.ObtenerOperacionSucursalActiva(sucursalID)
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleResumenVentasOperacion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var sucursalID uint
	fmt.Sscanf(r.URL.Query().Get("sucursalId"), "%d", &sucursalID)
	if sucursalID == 0 {
		writeError(w, http.StatusBadRequest, "sucursalId requerido")
		return
	}
	writeJSON(w, http.StatusOK, l.operacionesSucursal.ObtenerResumenVentasOperacion(sucursalID))
}

func (l *LocalServerService) handleCerrarOperacionSucursal(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var body struct {
		OperacionID     uint `json:"operacionId"`
		UsuarioCierreID uint `json:"usuarioCierreId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo inválido")
		return
	}
	result := l.operacionesSucursal.CerrarOperacionSucursal(dto.CerrarOperacionSucursalDto{
		OperacionID:     body.OperacionID,
		UsuarioCierreID: body.UsuarioCierreID,
	})
	// Notificar a todas las Cajas conectadas
	if result != nil && result.Success {
		l.BroadcastToClients("jornada:cerrada", map[string]any{"operacionID": body.OperacionID})
	}
	writeJSON(w, http.StatusOK, result)
}

// ── Handlers: Turnos de Cajero ────────────────────────────────────────────────

func (l *LocalServerService) handleAbrirCaja(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var body dto.AbrirCajaDto
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo inválido")
		return
	}
	result := l.operacionesCaja.AbrirCaja(body)
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleCerrarCaja(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var body dto.CerrarCajaDto
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Cuerpo inválido")
		return
	}
	result := l.operacionesCaja.CerrarCaja(body)
	// Notificar a todas las Cajas conectadas
	if result != nil && result.Success {
		l.BroadcastToClients("turno:cerrado", map[string]any{"operacionCajeroID": body.OperacionCajeroID})
	}
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleOperacionCajeroActiva(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var responsableID uint
	fmt.Sscanf(r.URL.Query().Get("responsableId"), "%d", &responsableID)
	if responsableID == 0 {
		writeError(w, http.StatusBadRequest, "responsableId requerido")
		return
	}
	result := l.operacionesCaja.ObtenerOperacionCajeroActiva(responsableID)
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleOperacionesCajero(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var operacionSucursalID uint
	fmt.Sscanf(r.URL.Query().Get("operacionSucursalId"), "%d", &operacionSucursalID)
	if operacionSucursalID == 0 {
		writeError(w, http.StatusBadRequest, "operacionSucursalId requerido")
		return
	}
	result := l.operacionesCaja.ObtenerOperacionesCajero(operacionSucursalID)
	writeJSON(w, http.StatusOK, result)
}

// handleResumenCajero devuelve el resumen de ingresos calculado del turno del cajero.
func (l *LocalServerService) handleResumenCajero(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	var operacionCajeroID uint
	fmt.Sscanf(r.URL.Query().Get("operacionCajeroId"), "%d", &operacionCajeroID)
	if operacionCajeroID == 0 {
		writeError(w, http.StatusBadRequest, "operacionCajeroId requerido")
		return
	}
	result := l.operacionesCaja.ObtenerResumenCajero(operacionCajeroID)
	writeJSON(w, http.StatusOK, result)
}
