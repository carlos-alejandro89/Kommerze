package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
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

func NewNetPayService(apiBaseURL string, client *CloudHttpClient) *NetPayService {
	return &NetPayService{apiBaseURL: apiBaseURL, client: client}
}

func (s *NetPayService) AuthGetToken() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	credentials, err := LoadNetPayCredentials()
	if err != nil {
		return err
	}

	payload, err := json.Marshal(map[string]string{
		"userName":     credentials.NetPayUser,
		"password":     credentials.NetPayPassword,
		"storeId":      credentials.NetPayStoreId,
		"deviceSerial": credentials.NetPayDeviceSerial,
	})
	if err != nil {
		return err
	}

	//url := fmt.Sprintf("%s/auth/token", s.apiBaseURL)
	resp, err := s.client.Post(fmt.Sprintf("%s/oauth-service/oauth/token", s.apiBaseURL), "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("error al iniciar sesión: status %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("error leyendo respuesta de login: %w", err)
	}

	var mapResult map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &mapResult); err != nil {
		return fmt.Errorf("no se pudo decodificar la respuesta JSON: %w", err)
	}

	if t, ok := mapResult["access_token"].(string); ok {
		s.accessToken = t
		return nil
	}

	if data, ok := mapResult["data"].(map[string]interface{}); ok {
		if t, ok := data["access_token"].(string); ok {
			s.accessToken = t
			return nil
		}
	}

	return fmt.Errorf("no se encontró el token en la respuesta: %s", string(bodyBytes))

}
