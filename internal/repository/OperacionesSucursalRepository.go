package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"time"

	"github.com/shopspring/decimal"

	gorm "gorm.io/gorm"
)

type OperacionesSucursalRepository struct {
	db *gorm.DB
}

func NewOperacionesSucursalRepository(db *gorm.DB) *OperacionesSucursalRepository {
	return &OperacionesSucursalRepository{db: db}
}

func (o *OperacionesSucursalRepository) ObtenerOperacionSucursal(licencia string) *dto.ResponseDto {
	var sucursal models.Sucursal

	err := o.db.Where("licencia = ?", licencia).First(&sucursal).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return dto.NewResponseDto(false, "No se encontró una sucursal con esa licencia", nil, nil)
		}
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	type data struct {
		Empresa     models.Empresa             `json:"empresa"`
		Sucursal    models.Sucursal            `json:"sucursal"`
		Operaciones []models.OperacionSucursal `json:"operaciones"`
	}

	var empresa models.Empresa
	err = o.db.Where("id = ?", sucursal.EmpresaID).First(&empresa).Error
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	var response data
	response.Sucursal = sucursal
	response.Empresa = empresa

	var operaciones []models.OperacionSucursal
	err = o.db.Where("sucursal_id = ?", sucursal.ID).Where("estatus_id = ?", 1).Find(&operaciones).Error
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), response, []string{err.Error()})
	}

	response.Operaciones = operaciones
	return dto.NewResponseDto(true, "Operaciones obtenidas correctamente", response, nil)
}

func (o *OperacionesSucursalRepository) ObtenerValorInventario() *dto.ResponseDto {
	var inventario models.SucursalProducto
	var valorInventario float64

	err := o.db.Model(&inventario).Select("COALESCE(SUM(precio_venta*existencia), 0) as ValorInventario").Scan(&valorInventario).Error
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	return dto.NewResponseDto(true, "Inventario obtenido correctamente", valorInventario, nil)
}

func (o *OperacionesSucursalRepository) SucursalInicioOperacion(datos dto.SucursalInicioOperacionesDto) *dto.ResponseDto {

	var estatus = uint(1)
	var usuario = uint(datos.Usuario)
	var sucursal = uint(datos.Sucursal)

	var operacion = models.OperacionSucursal{
		UsuarioAperturaID:      &usuario,
		EstatusID:              &estatus,
		SucursalID:             sucursal,
		FechaInicio:            time.Now(),
		ValorInicialInventario: decimal.NewFromFloat(datos.ValorInventarioInicial),
	}

	o.db.Create(&operacion)

	return dto.NewResponseDto(true, "Operación iniciada correctamente", operacion, nil)
}

// ObtenerOperacionSucursalActiva devuelve la jornada activa (estatus_id=1) de la sucursal.
func (o *OperacionesSucursalRepository) ObtenerOperacionSucursalActiva(sucursalID uint) *dto.ResponseDto {
	var operacion models.OperacionSucursal

	err := o.db.
		Preload("Estatus").
		Preload("UsuarioApertura").
		Where("sucursal_id = ?", sucursalID).
		Where("estatus_id = ?", 1).
		Where("deleted_at IS NULL").
		First(&operacion).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return dto.NewResponseDto(true, "Sin jornada activa", nil, nil)
		}
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	return dto.NewResponseDto(true, "Jornada activa encontrada", operacion, nil)
}

// acumuladosDia contiene los totales calculados desde pedidos/pagos del período.
type acumuladosDia struct {
	ValorVentas          decimal.Decimal
	DescuentosAplicados  decimal.Decimal
	IngresoEfectivo      decimal.Decimal
	IngresoTarjetas      decimal.Decimal
	IngresoCheques       decimal.Decimal
	IngresoTransferencia decimal.Decimal
	IngresoOtros         decimal.Decimal
	CFDIEfectivo         int
	CFDITarjetas         int
	CFDICheques          int
	CFDITransferencia    int
	CFDIOtros            int
}

// CalcularAcumuladosDia agrega ventas y pagos del período de la operación.
// Los resultados se guardan desnormalizados para no recalcular en cada consulta.
func (o *OperacionesSucursalRepository) CalcularAcumuladosDia(operacion models.OperacionSucursal) acumuladosDia {
	var result acumuladosDia

	fechaFin := time.Now()
	if operacion.FechaFin != nil {
		fechaFin = *operacion.FechaFin
	}

	// Totales de venta desde detalle de pedidos
	type ventaRow struct {
		Total      decimal.Decimal
		Descuentos decimal.Decimal
	}
	var venta ventaRow
	o.db.Raw(`
		SELECT 
			COALESCE(SUM(pd.precio_venta * pd.cantidad), 0) AS total,
			COALESCE(SUM(pd.descuento * pd.cantidad), 0)    AS descuentos
		FROM pedido_detalles pd
		INNER JOIN pedidos p ON p.id = pd.pedido_id
		WHERE p.sucursal_origen_id = ?
		  AND p.fecha BETWEEN ? AND ?
		  AND p.estatus_id = 2
		  AND p.deleted_at IS NULL
	`, operacion.SucursalID, operacion.FechaInicio, fechaFin).Scan(&venta)

	result.ValorVentas = venta.Total
	result.DescuentosAplicados = venta.Descuentos

	// Pagos agrupados por clave SAT de forma de pago
	type pagoRow struct {
		Clave  string
		Total  decimal.Decimal
		Conteo int
	}
	var pagos []pagoRow
	o.db.Raw(`
		SELECT 
			s.clave,
			COALESCE(SUM(pg.monto), 0) AS total,
			COUNT(pg.id)               AS conteo
		FROM pagos pg
		INNER JOIN pedidos p          ON p.id = pg.pedido_id
		INNER JOIN sat_formas_pago s  ON s.id = pg.forma_id
		WHERE p.sucursal_origen_id = ?
		  AND pg.fecha BETWEEN ? AND ?
		  AND p.estatus_id = 2
		  AND p.deleted_at IS NULL
		GROUP BY s.clave
	`, operacion.SucursalID, operacion.FechaInicio, fechaFin).Scan(&pagos)

	for _, p := range pagos {
		switch p.Clave {
		case "01": // Efectivo
			result.IngresoEfectivo = p.Total
			result.CFDIEfectivo = p.Conteo
		case "04": // Tarjeta de crédito/débito
			result.IngresoTarjetas = p.Total
			result.CFDITarjetas = p.Conteo
		case "02": // Cheque nominativo
			result.IngresoCheques = p.Total
			result.CFDICheques = p.Conteo
		case "03": // Transferencia electrónica
			result.IngresoTransferencia = p.Total
			result.CFDITransferencia = p.Conteo
		default: // Otros métodos
			result.IngresoOtros = result.IngresoOtros.Add(p.Total)
			result.CFDIOtros += p.Conteo
		}
	}

	return result
}

// CerrarOperacionSucursal calcula los acumulados del día automáticamente,
// los persiste desnormalizados y marca la jornada como cerrada (estatus_id=2).
func (o *OperacionesSucursalRepository) CerrarOperacionSucursal(datos dto.CerrarOperacionSucursalDto) *dto.ResponseDto {
	var operacion models.OperacionSucursal
	if err := o.db.First(&operacion, datos.OperacionID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return dto.NewResponseDto(false, "No se encontró la operación de sucursal", nil, nil)
		}
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	// Calcular acumulados automáticamente
	acum := o.CalcularAcumuladosDia(operacion)

	ahora := time.Now()
	estatusID := uint(2) // cerrado
	usuarioCierre := datos.UsuarioCierreID

	// Valor final = inicial + compras - ventas + ajustes
	valorFinal := operacion.ValorInicialInventario.
		Add(operacion.ValorCompras).
		Sub(acum.ValorVentas).
		Add(operacion.AjusteInventario)

	updates := map[string]any{
		"estatus_id":             &estatusID,
		"usuario_cierre_id":      &usuarioCierre,
		"fecha_fin":              ahora,
		"valor_ventas":           acum.ValorVentas,
		"descuentos_aplicados":   acum.DescuentosAplicados,
		"valor_final_inventario": valorFinal,
		"ingreso_efectivo":       acum.IngresoEfectivo,
		"ingreso_tarjetas":       acum.IngresoTarjetas,
		"ingreso_cheques":        acum.IngresoCheques,
		"ingreso_transferencia":  acum.IngresoTransferencia,
		"ingreso_otros":          acum.IngresoOtros,
		"cfdi_efectivo":          acum.CFDIEfectivo,
		"cfdi_tarjetas":          acum.CFDITarjetas,
		"cfdi_cheques":           acum.CFDICheques,
		"cfdi_transferencia":     acum.CFDITransferencia,
		"cfdi_otros":             acum.CFDIOtros,
		"updated_at":             ahora,
	}

	if err := o.db.Model(&operacion).Updates(updates).Error; err != nil {
		return dto.NewResponseDto(false, "Error al cerrar la jornada: "+err.Error(), nil, []string{err.Error()})
	}

	o.db.Preload("Estatus").Preload("UsuarioApertura").Preload("UsuarioCierre").First(&operacion, operacion.ID)

	return dto.NewResponseDto(true, "Jornada cerrada correctamente", operacion, nil)
}
