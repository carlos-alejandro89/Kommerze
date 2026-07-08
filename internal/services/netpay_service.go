package services

import (
	"BitComercio/internal/repository/dto"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"sync"
	"time"
)

const (
	netPayBasicAuthUser     = "trusted-app"
	netPayBasicAuthPassword = "secret"
)

type NetPayService struct {
	apiBaseURL     string
	client         *CloudHttpClient
	accessToken    string
	refreshToken   string
	accessTokenExp time.Time
	mu             sync.Mutex
}

type NetPayResponse struct {
	Success  bool        `json:"success"`
	Mensaje  string      `json:"mensaje"`
	HttpCode int         `json:"httpCode"`
	Data     interface{} `json:"data"`
}

type NetPaySaleRequest struct {
	SerialNumber string            `json:"serialNumber"`
	Amount       string            `json:"amount"`
	StoreID      string            `json:"storeId"`
	FolioNumber  string            `json:"folioNumber"`
	MSI          string            `json:"msi"`
	Traceability map[string]string `json:"traceability"`
}

func NewNetPayService(apiBaseURL string, client *CloudHttpClient) *NetPayService {
	return &NetPayService{apiBaseURL: apiBaseURL, client: client}
}

func (s *NetPayService) AuthGetToken() *dto.ResponseDto {
	s.mu.Lock()
	defer s.mu.Unlock()
	credentials, err := LoadNetPayCredentials()
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	var payload bytes.Buffer
	writer := multipart.NewWriter(&payload)
	err = writer.WriteField("username", credentials.NetPayUser)
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	if err := writer.WriteField("password", credentials.NetPayPassword); err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	if err := writer.WriteField("grant_type", "password"); err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	if err := writer.Close(); err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	req, err := http.NewRequest(
		http.MethodPost,
		fmt.Sprintf("%s/oauth-service/oauth/token", s.apiBaseURL),
		&payload,
	)
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.SetBasicAuth(netPayBasicAuthUser, netPayBasicAuthPassword)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return dto.NewResponseDto(false, "error al iniciar sesión: status "+fmt.Sprintf("%d", resp.StatusCode), nil, []string{fmt.Sprintf("status %d", resp.StatusCode)})
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return dto.NewResponseDto(false, "error leyendo respuesta de login: "+err.Error(), nil, []string{err.Error()})
	}

	var mapResult map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &mapResult); err != nil {
		return dto.NewResponseDto(false, "no se pudo decodificar la respuesta JSON: "+err.Error(), nil, []string{err.Error()})
	}

	if t, ok := mapResult["access_token"].(string); ok {
		s.accessToken = t
		s.accessTokenExp = netPayTokenExpiration(mapResult)
		return dto.NewResponseDto(true, "Token obtenido correctamente", mapResult, nil)
	}

	return dto.NewResponseDto(false, "no se encontró el token en la respuesta: "+string(bodyBytes), nil, []string{"access_token no encontrado"})

}

func (s *NetPayService) SaleTransaction(payload NetPaySaleRequest) *dto.ResponseDto {
	tokenResponse := s.ensureAccessToken()
	if !tokenResponse.Success {
		return tokenResponse
	}

	credentials, err := LoadNetPayCredentials()
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	if payload.SerialNumber == "" {
		payload.SerialNumber = credentials.NetPayDeviceSerial
	}
	if payload.StoreID == "" {
		payload.StoreID = credentials.NetPayStoreId
	}
	if payload.MSI == "" {
		payload.MSI = "00"
	}
	if payload.Traceability == nil {
		payload.Traceability = map[string]string{}
	}

	requestBody, err := json.Marshal(payload)
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	s.mu.Lock()
	token := s.accessToken
	s.mu.Unlock()

	req, err := http.NewRequest(
		http.MethodPost,
		fmt.Sprintf("%s/integration-service/transactions/sale", s.apiBaseURL),
		bytes.NewBuffer(requestBody),
	)
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return dto.NewResponseDto(false, "error leyendo respuesta de venta: "+err.Error(), nil, []string{err.Error()})
	}

	var mapResult map[string]any
	if len(bodyBytes) > 0 {
		if err := json.Unmarshal(bodyBytes, &mapResult); err != nil {
			return dto.NewResponseDto(false, "no se pudo decodificar la respuesta JSON: "+err.Error(), nil, []string{err.Error()})
		}
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return dto.NewResponseDto(
			false,
			"error al procesar venta NetPay: status "+fmt.Sprintf("%d", resp.StatusCode),
			mapResult,
			[]string{string(bodyBytes)},
		)
	}

	return dto.NewResponseDto(true, "Venta NetPay procesada correctamente", mapResult, nil)
}

func (s *NetPayService) ensureAccessToken() *dto.ResponseDto {
	s.mu.Lock()
	hasValidToken := s.accessToken != "" && time.Now().Before(s.accessTokenExp.Add(-1*time.Minute))
	s.mu.Unlock()

	if hasValidToken {
		return dto.NewResponseDto(true, "Token disponible", nil, nil)
	}

	return s.AuthGetToken()
}

func netPayTokenExpiration(response map[string]interface{}) time.Time {
	expiresIn, ok := response["expires_in"].(float64)
	if !ok || expiresIn <= 0 {
		return time.Now()
	}
	return time.Now().Add(time.Duration(expiresIn) * time.Second)
}
