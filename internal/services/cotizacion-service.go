package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/shopspring/decimal"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gorm.io/gorm"
)

// CotizacionService gestiona el ciclo de vida de las cotizaciones:
// solicitud de autorizacion de descuentos, recepcion de resoluciones via WebSocket
// desde el cloud, y conversion a venta.
type CotizacionService struct {
	db          *gorm.DB
	apiBaseURL  string
	wsBaseURL   string
	client      *CloudHttpClient
	ctx         context.Context
	broadcastFn func(eventType string, data any) // notifica a Cajas conectadas vía WS local
}

// NewCotizacionService crea el servicio y arranca la goroutine de polling WebSocket.
func NewCotizacionService(db *gorm.DB, apiBaseURL string, client *CloudHttpClient) *CotizacionService {
	wsURL := strings.ReplaceAll(apiBaseURL, "https://", "wss://")
	wsURL = strings.ReplaceAll(wsURL, "http://", "ws://")
	return &CotizacionService{
		db:         db,
		apiBaseURL: apiBaseURL,
		wsBaseURL:  wsURL,
		client:     client,
	}
}

// SetContext recibe el contexto Wails para poder emitir eventos al frontend.
func (s *CotizacionService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// SetBroadcast inyecta la función de broadcast del LocalServerService.
// Se llama desde services.go después de crear ambos servicios.
func (s *CotizacionService) SetBroadcast(fn func(eventType string, data any)) {
	s.broadcastFn = fn
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

// ConnectWS arranca la goroutine de conexion WebSocket con reconexion automatica.
// Debe llamarse una vez al iniciar el servicio en modo Servidor Local.
func (s *CotizacionService) ConnectWS(sucursalGuid string) {
	go s.wsLoop(sucursalGuid)
}

func (s *CotizacionService) wsLoop(sucursalGuid string) {
	backoff := 5 * time.Second
	const maxBackoff = 5 * time.Minute
	for {
		log.Printf("[CotizacionWS] Conectando a cloud para sucursal %s...", sucursalGuid)
		if err := s.wsSession(sucursalGuid); err != nil {
			log.Printf("[CotizacionWS] Desconectado: %v. Reintento en %s", err, backoff)
		}
		time.Sleep(backoff)
		backoff *= 2
		if backoff > maxBackoff {
			backoff = maxBackoff
		}
	}
}

func (s *CotizacionService) wsSession(sucursalGuid string) error {
	// Asegurar token valido
	if s.client.Token() == "" {
		if err := s.client.Login(); err != nil {
			return fmt.Errorf("login cloud fallido: %w", err)
		}
	}

	header := http.Header{}
	header.Set("Authorization", "Bearer "+s.client.Token())

	url := fmt.Sprintf("%s/ws/sucursal/%s", s.wsBaseURL, sucursalGuid)
	conn, _, err := websocket.DefaultDialer.Dial(url, header)
	if err != nil {
		return fmt.Errorf("dial WS: %w", err)
	}
	defer conn.Close()
	log.Printf("[CotizacionWS] ✅ Conectado a %s", url)

	// Responder pings del servidor
	conn.SetPingHandler(func(data string) error {
		return conn.WriteMessage(websocket.PongMessage, []byte(data))
	})

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			return fmt.Errorf("read WS: %w", err)
		}
		s.handleWsMessage(raw)
	}
}

func isApprovedStatus(status string) bool {
	s := strings.ToLower(status)
	return s == "autorizada" || s == "autorizado" || s == "aprobada" || s == "aprobado"
}

func isRejectedStatus(status string) bool {
	s := strings.ToLower(status)
	return s == "rechazada" || s == "rechazado"
}

func (s *CotizacionService) handleWsMessage(raw []byte) {
	var msg dto.WsMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		log.Printf("[CotizacionWS] Mensaje invalido: %v", err)
		return
	}
	switch msg.Type {
	case "cotizacion_resuelta":
		var res dto.ResolucionCotizacionDto
		if err := json.Unmarshal(msg.Data, &res); err != nil {
			log.Printf("[CotizacionWS] Error deserializando resolucion: %v", err)
			return
		}
		if err := s.aplicarResolucion(&res); err != nil {
			log.Printf("[CotizacionWS] Error aplicando resolucion: %v", err)
			return
		}

		localStatus := res.EstatusAutorizacion
		if isApprovedStatus(res.EstatusAutorizacion) {
			localStatus = "autorizada"
		} else if isRejectedStatus(res.EstatusAutorizacion) {
			localStatus = "rechazada"
		}

		log.Printf("[CotizacionWS] ✅ Resolucion aplicada: pedido %s -> %s", res.PedidoGuid, localStatus)
		// Notificar al frontend del Servidor Local (Wails event)
		if s.ctx != nil {
			runtime.EventsEmit(s.ctx, "cotizacion_resuelta", map[string]any{
				"pedidoGuid": res.PedidoGuid,
				"estatus":    localStatus,
			})
		}
		// Notificar a todas las Cajas conectadas vía WS local (:8989/local/ws)
		if s.broadcastFn != nil {
			s.broadcastFn("cotizacion_resuelta", map[string]any{
				"pedidoGuid": res.PedidoGuid,
				"estatus":    localStatus,
			})
		}
	}
}

// aplicarResolucion actualiza la BD con la respuesta del autorizador.
func (s *CotizacionService) aplicarResolucion(res *dto.ResolucionCotizacionDto) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Parsear fecha
		fechaResolucion := time.Now()
		if res.FechaResolucion != "" {
			if t, err := time.Parse(time.RFC3339, res.FechaResolucion); err == nil {
				fechaResolucion = t
			}
		}

		// 2. Serializar items autorizados
		itemsJSON, _ := json.Marshal(res.Items)

		// Determinar estatus local unificado para la BD
		localStatus := res.EstatusAutorizacion
		if isApprovedStatus(res.EstatusAutorizacion) {
			localStatus = "autorizada"
		} else if isRejectedStatus(res.EstatusAutorizacion) {
			localStatus = "rechazada"
		}

		// 3. Actualizar Pedido
		updates := map[string]any{
			"estatus_autorizacion":   localStatus,
			"descuentos_autorizados": string(itemsJSON),
			"autorizado_por":         res.AutorizadoPor,
			"obs_autorizacion":       res.Observaciones,
			"fecha_resolucion":       fechaResolucion,
		}
		if err := tx.Model(&models.Pedido{}).
			Where("guid = ? AND deleted_at IS NULL", res.PedidoGuid).
			Updates(updates).Error; err != nil {
			return fmt.Errorf("actualizando pedido: %w", err)
		}

		// 4. Si autorizada: actualizar descuento en pedido_detalle
		if isApprovedStatus(res.EstatusAutorizacion) && len(res.Items) > 0 {
			var pedido models.Pedido
			if err := tx.Where("guid = ?", res.PedidoGuid).First(&pedido).Error; err != nil {
				return fmt.Errorf("buscando pedido: %w", err)
			}
			for _, item := range res.Items {
				// Buscar el nivel por guid y actualizar el descuento del detalle
				tx.Exec(`UPDATE pedido_detalle pd
						SET descuento = pd.cantidad * pd.precio_venta * ? / 100
						FROM nivel_empaque ne
						WHERE pd.nivel_id = ne.id
						  AND ne.guid = ?
						  AND pd.pedido_id = ?
						  AND pd.deleted_at IS NULL`,
					item.DescuentoAutorizado, item.NivelGuid, pedido.ID)
			}
		}

		// 5. Marcar como procesada en el cloud (fire & forget)
		go s.marcarProcesada(res.CloudSolicitudGuid)

		return nil
	})
}

// marcarProcesada notifica al cloud que la resolucion fue aplicada localmente.
func (s *CotizacionService) marcarProcesada(cloudSolicitudGuid string) {
	if cloudSolicitudGuid == "" {
		return
	}
	url := fmt.Sprintf("%s/cotizaciones/marcar-procesada/%s", s.apiBaseURL, cloudSolicitudGuid)
	req, err := http.NewRequest(http.MethodPost, url, nil)
	if err != nil {
		return
	}
	if _, err := s.client.Do(req); err != nil {
		log.Printf("[CotizacionWS] Error marcando procesada %s: %v", cloudSolicitudGuid, err)
	}
}

// ─── Metodos de negocio ───────────────────────────────────────────────────────

// SolicitarAutorizacion marca el pedido localmente y envia la solicitud al cloud.
func (s *CotizacionService) SolicitarAutorizacion(
	pedidoGuid string,
	sucursalGuid string,
	tipoAutorizacionGuid string,
	usuarioSolicitanteGuid string,
	comentarios string,
	items []dto.ItemDescuentoDto,
) (*dto.ResponseDto, error) {
	// 1. Serializar items solicitados
	itemsJSON, err := json.Marshal(items)
	if err != nil {
		return dto.NewResponseDto(false, "Error al serializar items", nil, []string{err.Error()}), err
	}

	// 2. Actualizar el pedido localmente con estatus "solicitada"
	if err := s.db.Model(&models.Pedido{}).
		Where("guid = ? AND deleted_at IS NULL", pedidoGuid).
		Updates(map[string]any{
			"estatus_autorizacion":   "solicitada",
			"descuentos_solicitados": string(itemsJSON),
		}).Error; err != nil {
		return dto.NewResponseDto(false, "Error al actualizar pedido", nil, []string{err.Error()}), err
	}

	// 3. Obtener sucursalGuid desde kommerze_config.json (fuente de verdad)
	// El parámetro sucursalGuid se usa como fallback para modo Caja.
	resolvedSucursalGuid := sucursalGuid
	if cfg, err := LoadKommerzConfig(); err == nil && cfg.License != nil && cfg.License.Sucursal.Guid != "" {
		resolvedSucursalGuid = cfg.License.Sucursal.Guid
	}
	log.Printf("[CotizacionService] sucursalGuid resuelto: %q", resolvedSucursalGuid)

	// 4. Construir payload con el nuevo contrato del cloud
	payload := map[string]any{
		"pedidoGuid":             pedidoGuid,
		"sucursalGuid":           resolvedSucursalGuid,
		"tipoAutorizacionGuid":   tipoAutorizacionGuid,
		"usuarioSolicitanteGuid": usuarioSolicitanteGuid,
		"fechaSolicitud":         time.Now().UTC().Format(time.RFC3339Nano),
		"comentarios":            comentarios,
		"items":                  items,
	}
	payloadBytes, _ := json.Marshal(payload)

	cloudURL := fmt.Sprintf("%s/autorizaciones/solicitar", s.apiBaseURL)
	log.Printf("[CotizacionService] ── Enviando solicitud al cloud ──────────────────")
	log.Printf("[CotizacionService] POST %s", cloudURL)
	log.Printf("[CotizacionService] Payload: %s", string(payloadBytes))

	resp, err := s.client.Post(
		cloudURL,
		"application/json",
		bytes.NewBuffer(payloadBytes),
	)
	if err != nil {
		// La solicitud local ya fue marcada; el cloud puede reintentar desde la app
		log.Printf("[CotizacionService] ❌ Error de conexión al cloud: %v", err)
		return dto.NewResponseDto(true, "Solicitud guardada localmente. Error al notificar al cloud.", nil, nil), nil
	}
	defer resp.Body.Close()

	// 4. Leer body completo para log y parseo
	bodyBytes, _ := io.ReadAll(resp.Body)
	log.Printf("[CotizacionService] ── Respuesta del cloud ─────────────────────────")
	log.Printf("[CotizacionService] HTTP Status: %d %s", resp.StatusCode, resp.Status)
	log.Printf("[CotizacionService] Body: %s", string(bodyBytes))

	var cloudResp struct {
		Success bool `json:"success"`
		Data    struct {
			CloudSolicitudGuid string `json:"cloudSolicitudGuid"`
		} `json:"data"`
	}
	if err := json.Unmarshal(bodyBytes, &cloudResp); err != nil {
		log.Printf("[CotizacionService] ⚠️  No se pudo parsear la respuesta JSON: %v", err)
	} else if cloudResp.Success {
		log.Printf("[CotizacionService] ✅ Solicitud creada en cloud. cloudSolicitudGuid: %s", cloudResp.Data.CloudSolicitudGuid)
		s.db.Model(&models.Pedido{}).
			Where("guid = ?", pedidoGuid).
			Update("cloud_solicitud_guid", cloudResp.Data.CloudSolicitudGuid)
	} else {
		log.Printf("[CotizacionService] ❌ El cloud respondió success=false")
	}
	log.Printf("[CotizacionService] ─────────────────────────────────────────────────")

	return dto.NewResponseDto(true, "Solicitud de autorizacion enviada correctamente", nil, nil), nil
}

// ConvertirAVenta convierte una cotizacion (Pendiente o Autorizada) en una Venta.
// Ejecuta en una sola transaccion: actualiza estatus, registra pagos, descuenta stock.
func (s *CotizacionService) ConvertirAVenta(
	pedidoID uint,
	pagos []dto.PagosAplicadosDto,
	sucursalOrigenID *uint,
) (*dto.ResponseDto, error) {
	var pedido models.Pedido

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Cargar pedido con estatus actual
		if err := tx.Preload("Estatus").Preload("Cliente").Preload("TipoPedido").
			First(&pedido, pedidoID).Error; err != nil {
			return fmt.Errorf("pedido no encontrado: %w", err)
		}

		// 2. Validar que es una cotizacion y que puede convertirse
		if pedido.TipoPedidoID == nil || *pedido.TipoPedidoID != 2 {
			return fmt.Errorf("el pedido no es una cotizacion")
		}
		if pedido.EstatusAutorizacion == "solicitada" {
			return fmt.Errorf("la cotizacion tiene una solicitud de autorizacion pendiente")
		}
		if pedido.EstatusAutorizacion == "rechazada" {
			return fmt.Errorf("la cotizacion fue rechazada por el autorizador")
		}

		// 3. Cambiar tipo a Venta (1) y estatus a Completado (2)
		tipoPedidoVenta := uint(1)
		estatusCompletado := uint(2)
		if err := tx.Model(&pedido).Updates(map[string]any{
			"tipo_pedido_id":    tipoPedidoVenta,
			"estatus_id":        estatusCompletado,
			"sucursal_origen_id": sucursalOrigenID,
		}).Error; err != nil {
			return fmt.Errorf("actualizando pedido: %w", err)
		}

		// 4. Registrar pagos
		for _, p := range pagos {
			pago := models.Pago{
				PedidoID: pedido.ID,
				FormaID:  1,
				Monto:    p.Monto.InexactFloat64(),
				Fecha:    time.Now(),
				Saldo:    p.Monto.InexactFloat64(),
				Sync:     false,
			}
			if err := tx.Create(&pago).Error; err != nil {
				return fmt.Errorf("registrando pago: %w", err)
			}
		}

		// 5. Descontar stock en sucursal_producto
		var detalles []models.PedidoDetalle
		if err := tx.Preload("Nivel").Where("pedido_id = ? AND deleted_at IS NULL", pedido.ID).
			Find(&detalles).Error; err != nil {
			return fmt.Errorf("cargando detalles: %w", err)
		}
		for _, d := range detalles {
			var sp models.SucursalProducto
			if err := tx.Where("nivel_id = ?", d.NivelID).First(&sp).Error; err != nil {
				continue // si no hay registro de sucursal_producto, omitir
			}
			sp.Existencia = sp.Existencia.Sub(d.Cantidad)
			if err := tx.Save(&sp).Error; err != nil {
				return fmt.Errorf("actualizando existencia: %w", err)
			}
		}

		return nil
	})

	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()}), err
	}

	// CloudSync en goroutine
	go func() {
		var sucID *uint
		if sucursalOrigenID != nil {
			sucID = sucursalOrigenID
		}
		_ = sucID // disponible para CloudSync si se integra
	}()

	return dto.NewResponseDto(true, "Cotizacion convertida a venta correctamente", pedido, nil), nil
}

// ObtenerDetalleCotizacion retorna el detalle completo de una cotizacion con sus descuentos.
func (s *CotizacionService) ObtenerDetalleCotizacion(pedidoID uint) (*dto.CotizacionDetalleDto, error) {
	var pedido models.Pedido
	if err := s.db.Preload("Estatus").Preload("Cliente").Preload("TipoPedido").
		First(&pedido, pedidoID).Error; err != nil {
		return nil, fmt.Errorf("pedido no encontrado: %w", err)
	}

	var detalles []models.PedidoDetalle
	s.db.Preload("Nivel").Where("pedido_id = ? AND deleted_at IS NULL", pedidoID).Find(&detalles)

	// Construir items
	var items []dto.CotizacionItemDto
	var subtotal, totalDescuento float64
	for _, d := range detalles {
		qty := d.Cantidad.InexactFloat64()
		price := d.PrecioVenta.InexactFloat64()
		disc := d.Descuento.InexactFloat64()
		sub := qty*price - disc
		subtotal += qty * price
		totalDescuento += disc
		items = append(items, dto.CotizacionItemDto{
			NivelGuid:   d.Nivel.Guid.String(),
			NivelCodigo: d.Nivel.Codigo,
			Producto:    "", // se puede enriquecer con join si se necesita
			Cantidad:    qty,
			PrecioVenta: price,
			Descuento:   disc,
			Subtotal:    sub,
		})
	}

	// Deserializar descuentos
	var descuentosSolicitados []dto.ItemDescuentoDto
	var descuentosAutorizados []dto.ItemDescuentoDto
	_ = json.Unmarshal([]byte(pedido.DescuentosSolicitados), &descuentosSolicitados)
	_ = json.Unmarshal([]byte(pedido.DescuentosAutorizados), &descuentosAutorizados)

	razonSocial := "Publico General"
	if pedido.Cliente.RazonSocial != "" {
		razonSocial = pedido.Cliente.RazonSocial
	}

	detalle := &dto.CotizacionDetalleDto{
		ID:                    pedido.ID,
		PedidoGuid:            pedido.Guid.String(),
		Folio:                 pedido.Folio,
		Fecha:                 pedido.Fecha.Format(time.RFC3339),
		RazonSocial:           razonSocial,
		EstatusAutorizacion:   pedido.EstatusAutorizacion,
		DescuentosSolicitados: descuentosSolicitados,
		DescuentosAutorizados: descuentosAutorizados,
		AutorizadoPor:         pedido.AutorizadoPor,
		ObsAutorizacion:       pedido.ObsAutorizacion,
		Items:                 items,
		Subtotal:              subtotal,
		TotalDescuento:        totalDescuento,
		Total:                 subtotal - totalDescuento,
	}

	return detalle, nil
}

// AsegurarImportDecimal es para que el compilador no se queje del import de decimal
var _ = decimal.Zero
