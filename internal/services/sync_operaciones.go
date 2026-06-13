package services

import (
	"BitComercio/internal/models"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"gorm.io/gorm"
)

// syncCloudResponse es la respuesta estándar de KommerzeApiCloud.
type syncCloudResponse struct {
	Success  bool   `json:"success"`
	Mensaje  string `json:"mensaje"`
	HttpCode int    `json:"httpCode"`
}

// SyncOperacionesPendientes empuja al cloud todas las OperacionSucursal y OperacionCajero
// cuyo campo synced_at IS NULL (nunca sincronizadas o que fallaron en el intento anterior).
// Se llama periódicamente desde una goroutine en NewServices.
func (s *SyncService) SyncOperacionesPendientes() error {
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
		"fechaInicio":            op.FechaInicio.Format(time.RFC3339),
		"valorInicialInventario": op.ValorInicialInventario,
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
			"operacionGuid":        op.Guid.String(),
			"usuarioCierreGuid":    usuarioCierreGuid,
			"estatusGuid":          estatusGuid,
			"fechaInicio":          op.FechaInicio.Format(time.RFC3339),
			"fechaFin":             op.FechaFin.Format(time.RFC3339),
			"valorInicialInventario": op.ValorInicialInventario,
			"valorCompras":         op.ValorCompras,
			"valorVentas":          op.ValorVentas,
			"descuentosAplicados":  op.DescuentosAplicados,
			"ajusteInventario":     op.AjusteInventario,
			"valorFinalInventario": op.ValorFinalInventario,
			"ingresoEfectivo":      op.IngresoEfectivo,
			"ingresoTarjetas":      op.IngresoTarjetas,
			"ingresoCheques":       op.IngresoCheques,
			"ingresoTransferencia": op.IngresoTransferencia,
			"ingresoOtros":         op.IngresoOtros,
			"creditos":             op.Creditos,
			"valesSalida":          op.ValesSalida,
			"valesEntrantes":       op.ValesEntrantes,
			"cfdiEfectivo":         op.CFDIEfectivo,
			"cfdiTarjetas":         op.CFDITarjetas,
			"cfdiCheques":          op.CFDICheques,
			"cfdiTransferencia":    op.CFDITransferencia,
			"cfdiOtros":            op.CFDIOtros,
			"bajasMercancia":       op.BajasMercancia,
		}

		if err := s.cloudPut("sucursales/operaciones/finalizar", finalizarPayload); err != nil {
			return fmt.Errorf("finalizar operacion sucursal: %w", err)
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
		"fechaInicio":           op.FechaInicio.Format(time.RFC3339),
		"fondoCajaApertura":     op.FondoCajaApertura,
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
			"fechaFin":             op.FechaFin.Format(time.RFC3339),
			"fondoCajaCierre":      op.FondoCajaCierre,
			"retirosEfectivo":      op.RetirosEfectivo,
			"ingresoEfectivo":      op.IngresoEfectivo,
			"ingresoTarjetas":      op.IngresoTarjetas,
			"ingresoCheques":       op.IngresoCheques,
			"ingresoTransferencia": op.IngresoTransferencia,
			"ingresoOtros":         op.IngresoOtros,
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

func (s *SyncService) cloudRequest(method, endpoint string, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/%s", s.apiBaseURL, endpoint)
	req, err := http.NewRequest(method, url, bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("error HTTP %s %s: %w", method, url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var cloudResp syncCloudResponse
		_ = json.NewDecoder(resp.Body).Decode(&cloudResp)
		return fmt.Errorf("cloud respondió %d: %s", resp.StatusCode, cloudResp.Mensaje)
	}

	return nil
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
