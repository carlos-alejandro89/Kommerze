package services

import (
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
	requestdto "BitComercio/internal/services/requestDto"
	"bytes"
	"encoding/json"
	"fmt"
)

type ApiCloudService struct {
	apiBaseURL string
	repo       *repository.CatalogosRepository
	client     *CloudHttpClient
}
type ApiCloudResponse struct {
	Success  bool        `json:"success"`
	Mensaje  string      `json:"mensaje"`
	HttpCode int         `json:"httpCode"`
	Data     interface{} `json:"data"`
}

func NewApiCloudService(apiBaseURL string, repo *repository.CatalogosRepository, client *CloudHttpClient) *ApiCloudService {
	return &ApiCloudService{apiBaseURL: apiBaseURL, repo: repo, client: client}
}

func (a *ApiCloudService) ApiCreateProducto(producto requestdto.ProductoCreate) *dto.ResponseDto {

	jsonData, err := json.Marshal(producto)
	if err != nil {
		return dto.NewResponseDto(false, "Error al serializar producto", nil, []string{err.Error()})
	}

	resp, err := a.client.Post(fmt.Sprintf("%s/catalogos/productos/create", a.apiBaseURL), "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return dto.NewResponseDto(false, "Error al crear producto", nil, []string{err.Error()})
	}

	var result ApiCloudResponse
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		fmt.Println("Error al decodificar:", err)
		return dto.NewResponseDto(false, "Error al decodificar", nil, []string{err.Error()})
	}
	defer resp.Body.Close()

	if result.Success {
		var response = result.Data.(map[string]any)

		a.repo.SaveProductos([]any{response["producto"]})
		a.repo.SaveNivelesEmpaque(response["nivelEmpaque"].([]any))
	}

	return dto.NewResponseDto(result.Success, result.Mensaje, result.Data, nil)
}
