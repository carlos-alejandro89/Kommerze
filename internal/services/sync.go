package services

import (
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
	"encoding/json"
	"fmt"
	"net/http"

	"gorm.io/gorm"
)

type ApiResponse struct {
	Success  bool   `json:"success"`
	Mensaje  string `json:"mensaje"`
	HttpCode int    `json:"httpCode"`
	Data     []any  `json:"data"`
}

type SyncService struct {
	db          *gorm.DB
	repo        *repository.CatalogosRepository
	repoPrecios *repository.ListaPreciosRepository
	apiBaseURL  string
	client      *CloudHttpClient
}

func NewSyncService(
	db *gorm.DB,
	repo *repository.CatalogosRepository,
	repoPrecios *repository.ListaPreciosRepository,
	apiBaseURL string,
	client *CloudHttpClient) *SyncService {
	return &SyncService{
		db:          db,
		repo:        repo,
		repoPrecios: repoPrecios,
		apiBaseURL:  apiBaseURL,
		client:      client,
	}
}

func (s *SyncService) SyncLinea() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/lineas/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("Error en servicio: %w", err)
	}

	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("No se pudo conectar al servicio: %w", err)
	}

	var result ApiResponse
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		fmt.Println("Error al decodificar:", err)
		return nil, fmt.Errorf("Error al decodificar: %w", err)
	}

	if err := s.repo.SaveLineas(result.Data); err != nil {
		return nil, fmt.Errorf("Error al sincronizar: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncEmpaques() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/empaques/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("Error en servicio: %w", err)
	}

	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("No se pudo conectar al servicio: %w", err)
	}

	var result ApiResponse
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		fmt.Println("Error al decodificar:", err)
		return nil, fmt.Errorf("Error al decodificar: %w", err)
	}

	if err := s.repo.SaveEmpaques(result.Data); err != nil {
		return nil, fmt.Errorf("Error al sincronizar: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncReglasConversionProducto() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/reglas-conversion-producto/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error consultando reglas de conversión: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("el catálogo de reglas de conversión respondió %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decodificando reglas de conversión: %w", err)
	}
	if !result.Success {
		return nil, fmt.Errorf("no se pudieron obtener las reglas de conversión: %s", result.Mensaje)
	}
	if err := s.repo.SaveReglasConversionProducto(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando reglas de conversión: %w", err)
	}
	return result.Data, nil
}

func (s *SyncService) SyncSatUnidadesMedida() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/sat/unidades-medida/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error consultando unidades de medida SAT: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("el catálogo de unidades de medida SAT respondió %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decodificando unidades de medida SAT: %w", err)
	}
	if !result.Success {
		return nil, fmt.Errorf("no se pudieron obtener las unidades de medida SAT: %s", result.Mensaje)
	}
	if err := s.repo.SaveSatUnidadesMedida(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando unidades de medida SAT: %w", err)
	}
	return result.Data, nil
}

func (s *SyncService) SyncMarcas() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/marcas/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("Error en servicio: %w", err)
	}

	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("No se pudo conectar al servicio: %w", err)
	}

	var result ApiResponse
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		fmt.Println("Error al decodificar:", err)
		return nil, fmt.Errorf("Error al decodificar: %w", err)
	}

	if err := s.repo.SaveMarcas(result.Data); err != nil {
		return nil, fmt.Errorf("Error al sincronizar: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncSatProductos() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/sat/productos/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("Error en servicio: %w", err)
	}

	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("No se pudo conectar al servicio: %w", err)
	}

	var result ApiResponse
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		fmt.Println("Error al decodificar:", err)
		return nil, fmt.Errorf("Error al decodificar: %w", err)
	}

	if err := s.repo.SaveSatProductos(result.Data); err != nil {
		return nil, fmt.Errorf("Error al sincronizar: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncProductos() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/productos/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := s.repo.SaveProductos(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncNivelesEmpaque() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/niveles-empaque/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := s.repo.SaveNivelesEmpaque(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncSatFormasPago() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/sat/formas-pago/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := s.repo.SaveSatFormasPago(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncSatMetodosPago() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/sat/metodos-pago/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := s.repo.SaveSatMetodosPago(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncSatUsosCfdi() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/sat/usos-cfdi/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := s.repo.SaveSatUsosCFDI(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncSatRegimenFiscal() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/sat/regimen-fiscal/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := s.repo.SaveSatRegimenFiscal(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (a *SyncService) SyncEmpresas() ([]any, error) {
	resp, err := a.client.Get(fmt.Sprintf("%s/catalogos/empresas/get", a.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := a.repo.SaveEmpresas(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (a *SyncService) SyncSucursales() ([]any, error) {
	resp, err := a.client.Get(fmt.Sprintf("%s/catalogos/sucursales/get", a.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := a.repo.SaveSucursales(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (a *SyncService) SyncSucursalProductos(parameters map[string]any) ([]any, error) {
	sucursalGuid := fmt.Sprintf("%v", parameters["sucursalGuid"])
	fmt.Printf("[SyncListaPrecios] Iniciando → URL: %s/lista-precios/get-precios/%s\n", a.apiBaseURL, sucursalGuid)

	resp, err := a.client.Get(fmt.Sprintf("%s/lista-precios/get-precios/%s", a.apiBaseURL, sucursalGuid))
	if err != nil {
		fmt.Printf("[SyncListaPrecios] ❌ Error en la solicitud HTTP: %v\n", err)
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("[SyncListaPrecios] ❌ La API respondió con status %d\n", resp.StatusCode)
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		fmt.Printf("[SyncListaPrecios] ❌ Error decodificando JSON: %v\n", err)
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	fmt.Printf("[SyncListaPrecios] ✓ Registros recibidos: %d\n", len(result.Data))

	if err := a.repoPrecios.SaveSucursalProducto(result.Data); err != nil {
		fmt.Printf("[SyncListaPrecios] ❌ Error guardando en BD: %v\n", err)
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	fmt.Printf("[SyncListaPrecios] ✅ Sincronización completada\n")
	return result.Data, nil
}

func (s *SyncService) SyncPerfiles() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/perfiles/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := s.repo.SavePerfiles(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncRolesFiscales() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/roles-fiscales/get", s.apiBaseURL))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}
	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	if err := s.repo.SaveRolesFiscales(result.Data); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (s *SyncService) SyncClientes() (*dto.ClientesSyncDto, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/clientes/sync", s.apiBaseURL))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}
	var result struct {
		Success bool                `json:"success"`
		Mensaje string              `json:"mensaje"`
		Data    dto.ClientesSyncDto `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	if !result.Success {
		return nil, fmt.Errorf("%s", result.Mensaje)
	}
	if err := s.repo.SaveClientesSync(result.Data); err != nil {
		return nil, err
	}
	return &result.Data, nil
}

func (s *SyncService) SyncUsuarios() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/usuarios/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := s.repo.SaveUsuarios(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncTiposPedido() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/tipos-pedido/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := s.repo.SaveTiposPedido(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncTiposAutorizacion() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/tipos-autorizacion/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := s.repo.SaveTiposAutorizacion(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}

func (s *SyncService) SyncEstatus() ([]any, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/catalogos/estatus/get", s.apiBaseURL))
	if err != nil {
		return nil, fmt.Errorf("error in request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var result ApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding JSON: %w", err)
	}

	if err := s.repo.SaveEstatus(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}
