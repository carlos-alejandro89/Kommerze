package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type AuditoriaService struct {
	auditoriaRepo *repository.AuditoriaSucursalRepository
	wsBaseURL     string
	client        *CloudHttpClient
	ctx           context.Context
	wsMu          sync.Mutex
	wsGuid        string
	wsCancel      context.CancelFunc
}

func NewAuditoriaService(auditoriaRepo *repository.AuditoriaSucursalRepository, apiBaseURL string, client *CloudHttpClient) *AuditoriaService {
	wsURL := strings.ReplaceAll(apiBaseURL, "https://", "wss://")
	wsURL = strings.ReplaceAll(wsURL, "http://", "ws://")
	return &AuditoriaService{
		auditoriaRepo: auditoriaRepo,
		wsBaseURL:     wsURL,
		client:        client,
	}
}

func (a *AuditoriaService) SetContext(ctx context.Context) {
	a.ctx = ctx
}

func (a *AuditoriaService) ObtenerResumenInventario() *dto.ResponseDto {
	return a.auditoriaRepo.ObtenerResumenInventario()
}

func (a *AuditoriaService) IniciarAuditoria(sucursalGuid string, usuarioEncargadoGuid string) *dto.ResponseDto {
	res := a.auditoriaRepo.IniciarAuditoria(sucursalGuid, usuarioEncargadoGuid)
	if res != nil && res.Success {
		if auditoriaGuid := auditoriaGuidFromData(res.Data); auditoriaGuid != "" {
			a.ConnectWS(auditoriaGuid)
		}
	}
	return res
}

func auditoriaGuidFromData(data any) string {
	switch v := data.(type) {
	case models.Auditoria:
		if v.Guid != uuid.Nil {
			return v.Guid.String()
		}
	case *models.Auditoria:
		if v != nil && v.Guid != uuid.Nil {
			return v.Guid.String()
		}
	case dto.AuditoriaInicioDto:
		if v.Auditoria.Guid != uuid.Nil {
			return v.Auditoria.Guid.String()
		}
	case *dto.AuditoriaInicioDto:
		if v != nil && v.Auditoria.Guid != uuid.Nil {
			return v.Auditoria.Guid.String()
		}
	case map[string]any:
		for _, key := range []string{"Guid", "guid"} {
			if value, ok := v[key].(string); ok {
				return value
			}
		}
		if auditoria, ok := v["auditoria"].(map[string]any); ok {
			for _, key := range []string{"Guid", "guid"} {
				if value, ok := auditoria[key].(string); ok {
					return value
				}
			}
		}
	}
	return ""
}

func (a *AuditoriaService) ConnectWS(auditoriaGuid string) {
	if auditoriaGuid == "" {
		return
	}

	a.wsMu.Lock()
	if a.wsGuid == auditoriaGuid {
		a.wsMu.Unlock()
		return
	}
	if a.wsCancel != nil {
		a.wsCancel()
	}
	ctx, cancel := context.WithCancel(context.Background())
	a.wsGuid = auditoriaGuid
	a.wsCancel = cancel
	a.wsMu.Unlock()

	go a.wsLoop(ctx, auditoriaGuid)
}

func (a *AuditoriaService) wsLoop(ctx context.Context, auditoriaGuid string) {
	backoff := 5 * time.Second
	const maxBackoff = 5 * time.Minute

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		log.Printf("[AuditoriaWS] Conectando a cloud para auditoria %s...", auditoriaGuid)
		if err := a.wsSession(ctx, auditoriaGuid); err != nil {
			log.Printf("[AuditoriaWS] Desconectado: %v. Reintento en %s", err, backoff)
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

func (a *AuditoriaService) wsSession(ctx context.Context, auditoriaGuid string) error {
	if a.client.Token() == "" {
		if err := a.client.Login(); err != nil {
			return fmt.Errorf("login cloud fallido: %w", err)
		}
	}

	header := http.Header{}
	header.Set("Authorization", "Bearer "+a.client.Token())

	url := fmt.Sprintf("%s/ws/auditorias/%s", a.wsBaseURL, auditoriaGuid)
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

	log.Printf("[AuditoriaWS] Conectado a %s", url)

	conn.SetPingHandler(func(data string) error {
		return conn.WriteMessage(websocket.PongMessage, []byte(data))
	})

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			return fmt.Errorf("read WS: %w", err)
		}
		a.handleWsMessage(raw)
	}
}

func (a *AuditoriaService) handleWsMessage(raw []byte) {
	conteo, err := parseAuditoriaConteoMessage(raw)
	if err != nil {
		log.Printf("[AuditoriaWS] Mensaje invalido: %v", err)
		return
	}

	if err := a.auditoriaRepo.GuardarConteoCloud(conteo); err != nil {
		log.Printf("[AuditoriaWS] Error guardando conteo: %v", err)
		return
	}

	log.Printf("[AuditoriaWS] Conteo aplicado: auditoria %s nivel %s -> %.4f", conteo.GuidAuditoria, conteo.GuidNivel, conteo.Conteo)
	if a.ctx != nil {
		producto := a.auditoriaRepo.ConsultaProductoAuditoria(conteo.GuidNivel)
		if producto != nil {
			runtime.EventsEmit(a.ctx, "auditoria_conteo_actualizado", producto)
		}
	}
}

func parseAuditoriaConteoMessage(raw []byte) (dto.AuditoriaConteoWsDto, error) {
	var conteo dto.AuditoriaConteoWsDto
	if err := json.Unmarshal(raw, &conteo); err != nil {
		return conteo, err
	}
	if conteo.GuidAuditoria != "" && conteo.GuidNivel != "" {
		return conteo, nil
	}

	var envelope dto.WsMessage
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return conteo, err
	}
	if len(envelope.Data) == 0 {
		return conteo, fmt.Errorf("payload sin guidAuditoria/guidNivel")
	}
	if err := json.Unmarshal(envelope.Data, &conteo); err != nil {
		return conteo, err
	}
	if conteo.GuidAuditoria == "" || conteo.GuidNivel == "" {
		return conteo, fmt.Errorf("payload incompleto")
	}
	return conteo, nil
}
