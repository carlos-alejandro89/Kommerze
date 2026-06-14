package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	gorm "gorm.io/gorm"
)

type OperacionesCajaRepository struct {
	db *gorm.DB
}

func NewOperacionesCajaRepository(db *gorm.DB) *OperacionesCajaRepository {
	return &OperacionesCajaRepository{db: db}
}

// AbrirCaja inicia el turno de un cajero dentro de una jornada de sucursal.
// Crea un registro OperacionCajero con EstatusID=1 (activo).
func (r *OperacionesCajaRepository) AbrirCaja(datos dto.AbrirCajaDto) *dto.ResponseDto {
	estatusID := uint(1) // activo

	fondo := decimal.NewFromFloat(datos.FondoCajaApertura)
	zero := decimal.NewFromFloat(0)

	operacion := models.OperacionCajero{
		OperacionSucursalID: datos.OperacionSucursalID,
		ResponsableCajaID:   datos.ResponsableCajaID,
		CajaNombre:          datos.CajaNombre,
		EstatusID:           &estatusID,
		FechaInicio:         time.Now(),
		FondoCajaApertura:   fondo,
		FondoCajaCierre:     zero,
		RetirosEfectivo:     zero,
		IngresoEfectivo:     &zero,
		IngresoTarjetas:     &zero,
		IngresoCheques:      &zero,
		IngresoTransferencia: &zero,
		IngresoOtros:        &zero,
	}

	if err := r.db.Create(&operacion).Error; err != nil {
		return dto.NewResponseDto(false, fmt.Sprintf("Error al abrir caja: %s", err.Error()), nil, []string{err.Error()})
	}

	// Cargar relaciones para la respuesta
	r.db.Preload("Estatus").Preload("ResponsableCaja").First(&operacion, operacion.ID)

	return dto.NewResponseDto(true, "Caja abierta correctamente", operacion, nil)
}

// acumuladosCajero contiene los totales calculados desde los pagos del turno del cajero.
type acumuladosCajero struct {
	NumVentas            int
	IngresoEfectivo      decimal.Decimal
	IngresoTarjetas      decimal.Decimal
	IngresoCheques       decimal.Decimal
	IngresoTransferencia decimal.Decimal
	IngresoOtros         decimal.Decimal
}

// CalcularResumenCajero agrega los pagos del turno indicado agrupados por clave SAT.
// Filtra únicamente pedidos con estatus_id=2 (completados) y no eliminados.
func (r *OperacionesCajaRepository) CalcularResumenCajero(operacionCajeroID uint) acumuladosCajero {
	var result acumuladosCajero

	type pagoRow struct {
		Clave  string
		Total  decimal.Decimal
		Conteo int
	}
	var pagos []pagoRow
	r.db.Raw(`
		SELECT
			s.clave,
			COALESCE(SUM(pg.monto), 0) AS total,
			COUNT(pg.id)               AS conteo
		FROM pagos pg
		INNER JOIN pedidos p          ON p.id = pg.pedido_id
		INNER JOIN sat_formas_pago s  ON s.id = pg.forma_id
		WHERE p.operacion_cajero_id = ?
		  AND p.estatus_id = 2
		  AND p.deleted_at IS NULL
		GROUP BY s.clave
	`, operacionCajeroID).Scan(&pagos)

	for _, p := range pagos {
		result.NumVentas += p.Conteo
		switch p.Clave {
		case "01": // Efectivo
			result.IngresoEfectivo = p.Total
		case "04": // Tarjeta de crédito/débito
			result.IngresoTarjetas = p.Total
		case "02": // Cheque nominativo
			result.IngresoCheques = p.Total
		case "03": // Transferencia electrónica
			result.IngresoTransferencia = p.Total
		default: // Otros métodos
			result.IngresoOtros = result.IngresoOtros.Add(p.Total)
		}
	}

	return result
}

// CerrarCaja finaliza el turno del cajero.
// Los campos de ingreso se calculan automáticamente desde la tabla pagos;
// los valores enviados en el DTO para esos campos son ignorados.
func (r *OperacionesCajaRepository) CerrarCaja(datos dto.CerrarCajaDto) *dto.ResponseDto {
	var operacion models.OperacionCajero
	if err := r.db.First(&operacion, datos.OperacionCajeroID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return dto.NewResponseDto(false, "No se encontró la operación de caja", nil, nil)
		}
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	// Calcular ingresos automáticamente desde pagos del turno
	acum := r.CalcularResumenCajero(operacion.ID)

	estatusID := uint(2) // cerrado
	ahora := time.Now()
	fondoCierre := decimal.NewFromFloat(datos.FondoCajaCierre)
	retiros := decimal.NewFromFloat(datos.RetirosEfectivo)

	updates := map[string]any{
		"estatus_id":            &estatusID,
		"fecha_fin":             ahora,
		"fondo_caja_cierre":     fondoCierre,
		"retiros_efectivo":      retiros,
		"ingreso_efectivo":      acum.IngresoEfectivo,
		"ingreso_tarjetas":      acum.IngresoTarjetas,
		"ingreso_cheques":       acum.IngresoCheques,
		"ingreso_transferencia": acum.IngresoTransferencia,
		"ingreso_otros":         acum.IngresoOtros,
		"bloqueada":             datos.Bloqueada,
		"updated_at":            ahora,
	}

	if err := r.db.Model(&operacion).Updates(updates).Error; err != nil {
		return dto.NewResponseDto(false, fmt.Sprintf("Error al cerrar caja: %s", err.Error()), nil, []string{err.Error()})
	}

	// Recargar el registro actualizado
	r.db.Preload("Estatus").Preload("ResponsableCaja").First(&operacion, operacion.ID)

	return dto.NewResponseDto(true, "Caja cerrada correctamente", operacion, nil)
}

// ObtenerOperacionesCajero devuelve todas las cajas (turnos) de una jornada de sucursal.
func (r *OperacionesCajaRepository) ObtenerOperacionesCajero(operacionSucursalID uint) *dto.ResponseDto {
	var operaciones []models.OperacionCajero

	err := r.db.
		Preload("Estatus").
		Preload("ResponsableCaja").
		Where("operacion_sucursal_id = ?", operacionSucursalID).
		Where("deleted_at IS NULL").
		Order("fecha_inicio ASC").
		Find(&operaciones).Error

	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	return dto.NewResponseDto(true, "Turnos de cajero obtenidos", operaciones, nil)
}

// ObtenerOperacionCajeroActiva devuelve el turno activo (estatus_id=1) del cajero indicado.
// Retorna nil en Data si no hay turno abierto.
func (r *OperacionesCajaRepository) ObtenerOperacionCajeroActiva(responsableID uint) *dto.ResponseDto {
	var operacion models.OperacionCajero

	err := r.db.
		Preload("Estatus").
		Preload("ResponsableCaja").
		Preload("Operacion").
		Where("responsable_caja_id = ?", responsableID).
		Where("estatus_id = ?", 1).
		Where("deleted_at IS NULL").
		First(&operacion).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return dto.NewResponseDto(true, "Sin turno activo", nil, nil)
		}
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}


	return dto.NewResponseDto(true, "Turno activo encontrado", operacion, nil)
}

// ObtenerResumenCajero calcula y devuelve el resumen de ingresos del turno
// para mostrarlo en la pantalla de cierre antes de confirmar.
func (r *OperacionesCajaRepository) ObtenerResumenCajero(operacionCajeroID uint) *dto.ResponseDto {
	acum := r.CalcularResumenCajero(operacionCajeroID)
	return dto.NewResponseDto(true, "Resumen calculado", acum, nil)
}
