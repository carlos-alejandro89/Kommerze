package services

import (
	"BitComercio/internal/repository/dto"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	netPayBasicAuthUser     = "trusted-app"
	netPayBasicAuthPassword = "secret"
)

type NetPayService struct {
	apiBaseURL     string
	wsBaseURL      string
	client         *CloudHttpClient
	ctx            context.Context
	accessToken    string
	refreshToken   string
	accessTokenExp time.Time
	mu             sync.Mutex
	wsMu           sync.Mutex
	wsPaymentGuid  string
	wsCancel       context.CancelFunc
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

type NetPayPaymentWsMessage struct {
	PaymentGuid  string         `json:"paymentGuid"`
	ResponseCode string         `json:"responseCode"`
	Message      string         `json:"message"`
	CardType     string         `json:"cardType,omitempty"`
	CardTypeName string         `json:"cardTypeName,omitempty"`
	Raw          map[string]any `json:"raw,omitempty"`
}

func NewNetPayService(apiBaseURL string, wsBaseURL string, client *CloudHttpClient) *NetPayService {
	wsURL := strings.ReplaceAll(wsBaseURL, "https://", "wss://")
	wsURL = strings.ReplaceAll(wsURL, "http://", "ws://")
	return &NetPayService{apiBaseURL: apiBaseURL, wsBaseURL: wsURL, client: client}
}

func (s *NetPayService) SetContext(ctx context.Context) {
	s.ctx = ctx
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

	if paymentGuid := payload.Traceability["paymentGuid"]; paymentGuid != "" {
		s.ConnectWS(paymentGuid)
	}

	return dto.NewResponseDto(true, "Venta NetPay procesada correctamente", mapResult, nil)
}

func (s *NetPayService) ConnectWS(paymentGuid string) {
	if paymentGuid == "" {
		return
	}

	s.wsMu.Lock()
	if s.wsPaymentGuid == paymentGuid {
		s.wsMu.Unlock()
		return
	}
	if s.wsCancel != nil {
		s.wsCancel()
	}
	ctx, cancel := context.WithCancel(context.Background())
	s.wsPaymentGuid = paymentGuid
	s.wsCancel = cancel
	s.wsMu.Unlock()

	go s.wsLoop(ctx, paymentGuid)
}

func (s *NetPayService) wsLoop(ctx context.Context, paymentGuid string) {
	backoff := 3 * time.Second
	const maxBackoff = 1 * time.Minute

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		log.Printf("[NetPayWS] Conectando a respuesta de pago %s...", paymentGuid)
		if err := s.wsSession(ctx, paymentGuid); err != nil {
			log.Printf("[NetPayWS] Desconectado: %v. Reintento en %s", err, backoff)
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}

		backoff *= 2
		if backoff > maxBackoff {
			backoff = maxBackoff
		}
	}
}

func (s *NetPayService) wsSession(ctx context.Context, paymentGuid string) error {
	if s.client.Token() == "" {
		if err := s.client.Login(); err != nil {
			return fmt.Errorf("login cloud fallido: %w", err)
		}
	}

	header := http.Header{}
	header.Set("Authorization", "Bearer "+s.client.Token())

	url := fmt.Sprintf("%s/ws/pos/payments/%s", s.wsBaseURL, paymentGuid)
	conn, _, err := websocket.DefaultDialer.Dial(url, header)
	if err != nil {
		return fmt.Errorf("dial WS: %w", err)
	}
	defer conn.Close()

	done := make(chan struct{})
	defer close(done)
	go func() {
		select {
		case <-ctx.Done():
			conn.Close()
		case <-done:
		}
	}()

	log.Printf("[NetPayWS] Conectado a %s", url)

	conn.SetPingHandler(func(data string) error {
		return conn.WriteMessage(websocket.PongMessage, []byte(data))
	})

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			return fmt.Errorf("read WS: %w", err)
		}
		s.handleWsMessage(raw, paymentGuid)
	}
}

func (s *NetPayService) handleWsMessage(raw []byte, paymentGuid string) {
	message, err := parseNetPayPaymentMessage(raw)
	if err != nil {
		log.Printf("[NetPayWS] Mensaje invalido: %v", err)
		return
	}
	message.PaymentGuid = paymentGuid

	log.Printf("[NetPayWS] Respuesta recibida: responseCode=%s message=%s", message.ResponseCode, message.Message)

	if s.ctx != nil {
		runtime.EventsEmit(s.ctx, "netpay_payment_response", message)
	}
}

func parseNetPayPaymentMessage(raw []byte) (NetPayPaymentWsMessage, error) {
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return NetPayPaymentWsMessage{}, err
	}

	if data, ok := payload["data"]; ok {
		if dataMap, ok := data.(map[string]any); ok {
			payload = dataMap
		} else if dataRaw, err := json.Marshal(data); err == nil {
			var dataMap map[string]any
			if err := json.Unmarshal(dataRaw, &dataMap); err == nil {
				payload = dataMap
			}
		}
	}

	responseCode, _ := payload["responseCode"].(string)
	message, _ := payload["message"].(string)
	cardType, _ := payload["card_type"].(string)
	if cardType == "" {
		cardType, _ = payload["cardType"].(string)
	}
	if cardType == "" {
		cardType, _ = payload["CardType"].(string)
	}
	cardTypeName, _ := payload["cardTypeName"].(string)
	if cardTypeName == "" {
		cardTypeName, _ = payload["card_type_name"].(string)
	}
	if cardTypeName == "" {
		cardTypeName, _ = payload["CardTypeName"].(string)
	}

	if responseCode == "" {
		return NetPayPaymentWsMessage{}, fmt.Errorf("payload sin responseCode")
	}

	return NetPayPaymentWsMessage{
		ResponseCode: responseCode,
		Message:      message,
		CardType:     cardType,
		CardTypeName: cardTypeName,
		Raw:          payload,
	}, nil
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
