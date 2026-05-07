package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// LocalServerService expone los servicios existentes del Servidor Local
// como una API REST HTTP en :8989 para que las Cajas los consuman.
// No contiene lógica de negocio propia — solo wrappers JSON.
type LocalServerService struct {
	pos       *PosService
	auth      *AuthService
	catalogos *CatalogosService
	server    *http.Server
}

func NewLocalServerService(pos *PosService, auth *AuthService, cat *CatalogosService) *LocalServerService {
	return &LocalServerService{
		pos:       pos,
		auth:      auth,
		catalogos: cat,
	}
}

// Start levanta el servidor HTTP en la goroutine del caller.
// Llamar en una goroutine separada: go svc.Start(":8989")
func (l *LocalServerService) Start(addr string) {
	mux := http.NewServeMux()

	mux.HandleFunc("/local/health", l.handleHealth)
	mux.HandleFunc("/local/auth/login", l.handleLogin)
	mux.HandleFunc("/local/productos", l.handleProductos)
	mux.HandleFunc("/local/transacciones", l.handleTransacciones)
	mux.HandleFunc("/local/tipos-pedido", l.handleTiposPedido)
	mux.HandleFunc("/local/existencias", l.handleExistencias)
	mux.HandleFunc("/local/catalogos/marcas", l.handleMarcas)
	mux.HandleFunc("/local/catalogos/lineas", l.handleLineas)
	mux.HandleFunc("/local/catalogos/empaques", l.handleEmpaques)
	mux.HandleFunc("/local/catalogos/formas-pago", l.handleFormasPago)
	mux.HandleFunc("/local/catalogos/metodos-pago", l.handleMetodosPago)
	mux.HandleFunc("/local/catalogos/regimen-fiscal", l.handleRegimenFiscal)
	mux.HandleFunc("/local/catalogos/usos-cfdi", l.handleUsosCFDI)
	mux.HandleFunc("/local/catalogos/sucursales", l.handleSucursales)
	mux.HandleFunc("/local/transacciones/historial", l.handleHistorialTransacciones)

	l.server = &http.Server{
		Addr:    addr,
		Handler: corsMiddleware(mux),
	}

	log.Printf("[LocalServer] Escuchando en %s", addr)
	if err := l.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Printf("[LocalServer] Error: %v", err)
	}
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
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Servidor Local activo"})
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
	productos, err := l.pos.ConsultaProductos(q)
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
		TipoOperacion   *uint                     `json:"tipoOperacion"`
		PagosAplicados  []dto.PagosAplicadosDto   `json:"pagosAplicados"`
		ItemsPedido     []dto.PedidoProductoDto   `json:"itemsPedido"`
		SucursalOrigen  *uint                     `json:"sucursalOrigen"`
		SucursalDestino *uint                     `json:"sucursalDestino"`
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
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (l *LocalServerService) handleHistorialTransacciones(w http.ResponseWriter, _ *http.Request) {
	result, err := l.pos.ConsultaTransacciones()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
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
func TestLocalServerConnection(serverURL string) error {
	resp, err := http.Get(fmt.Sprintf("%s/local/health", serverURL))
	if err != nil {
		return fmt.Errorf("no se pudo conectar al Servidor Local: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("el Servidor Local respondió con estado %d", resp.StatusCode)
	}

	var result struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&result)
	if !result.Success {
		return fmt.Errorf("respuesta inesperada del Servidor Local")
	}
	return nil
}

// Asegurar que models se importa (Usuario se usa en handleLogin)
var _ *models.Usuario
