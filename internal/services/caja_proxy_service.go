package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
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

func (c *CajaProxyService) ConsultaProductos(busqueda string) ([]dto.ProductoDto, error) {
	var result struct {
		Success bool             `json:"success"`
		Data    []dto.ProductoDto `json:"data"`
	}
	if err := c.get(fmt.Sprintf("/local/productos?q=%s", busqueda), &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *CajaProxyService) ObtenerTiposPedido() ([]models.TipoPedido, error) {
	var result struct {
		Success bool               `json:"success"`
		Data    []models.TipoPedido `json:"data"`
	}
	if err := c.get("/local/tipos-pedido", &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *CajaProxyService) ConsultarExistenciaProductos(guids []uuid.UUID) ([]dto.InventarioDto, error) {
	var result struct {
		Success bool               `json:"success"`
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
) (*dto.ResponseDto, error) {
	body := map[string]any{
		"tipoOperacion":   tipoOperacion,
		"pagosAplicados":  pagosAplicados,
		"itemsPedido":     itemsPedido,
		"sucursalOrigen":  sucursalOrigen,
		"sucursalDestino": sucursalDestino,
	}
	var result dto.ResponseDto
	if err := c.post("/local/transacciones", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *CajaProxyService) ConsultaTransacciones() (*dto.ResponseDto, error) {
	var result dto.ResponseDto
	if err := c.get("/local/transacciones/historial", &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// SetContext es un no-op en Caja (no hay contexto Wails local).
func (c *CajaProxyService) SetContext(_ interface{}) {}

// ── AuthService equivalente ───────────────────────────────────────────────────

func (c *CajaProxyService) LoginService(username, password string) (*models.Usuario, error) {
	body := map[string]string{"username": username, "password": password}
	var result struct {
		Success bool          `json:"success"`
		Message string        `json:"message"`
		Data    *models.Usuario `json:"data"`
	}
	if err := c.post("/local/auth/login", body, &result); err != nil {
		return nil, err
	}
	if !result.Success || result.Data == nil {
		return nil, fmt.Errorf(result.Message)
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
