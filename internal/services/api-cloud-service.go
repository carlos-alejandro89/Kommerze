package services

import (
	"BitComercio/internal/repository/dto"
	requestdto "BitComercio/internal/services/requestDto"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

type ApiCloudService struct {
	apiBaseURL string
}
type ApiCloudResponse struct {
	Success  bool        `json:"success"`
	Mensaje  string      `json:"mensaje"`
	HttpCode int         `json:"httpCode"`
	Data     interface{} `json:"data"`
}

func NewApiCloudService(apiBaseURL string) *ApiCloudService {
	return &ApiCloudService{apiBaseURL: apiBaseURL}
}

func (a *ApiCloudService) ApiCreateProducto(producto requestdto.ProductoCreate) *dto.ResponseDto {

	jsonData, err := json.Marshal(producto)
	if err != nil {
		return dto.NewResponseDto(false, "Error al serializar producto", nil, []string{err.Error()})
	}

	resp, err := http.Post(fmt.Sprintf("%s/catalogos/productos/create", a.apiBaseURL), "application/json", bytes.NewBuffer(jsonData))
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
	return dto.NewResponseDto(result.Success, result.Mensaje, result.Data, nil)
}
