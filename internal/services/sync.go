package services

import (
	"BitComercio/internal/repository"
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
	fmt.Println("Conectando al servicio de lista de precios...")
	fmt.Println(a.apiBaseURL)
	fmt.Println(parameters["sucursalGuid"])
	resp, err := a.client.Get(fmt.Sprintf("%s/lista-precios/get-precios/%s", a.apiBaseURL, parameters["sucursalGuid"]))
	if err != nil {
		fmt.Println("Error en la solicitud:", err)
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

	fmt.Println("Datos recibidos:", result.Data)
	if err := a.repoPrecios.SaveSucursalProducto(result.Data); err != nil {
		return nil, fmt.Errorf("error sincronizando datos: %w", err)
	}

	return result.Data, nil
}
