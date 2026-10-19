package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/shopspring/decimal"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const estatusCotizacionAplicadaGuid = "c7e4a912-5f8b-4a71-93de-1f6b2c8d9e30"

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
	syncPedido  func(pedidoID uint)
	wsConnected atomic.Bool
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

// SetPedidoSync inyecta la sincronización Cloud para reportar la venta que
// resulta de convertir una cotización, después de confirmar la transacción local.
func (s *CotizacionService) SetPedidoSync(fn func(pedidoID uint)) {
	s.syncPedido = fn
}

// WebSocketConnected informa el estado real de la sesión con Kommerze Cloud.
func (s *CotizacionService) WebSocketConnected() bool {
	return s.wsConnected.Load()
}

func (s *CotizacionService) setWebSocketConnected(connected bool) {
	if previous := s.wsConnected.Swap(connected); previous == connected {
		return
	}
	if s.ctx != nil {
		runtime.EventsEmit(s.ctx, "websocket:status", map[string]any{"connected": connected, "channel": "cloud"})
	}
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
		s.setWebSocketConnected(false)
		return fmt.Errorf("dial WS: %w", err)
	}
	s.setWebSocketConnected(true)
	defer func() {
		s.setWebSocketConnected(false)
		_ = conn.Close()
	}()
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
	case "transferencia_recibida":
		var transferencia dto.TransferenciaRecibidaDto
		if err := json.Unmarshal(msg.Data, &transferencia); err != nil {
			log.Printf("[CotizacionWS] Error deserializando transferencia: %v", err)
			return
		}
		if err := s.guardarTransferenciaEntrante(&transferencia); err != nil {
			log.Printf("[CotizacionWS] Error guardando transferencia entrante %s: %v", transferencia.PedidoGuid, err)
			return
		}
		log.Printf("[CotizacionWS] ✅ Transferencia recibida: pedido %s", transferencia.PedidoGuid)
		if s.ctx != nil {
			runtime.EventsEmit(s.ctx, "transferencia_recibida", transferencia)
		}
		if s.broadcastFn != nil {
			s.broadcastFn("transferencia_recibida", transferencia)
		}
	case "transferencia_actualizada":
		var estado dto.TransferenciaEstadoEventDto
		if err := json.Unmarshal(msg.Data, &estado); err != nil {
			log.Printf("[CotizacionWS] Estado de transferencia inválido: %v", err)
			return
		}
		cfg, err := LoadKommerzConfig()
		if err != nil || cfg.License == nil || cfg.License.Sucursal.Guid == "" {
			log.Printf("[CotizacionWS] No se pudo resolver la sucursal local")
			return
		}
		if err := s.aplicarEstadoTransferencia(estado.PedidoGuid, estado.EstatusGuid, cfg.License.Sucursal.Guid); err != nil {
			log.Printf("[CotizacionWS] No se pudo aplicar estado de transferencia: %v", err)
			return
		}
		if s.ctx != nil {
			runtime.EventsEmit(s.ctx, "transferencia_actualizada", estado)
		}
		if s.broadcastFn != nil {
			s.broadcastFn("transferencia_actualizada", estado)
		}
	}
}

func (s *CotizacionService) aplicarEstadoTransferencia(pedidoGuid, estatusGuid, sucursalGuid string) error {
	repo := repository.NewPosRepository(s.db, s.ctx, s.apiBaseURL, s.client)
	return repo.AplicarEstadoTransferencia(pedidoGuid, estatusGuid, sucursalGuid)
}

func (s *CotizacionService) guardarTransferenciaEntrante(evento *dto.TransferenciaRecibidaDto) error {
	pedidoGuid, err := uuid.Parse(evento.PedidoGuid)
	if err != nil {
		return fmt.Errorf("GUID de pedido inválido: %w", err)
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		var existente int64
		if err := tx.Model(&models.Pedido{}).Where("guid = ?", pedidoGuid).Count(&existente).Error; err != nil {
			return err
		}
		if existente > 0 {
			return nil
		}

		var origen, destino models.Sucursal
		if err := tx.Where("guid = ?", evento.SucursalOrigenGuid).First(&origen).Error; err != nil {
			return fmt.Errorf("sucursal origen no encontrada: %w", err)
		}
		if err := tx.Where("guid = ?", evento.SucursalDestinoGuid).First(&destino).Error; err != nil {
			return fmt.Errorf("sucursal destino no encontrada: %w", err)
		}
		var estatus models.Estatus
		if err := tx.Where("guid = ?", evento.EstatusGuid).First(&estatus).Error; err != nil {
			return fmt.Errorf("estatus no encontrado: %w", err)
		}
		var tipo models.TipoPedido
		if err := tx.Where("guid = ?", evento.TipoPedidoGuid).First(&tipo).Error; err != nil {
			return fmt.Errorf("tipo de pedido no encontrado: %w", err)
		}
		var cliente models.Cliente
		if err := tx.Where("guid = ?", evento.ClienteGuid).First(&cliente).Error; err != nil {
			return fmt.Errorf("cliente no encontrado: %w", err)
		}

		pedido := models.Pedido{
			BaseModel:        models.BaseModel{Guid: pedidoGuid},
			EstatusID:        &estatus.ID,
			ClienteID:        &cliente.ID,
			TipoPedidoID:     &tipo.ID,
			SucursalOrigenID: &origen.ID,
			Folio:            evento.Folio,
			Fecha:            evento.Fecha,
			EsCredito:        evento.EsCredito,
			Sync:             true,
		}
		if err := tx.Create(&pedido).Error; err != nil {
			return fmt.Errorf("guardando pedido: %w", err)
		}
		for _, item := range evento.PedidoDetalle {
			var nivel models.NivelEmpaque
			if err := tx.Where("guid = ?", item.NivelGuid).First(&nivel).Error; err != nil {
				return fmt.Errorf("nivel de empaque %s no encontrado: %w", item.NivelGuid, err)
			}
			precioVenta := decimal.NewFromFloat(item.PrecioVenta)
			detalle := models.PedidoDetalle{
				PedidoID: pedido.ID, NivelID: nivel.ID,
				Cantidad: decimal.NewFromFloat(item.Cantidad), PrecioCompra: decimal.NewFromFloat(item.PrecioCompra),
				PrecioBase: models.CalcularPrecioBase(precioVenta, origen.ComisionVentas), PrecioVenta: precioVenta,
				Descuento: decimal.NewFromFloat(item.Descuento), PorcentajeDescuento: decimal.NewFromFloat(item.PorcentajeDescuento),
				TrasladoIVA: decimal.NewFromFloat(item.TrasladoIVA), TasaIVA: decimal.NewFromFloat(item.TasaIVA),
				RetencionISR: decimal.NewFromFloat(item.RetencionISR), TasaISR: decimal.NewFromFloat(item.TasaISR),
				InfoAdicional: item.InfoAdicional,
			}
			if err := tx.Create(&detalle).Error; err != nil {
				return fmt.Errorf("guardando detalle: %w", err)
			}
		}
		traspaso := models.Traspaso{
			PedidoID: pedido.ID, SucursalOrigenID: origen.ID, SucursalDestinoID: destino.ID,
			EstatusID: estatus.ID, FechaEnvio: evento.FechaEnvio, Sync: true,
		}
		if err := tx.Create(&traspaso).Error; err != nil {
			return fmt.Errorf("guardando traspaso: %w", err)
		}
		return nil
	})
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
				if err := tx.Exec(`UPDATE pedido_detalle pd
						SET porcentaje_descuento = ?,
							descuento = (pd.cantidad * pd.precio_venta) * ? / 100
						FROM nivel_empaque ne
						WHERE pd.nivel_id = ne.id
						  AND ne.guid = ?
						  AND pd.pedido_id = ?
						  AND pd.deleted_at IS NULL`,
					item.DescuentoAutorizado, item.DescuentoAutorizado, item.NivelGuid, pedido.ID).Error; err != nil {
					return fmt.Errorf("actualizando descuento autorizado: %w", err)
				}
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

// ConvertirAVenta crea una venta nueva a partir de una cotizacion (Pendiente o
// Autorizada). La cotizacion original y su detalle permanecen intactos.
func (s *CotizacionService) ConvertirAVenta(
	pedidoID uint,
	pagos []dto.PagosAplicadosDto,
	sucursalOrigenID *uint,
	clienteGuid string,
) (*dto.ResponseDto, error) {
	var venta models.Pedido
	var cotizacionAplicadaID uint

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var cotizacion models.Pedido
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Estatus").Preload("Cliente").Preload("TipoPedido").
			First(&cotizacion, pedidoID).Error; err != nil {
			return fmt.Errorf("pedido no encontrado: %w", err)
		}

		if cotizacion.TipoPedidoID == nil || cotizacion.TipoPedido.Guid.String() != models.TipoPedidoCotizacionGuid {
			return fmt.Errorf("el pedido no es una cotizacion")
		}
		if cotizacion.Estatus.Guid.String() == estatusCotizacionAplicadaGuid {
			return fmt.Errorf("la cotizacion ya fue aplicada a una venta y no puede utilizarse nuevamente")
		}
		if cotizacion.EstatusAutorizacion == "solicitada" {
			return fmt.Errorf("la cotizacion tiene una solicitud de autorizacion pendiente")
		}
		if cotizacion.EstatusAutorizacion == "rechazada" {
			return fmt.Errorf("la cotizacion fue rechazada por el autorizador")
		}

		var tipoVenta models.TipoPedido
		if err := tx.Where("guid = ?", models.TipoPedidoVentaGuid).First(&tipoVenta).Error; err != nil {
			return fmt.Errorf("tipo de pedido Venta no encontrado: %w", err)
		}
		var estatusVenta models.Estatus
		if err := tx.Where("LOWER(nombre) = LOWER(?)", "Completado").First(&estatusVenta).Error; err != nil {
			return fmt.Errorf("estatus Completado no encontrado: %w", err)
		}
		var estatusCotizacionAplicada models.Estatus
		if err := tx.Where("guid = ?", estatusCotizacionAplicadaGuid).First(&estatusCotizacionAplicada).Error; err != nil {
			return fmt.Errorf("estatus Aplicada no encontrado: %w", err)
		}
		var folio int
		if err := tx.Raw("SELECT nextval(?)", "consecutivo_folio_pedido").Scan(&folio).Error; err != nil {
			return fmt.Errorf("obteniendo folio de la venta: %w", err)
		}
		tipoPedidoVenta := tipoVenta.ID
		estatusCompletado := estatusVenta.ID
		sucursalVentaID := cotizacion.SucursalOrigenID
		if sucursalOrigenID != nil {
			sucursalVentaID = sucursalOrigenID
		}
		clienteVentaID := cotizacion.ClienteID
		if strings.TrimSpace(clienteGuid) != "" {
			var cliente models.Cliente
			if err := tx.Where("guid = ?", strings.TrimSpace(clienteGuid)).First(&cliente).Error; err != nil {
				return fmt.Errorf("cliente seleccionado no encontrado: %w", err)
			}
			clienteVentaID = &cliente.ID
		}
		venta = models.Pedido{
			EstatusID:         &estatusCompletado,
			ClienteID:         clienteVentaID,
			OperacionCajeroID: cotizacion.OperacionCajeroID,
			TipoPedidoID:      &tipoPedidoVenta,
			Folio:             folio,
			Fecha:             time.Now(),
			EsCredito:         false,
			Sync:              false,
			Comentarios:       cotizacion.Comentarios,
			SucursalOrigenID:  sucursalVentaID,
		}
		if err := venta.AsignarCodigoFacturacion(tx); err != nil {
			return err
		}
		if err := tx.Create(&venta).Error; err != nil {
			return fmt.Errorf("creando venta desde cotizacion: %w", err)
		}

		var detalles []models.PedidoDetalle
		if err := tx.Preload("Nivel").Where("pedido_id = ? AND deleted_at IS NULL", cotizacion.ID).
			Find(&detalles).Error; err != nil {
			return fmt.Errorf("cargando detalles: %w", err)
		}
		descuentosAutorizados := make(map[string]decimal.Decimal)
		if cotizacion.EstatusAutorizacion == "autorizada" {
			var itemsAutorizados []dto.ItemDescuentoDto
			_ = json.Unmarshal([]byte(cotizacion.DescuentosAutorizados), &itemsAutorizados)
			for _, item := range itemsAutorizados {
				descuentosAutorizados[item.NivelGuid] = decimal.NewFromFloat(item.DescuentoAutorizado)
			}
		}
		totalPedido := decimal.Zero
		for _, detalleCotizacion := range detalles {
			descuentoPorcentaje := detalleCotizacion.PorcentajeDescuento
			if autorizado, ok := descuentosAutorizados[detalleCotizacion.Nivel.Guid.String()]; ok {
				descuentoPorcentaje = autorizado
			}
			bruto := detalleCotizacion.PrecioVenta.Mul(detalleCotizacion.Cantidad)
			descuentoImporte := bruto.Mul(descuentoPorcentaje).Div(decimal.NewFromInt(100))
			detalleVenta := models.PedidoDetalle{
				PedidoID:            venta.ID,
				NivelID:             detalleCotizacion.NivelID,
				Cantidad:            detalleCotizacion.Cantidad,
				PrecioCompra:        detalleCotizacion.PrecioCompra,
				PrecioBase:          detalleCotizacion.PrecioBase,
				PrecioVenta:         detalleCotizacion.PrecioVenta,
				Descuento:           descuentoImporte,
				PorcentajeDescuento: descuentoPorcentaje,
				TrasladoIVA:         detalleCotizacion.TrasladoIVA,
				TasaIVA:             detalleCotizacion.TasaIVA,
				RetencionISR:        detalleCotizacion.RetencionISR,
				TasaISR:             detalleCotizacion.TasaISR,
				InfoAdicional:       detalleCotizacion.InfoAdicional,
			}
			if err := tx.Create(&detalleVenta).Error; err != nil {
				return fmt.Errorf("copiando detalle de cotizacion: %w", err)
			}
			totalPedido = totalPedido.Add(bruto.Sub(descuentoImporte))
		}
		totalPedido = totalPedido.Round(2)
		aplicado := decimal.Zero

		// 5. Registrar pagos. Solo efectivo (clave SAT 01) puede generar cambio.
		type pagoConForma struct {
			pago  dto.PagosAplicadosDto
			forma models.SATFormaPago
		}
		pagosOrdenados := make([]pagoConForma, 0, len(pagos))
		for _, p := range pagos {
			var forma models.SATFormaPago
			if err := tx.Where("id = ? AND deleted_at IS NULL", p.ID).First(&forma).Error; err != nil {
				return fmt.Errorf("forma de pago inválida: %w", err)
			}
			pagosOrdenados = append(pagosOrdenados, pagoConForma{pago: p, forma: forma})
		}
		sort.SliceStable(pagosOrdenados, func(i, j int) bool {
			return strings.TrimSpace(pagosOrdenados[i].forma.Clave) != "01" && strings.TrimSpace(pagosOrdenados[j].forma.Clave) == "01"
		})
		for _, entrada := range pagosOrdenados {
			p := entrada.pago
			forma := entrada.forma
			recibido := p.MontoRecibido
			if !recibido.GreaterThan(decimal.Zero) {
				recibido = p.Monto
			}
			recibido = recibido.Round(2)
			if !recibido.GreaterThan(decimal.Zero) {
				return fmt.Errorf("el monto recibido debe ser mayor que cero")
			}
			saldoPendiente := totalPedido.Sub(aplicado).Round(2)
			if !saldoPendiente.GreaterThan(decimal.Zero) {
				return fmt.Errorf("la venta ya está cubierta; no se pueden registrar más pagos")
			}
			montoAplicado := recibido
			cambio := decimal.Zero
			if strings.TrimSpace(forma.Clave) == "01" {
				if recibido.GreaterThan(saldoPendiente) {
					montoAplicado = saldoPendiente
					cambio = recibido.Sub(saldoPendiente).Round(2)
				}
			} else if recibido.GreaterThan(saldoPendiente) {
				return fmt.Errorf("%s no puede superar el saldo pendiente de $%s", forma.Descripcion, saldoPendiente.StringFixed(2))
			}
			pago := models.Pago{
				PedidoID:      venta.ID,
				FormaID:       uint(p.ID),
				Monto:         montoAplicado.InexactFloat64(),
				MontoRecibido: recibido.InexactFloat64(),
				Cambio:        cambio.InexactFloat64(),
				Fecha:         time.Now(),
				Saldo:         montoAplicado.InexactFloat64(),
				Sync:          false,
			}
			if err := tx.Create(&pago).Error; err != nil {
				return fmt.Errorf("registrando pago: %w", err)
			}
			aplicado = aplicado.Add(montoAplicado)
		}
		if !aplicado.Round(2).Equal(totalPedido) {
			return fmt.Errorf("los pagos aplicados ($%s) no cubren el total de la venta ($%s)", aplicado.StringFixed(2), totalPedido.StringFixed(2))
		}

		// Aplicar exactamente la misma validación y consumo de inventario de una
		// venta normal. El repositorio bloquea las existencias involucradas,
		// resuelve empaques/concentradores y valida todo antes de descontar; si un
		// artículo no existe o no alcanza, la transacción completa se revierte.
		productosVenta := make([]dto.PedidoProductoDto, 0, len(detalles))
		for _, d := range detalles {
			productosVenta = append(productosVenta, dto.PedidoProductoDto{
				ID:       d.Nivel.Guid.String(),
				Quantity: d.Cantidad,
			})
		}
		posRepository := repository.NewPosRepository(tx, nil, "", nil)
		if err := posRepository.ActualizarExistencias(productosVenta, tx); err != nil {
			return fmt.Errorf("no fue posible convertir la cotizacion por inventario insuficiente: %w", err)
		}

		if err := tx.Model(&models.Pedido{}).
			Where("id = ?", cotizacion.ID).
			Update("estatus_id", estatusCotizacionAplicada.ID).Error; err != nil {
			return fmt.Errorf("marcando cotizacion como aplicada: %w", err)
		}
		cotizacionAplicadaID = cotizacion.ID

		return nil
	})

	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()}), err
	}

	if s.syncPedido != nil {
		go s.syncPedido(venta.ID)
		go s.syncPedido(cotizacionAplicadaID)
	}

	return dto.NewResponseDto(true, "Venta creada desde la cotizacion correctamente", venta, nil), nil
}

// ObtenerDetalleCotizacion retorna el detalle completo de una cotizacion con sus descuentos.
func (s *CotizacionService) ObtenerDetalleCotizacion(pedidoID uint) (*dto.CotizacionDetalleDto, error) {
	var pedido models.Pedido
	if err := s.db.Preload("Estatus").Preload("Cliente").Preload("TipoPedido").
		First(&pedido, pedidoID).Error; err != nil {
		return nil, fmt.Errorf("pedido no encontrado: %w", err)
	}

	var detalles []models.PedidoDetalle
	s.db.Preload("Nivel").
		Preload("Nivel.Producto").
		Preload("Nivel.Empaque").
		Where("pedido_id = ? AND deleted_at IS NULL", pedidoID).
		Find(&detalles)

	// El JSON conserva el porcentaje autorizado original y permite interpretar
	// correctamente cotizaciones creadas antes de corregir su persistencia.
	var descuentosSolicitados []dto.ItemDescuentoDto
	var descuentosAutorizados []dto.ItemDescuentoDto
	_ = json.Unmarshal([]byte(pedido.DescuentosSolicitados), &descuentosSolicitados)
	_ = json.Unmarshal([]byte(pedido.DescuentosAutorizados), &descuentosAutorizados)
	porcentajeAutorizadoPorNivel := make(map[string]float64, len(descuentosAutorizados))
	for _, item := range descuentosAutorizados {
		porcentajeAutorizadoPorNivel[item.NivelGuid] = item.DescuentoAutorizado
	}

	// Construir items
	var items []dto.CotizacionItemDto
	var subtotal, totalDescuento float64
	for _, d := range detalles {
		qty := d.Cantidad.InexactFloat64()
		price := d.PrecioVenta.InexactFloat64()
		discountPercent := d.PorcentajeDescuento.InexactFloat64()
		if pedido.EstatusAutorizacion == "autorizada" {
			if autorizado, ok := porcentajeAutorizadoPorNivel[d.Nivel.Guid.String()]; ok {
				discountPercent = autorizado
			}
		}
		discountAmount := d.PrecioVenta.Mul(d.Cantidad).Mul(decimal.NewFromFloat(discountPercent)).Div(decimal.NewFromInt(100)).InexactFloat64()
		sub := qty*price - discountAmount
		subtotal += qty * price
		totalDescuento += discountAmount
		items = append(items, dto.CotizacionItemDto{
			NivelGuid:           d.Nivel.Guid.String(),
			NivelCodigo:         d.Nivel.Codigo,
			Producto:            d.Nivel.Producto.Descripcion,
			ImgReferencia:       d.Nivel.ImgReferencia,
			UnidadMedida:        d.Nivel.Empaque.NombreEmpaque,
			Cantidad:            qty,
			PrecioVenta:         price,
			Descuento:           discountAmount,
			PorcentajeDescuento: discountPercent,
			Subtotal:            sub,
		})
	}

	razonSocial := "Publico General"
	if pedido.Cliente.RazonSocial != "" {
		razonSocial = pedido.Cliente.RazonSocial
	}
	clienteResumen := dto.ClienteDto{
		Guid:        pedido.Cliente.Guid.String(),
		RazonSocial: razonSocial,
		Correo:      pedido.Cliente.Correo,
		Telefono:    pedido.Cliente.Telefono,
	}
	if pedido.ClienteID != nil {
		_ = s.db.Raw(`
			SELECT c.guid, c.razon_social, COALESCE(f.rfc, '') AS rfc, c.correo, c.telefono
			FROM clientes c
			LEFT JOIN LATERAL (
				SELECT ef.rfc FROM cliente_entidad_fiscal cef
				JOIN entidades_fiscales ef ON ef.id = cef.entidad_fiscal_id AND ef.deleted_at IS NULL
				WHERE cef.cliente_id = c.id AND cef.deleted_at IS NULL ORDER BY cef.id LIMIT 1
			) f ON TRUE
			WHERE c.id = ? AND c.deleted_at IS NULL`, *pedido.ClienteID).
			Scan(&clienteResumen).Error
	}

	detalle := &dto.CotizacionDetalleDto{
		ID:                    pedido.ID,
		PedidoGuid:            pedido.Guid.String(),
		Folio:                 pedido.Folio,
		Fecha:                 pedido.Fecha.Format(time.RFC3339),
		ClienteGuid:           clienteResumen.Guid,
		RazonSocial:           clienteResumen.RazonSocial,
		ClienteRFC:            clienteResumen.RFC,
		ClienteCorreo:         clienteResumen.Correo,
		ClienteTelefono:       clienteResumen.Telefono,
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
