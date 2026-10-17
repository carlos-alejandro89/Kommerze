package services

import (
	"BitComercio/internal/models"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// syncCloudResponse es la respuesta estándar de KommerzeApiCloud.
type syncCloudResponse struct {
	Success  bool   `json:"success"`
	Mensaje  string `json:"mensaje"`
	HttpCode int    `json:"httpCode"`
}

// respaldoInventarioPayload representa el inventario local en el contrato que
// espera KommerzeCloudAPI al cerrar una operacion de sucursal.
type respaldoInventarioPayload struct {
	NivelGuid           string  `json:"nivelGuid"`
	PrecioCompra        float64 `json:"precioCompra"`
	PrecioVenta         float64 `json:"precioVenta"`
	PorcentajeDescuento float64 `json:"porcentajeDescuento"`
	Existencia          float64 `json:"existencia"`
}

func cloudDecimal(value decimal.Decimal) float64 { return value.InexactFloat64() }

func cloudDecimalPointer(value *decimal.Decimal) float64 {
	if value == nil {
		return 0
	}
	return value.InexactFloat64()
}

// SyncOperacionesPendientes empuja al cloud todas las OperacionSucursal y OperacionCajero
// cuyo campo synced_at IS NULL (nunca sincronizadas o que fallaron en el intento anterior).
// Se llama periódicamente desde una goroutine en NewServices.
func (s *SyncService) SyncOperacionesPendientes() error {
	s.operationsMu.Lock()
	defer s.operationsMu.Unlock()
	log.Println("[SyncOp] Iniciando sincronización de operaciones pendientes...")

	// ── 1. Operaciones de sucursal pendientes ──────────────────────────────
	var opsSucursal []models.OperacionSucursal
	if err := s.db.Where("synced_at IS NULL").Find(&opsSucursal).Error; err != nil {
		return fmt.Errorf("[SyncOp] error consultando OperacionSucursal: %w", err)
	}

	for _, op := range opsSucursal {
		if err := s.syncOperacionSucursal(op); err != nil {
			log.Printf("[SyncOp] ⚠️  OperacionSucursal ID=%d: %v", op.ID, err)
			// Continuar con las demás — no abortar por una falla individual
		}
	}

	// ── 2. Turnos de cajero pendientes ─────────────────────────────────────
	var opsCajero []models.OperacionCajero
	if err := s.db.Where("synced_at IS NULL").Find(&opsCajero).Error; err != nil {
		return fmt.Errorf("[SyncOp] error consultando OperacionCajero: %w", err)
	}

	for _, op := range opsCajero {
		if err := s.syncOperacionCajero(op); err != nil {
			log.Printf("[SyncOp] ⚠️  OperacionCajero ID=%d: %v", op.ID, err)
		}
	}

	log.Printf("[SyncOp] ✅ Ciclo completado — sucursales: %d, cajeros: %d",
		len(opsSucursal), len(opsCajero))
	return nil
}

// syncOperacionSucursal sincroniza una jornada con el cloud.
// Si la jornada está abierta (FechaFin nil) → POST iniciar.
// Si está cerrada → POST iniciar + PUT finalizar (para garantizar consistencia).
func (s *SyncService) syncOperacionSucursal(op models.OperacionSucursal) error {
	// Necesitamos el Guid de la sucursal — cargamos el registro
	var suc models.Sucursal
	if err := s.db.First(&suc, op.SucursalID).Error; err != nil {
		return fmt.Errorf("sucursal %d no encontrada: %w", op.SucursalID, err)
	}

	var usuarioGuid string
	if op.UsuarioAperturaID != nil {
		var usu models.Usuario
		if err := s.db.First(&usu, *op.UsuarioAperturaID).Error; err == nil {
			usuarioGuid = usu.Guid.String()
		}
	}

	// ── POST iniciar ───────────────────────────────────────────────────────
	iniciarPayload := map[string]any{
		"sucursalGuid":           suc.Guid.String(),
		"usuarioAperturaGuid":    usuarioGuid,
		"fechaInicio":            op.FechaInicio.UTC().Format(time.RFC3339),
		"valorInicialInventario": cloudDecimal(op.ValorInicialInventario),
		"guid":                   op.Guid.String(),
	}

	if err := s.cloudPost("sucursales/operaciones/iniciar", iniciarPayload); err != nil {
		return fmt.Errorf("iniciar operacion sucursal: %w", err)
	}

	// ── PUT finalizar (solo si la jornada está cerrada) ────────────────────
	if op.FechaFin != nil {
		var estatusGuid string
		if op.EstatusID != nil {
			var est models.Estatus
			if err := s.db.First(&est, *op.EstatusID).Error; err == nil {
				estatusGuid = est.Guid.String()
			}
		}
		var usuarioCierreGuid string
		if op.UsuarioCierreID != nil {
			var usu models.Usuario
			if err := s.db.First(&usu, *op.UsuarioCierreID).Error; err == nil {
				usuarioCierreGuid = usu.Guid.String()
			}
		}

		finalizarPayload := map[string]any{
			"operacionGuid":          op.Guid.String(),
			"usuarioCierreGuid":      usuarioCierreGuid,
			"estatusGuid":            estatusGuid,
			"fechaInicio":            op.FechaInicio.UTC().Format(time.RFC3339),
			"fechaFin":               op.FechaFin.UTC().Format(time.RFC3339),
			"valorInicialInventario": cloudDecimal(op.ValorInicialInventario),
			"valorCompras":           cloudDecimal(op.ValorCompras),
			"valorVentas":            cloudDecimal(op.ValorVentas),
			"descuentosAplicados":    cloudDecimal(op.DescuentosAplicados),
			"ajusteInventario":       cloudDecimal(op.AjusteInventario),
			"valorFinalInventario":   cloudDecimal(op.ValorFinalInventario),
			"ingresoEfectivo":        cloudDecimal(op.IngresoEfectivo),
			"ingresoTarjetas":        cloudDecimal(op.IngresoTarjetas),
			"ingresoCheques":         cloudDecimal(op.IngresoCheques),
			"ingresoTransferencia":   cloudDecimal(op.IngresoTransferencia),
			"ingresoOtros":           cloudDecimal(op.IngresoOtros),
			"creditos":               cloudDecimal(op.Creditos),
			"valesSalida":            cloudDecimal(op.ValesSalida),
			"valesEntrantes":         cloudDecimal(op.ValesEntrantes),
			"cfdiEfectivo":           cloudDecimal(op.CFDIEfectivo),
			"cfdiTarjetas":           cloudDecimal(op.CFDITarjetas),
			"cfdiCheques":            cloudDecimal(op.CFDICheques),
			"cfdiTransferencia":      cloudDecimal(op.CFDITransferencia),
			"cfdiOtros":              cloudDecimal(op.CFDIOtros),
			"bajasMercancia":         cloudDecimal(op.BajasMercancia),
		}

		if err := s.cloudPut("sucursales/operaciones/finalizar", finalizarPayload); err != nil {
			return fmt.Errorf("finalizar operacion sucursal: %w", err)
		}

		// El respaldo pertenece al cierre de la sucursal, no al cierre de una
		// caja. Se ejecuta despues de confirmar el cierre en Cloud y antes de
		// marcar la operacion como sincronizada para conservar el reintento.
		if err := s.respaldarInventarioSucursal(suc.Guid.String()); err != nil {
			return fmt.Errorf("respaldar inventario de sucursal: %w", err)
		}
	}

	// Marcar como sincronizado
	return s.marcarSyncOperacionSucursal(op.ID)
}

// syncOperacionCajero sincroniza un turno de cajero con el cloud.
func (s *SyncService) syncOperacionCajero(op models.OperacionCajero) error {
	// Cargar la operación sucursal para obtener su Guid
	var opSuc models.OperacionSucursal
	if err := s.db.First(&opSuc, op.OperacionSucursalID).Error; err != nil {
		return fmt.Errorf("operacion sucursal %d no encontrada: %w", op.OperacionSucursalID, err)
	}

	var responsableGuid string
	var resp models.Usuario
	if err := s.db.First(&resp, op.ResponsableCajaID).Error; err == nil {
		responsableGuid = resp.Guid.String()
	}

	// ── POST iniciar turno cajero ──────────────────────────────────────────
	iniciarPayload := map[string]any{
		"operacionSucursalGuid": opSuc.Guid.String(),
		"responsableCajaGuid":   responsableGuid,
		"caja":                  op.CajaNombre,
		"fechaInicio":           op.FechaInicio.UTC().Format(time.RFC3339),
		"fondoCajaApertura":     cloudDecimal(op.FondoCajaApertura),
		"guidOperacionCajero":   op.Guid.String(),
	}

	if err := s.cloudPost("sucursales/cajeros/turno/iniciar", iniciarPayload); err != nil {
		return fmt.Errorf("iniciar turno cajero: %w", err)
	}

	// ── PUT finalizar turno cajero (solo si está cerrado) ──────────────────
	if op.FechaFin != nil {
		var estatusGuid string
		if op.EstatusID != nil {
			var est models.Estatus
			if err := s.db.First(&est, *op.EstatusID).Error; err == nil {
				estatusGuid = est.Guid.String()
			}
		}

		finalizarPayload := map[string]any{
			"operacionCajaGuid":    op.Guid.String(),
			"estatusGuid":          estatusGuid,
			"fechaFin":             op.FechaFin.UTC().Format(time.RFC3339),
			"fondoCajaCierre":      cloudDecimal(op.FondoCajaCierre),
			"retirosEfectivo":      cloudDecimal(op.RetirosEfectivo),
			"ingresoEfectivo":      cloudDecimalPointer(op.IngresoEfectivo),
			"ingresoTarjetas":      cloudDecimalPointer(op.IngresoTarjetas),
			"ingresoCheques":       cloudDecimalPointer(op.IngresoCheques),
			"ingresoTransferencia": cloudDecimalPointer(op.IngresoTransferencia),
			"ingresoOtros":         cloudDecimalPointer(op.IngresoOtros),
			"bloqueada":            op.Bloqueada,
		}

		if err := s.cloudPut("sucursales/cajeros/turno/finalizar", finalizarPayload); err != nil {
			return fmt.Errorf("finalizar turno cajero: %w", err)
		}
	}

	return s.marcarSyncOperacionCajero(op.ID)
}

// ── Helpers internos ───────────────────────────────────────────────────────────

// cloudPost realiza un POST autenticado a KommerzeApiCloud.
func (s *SyncService) cloudPost(endpoint string, payload any) error {
	return s.cloudRequest(http.MethodPost, endpoint, payload)
}

// cloudPut realiza un PUT autenticado a KommerzeApiCloud.
func (s *SyncService) cloudPut(endpoint string, payload any) error {
	return s.cloudRequest(http.MethodPut, endpoint, payload)
}

func (s *SyncService) respaldarInventarioSucursal(sucursalGuid string) error {
	var inventario []models.SucursalProducto
	if err := s.db.Preload("Nivel").Find(&inventario).Error; err != nil {
		return fmt.Errorf("no se pudo consultar el inventario local: %w", err)
	}
	if len(inventario) == 0 {
		return fmt.Errorf("el inventario local no contiene articulos para respaldar")
	}

	payload := make([]respaldoInventarioPayload, 0, len(inventario))
	for _, item := range inventario {
		if item.Nivel.Guid.String() == "00000000-0000-0000-0000-000000000000" {
			return fmt.Errorf("el nivel de empaque %d no tiene un identificador valido", item.NivelID)
		}
		payload = append(payload, respaldoInventarioPayload{
			NivelGuid:           item.Nivel.Guid.String(),
			PrecioCompra:        cloudDecimal(item.PrecioCompra),
			PrecioVenta:         cloudDecimal(item.PrecioVenta),
			PorcentajeDescuento: cloudDecimal(item.Descuento),
			Existencia:          cloudDecimal(item.Existencia),
		})
	}

	endpoint := fmt.Sprintf("sucursales/inventario/backup/%s", sucursalGuid)
	return s.cloudPost(endpoint, payload)
}

func (s *SyncService) cloudRequest(method, endpoint string, payload any) error {
	url := fmt.Sprintf("%s/%s", strings.TrimRight(s.apiBaseURL, "/"), strings.TrimLeft(endpoint, "/"))
	body, err := json.Marshal(payload)
	if err != nil {
		s.logCloudSyncFailure(method, url, []byte(fmt.Sprintf("%+v", payload)), 0, nil, err)
		return err
	}

	req, err := http.NewRequest(method, url, bytes.NewBuffer(body))
	if err != nil {
		s.logCloudSyncFailure(method, url, body, 0, nil, err)
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		s.logCloudSyncFailure(method, url, body, 0, nil, err)
		return fmt.Errorf("error HTTP %s %s: %w", method, url, err)
	}
	defer resp.Body.Close()
	responseBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		s.logCloudSyncFailure(method, url, body, resp.StatusCode, responseBody, readErr)
		return fmt.Errorf("no se pudo leer la respuesta cloud: %w", readErr)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var cloudResp syncCloudResponse
		_ = json.Unmarshal(responseBody, &cloudResp)
		// Los endpoints de inicio representan un upsert por Guid. Algunas
		// versiones anteriores del Cloud respondian 409 cuando el registro ya
		// existia; para el sincronizador ese estado ya satisface el alta y debe
		// permitir continuar con el cierre pendiente.
		if resp.StatusCode == http.StatusConflict &&
			strings.Contains(strings.ToLower(cloudResp.Mensaje), "registrada previamente") {
			return nil
		}
		s.logCloudSyncFailure(method, url, body, resp.StatusCode, responseBody, nil)
		return fmt.Errorf("cloud respondió %d: %s", resp.StatusCode, cloudResp.Mensaje)
	}
	if len(responseBody) > 0 {
		var raw map[string]json.RawMessage
		if json.Unmarshal(responseBody, &raw) == nil {
			if successRaw, exists := raw["success"]; exists {
				var success bool
				if json.Unmarshal(successRaw, &success) == nil && !success {
					var cloudResp syncCloudResponse
					_ = json.Unmarshal(responseBody, &cloudResp)
					s.logCloudSyncFailure(method, url, body, resp.StatusCode, responseBody, nil)
					return fmt.Errorf("cloud rechazó la operación: %s", cloudResp.Mensaje)
				}
			}
		}
	}

	return nil
}

func (s *SyncService) logCloudSyncFailure(method, url string, payload []byte, statusCode int, response []byte, requestErr error) {
	status := "sin respuesta HTTP"
	if statusCode > 0 {
		status = fmt.Sprintf("%d %s", statusCode, http.StatusText(statusCode))
	}
	responseText := strings.TrimSpace(string(response))
	if responseText == "" {
		responseText = "<sin cuerpo de respuesta>"
	}
	errorText := "<sin error de transporte>"
	if requestErr != nil {
		errorText = requestErr.Error()
	}

	entry := fmt.Sprintf(
		"[%s] [SyncCloudError]\nMetodo: %s\nURL: %s\nPayload: %s\nEstado: %s\nRespuesta: %s\nError: %s\n---\n",
		time.Now().Format(time.RFC3339), method, url, string(payload), status, responseText, errorText,
	)
	log.Print(entry)

	configDir, err := os.UserConfigDir()
	if err != nil {
		log.Printf("[SyncCloudError] no se pudo localizar la carpeta de logs: %v", err)
		return
	}
	logsDir := filepath.Join(configDir, "Kommerze", "logs")
	if err := os.MkdirAll(logsDir, 0o755); err != nil {
		log.Printf("[SyncCloudError] no se pudo crear la carpeta de logs: %v", err)
		return
	}
	logPath := filepath.Join(logsDir, "sync-operaciones.log")
	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		log.Printf("[SyncCloudError] no se pudo abrir %s: %v", logPath, err)
		return
	}
	defer file.Close()
	if _, err := file.WriteString(entry); err != nil {
		log.Printf("[SyncCloudError] no se pudo escribir %s: %v", logPath, err)
	}
}

func (s *SyncService) marcarSyncOperacionSucursal(id uint) error {
	ahora := time.Now()
	return s.db.Model(&models.OperacionSucursal{}).
		Where("id = ?", id).
		Update("synced_at", ahora).Error
}

func (s *SyncService) marcarSyncOperacionCajero(id uint) error {
	ahora := time.Now()
	return s.db.Model(&models.OperacionCajero{}).
		Where("id = ?", id).
		Update("synced_at", ahora).Error
}

// StartSyncOperacionesTicker arranca la goroutine que sincroniza operaciones
// cada 5 minutos en modo Servidor Local.
func StartSyncOperacionesTicker(db *gorm.DB, syncSvc *SyncService) {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		// Sincronización inicial al arrancar
		if err := syncSvc.SyncOperacionesPendientes(); err != nil {
			log.Printf("[SyncOp] Error en sync inicial: %v", err)
		}
		for range ticker.C {
			if err := syncSvc.SyncOperacionesPendientes(); err != nil {
				log.Printf("[SyncOp] Error en sync periódico: %v", err)
			}
		}
	}()
}
