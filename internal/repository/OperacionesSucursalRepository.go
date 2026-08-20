package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"fmt"
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

	fechaInicio := time.Now()
	if datos.FechaInicio != "" {
		if parsed, err := time.Parse(time.RFC3339, datos.FechaInicio); err == nil {
			fechaInicio = parsed
		}
	}

	var operacion = models.OperacionSucursal{
		UsuarioAperturaID:      &usuario,
		EstatusID:              &estatus,
		SucursalID:             sucursal,
		FechaInicio:            fechaInicio,
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

	// Los acumulados persistidos se consolidan al cerrar la jornada. Mientras la
	// operación está activa se calculan en vivo para que el tablero financiero
	// represente todas las transacciones realizadas hasta este momento.
	acum := o.CalcularAcumuladosDia(operacion)
	operacion.ValorVentas = acum.ValorVentas
	operacion.ValorCompras = acum.ValorCompras
	operacion.DescuentosAplicados = acum.DescuentosAplicados
	operacion.IngresoEfectivo = acum.IngresoEfectivo
	operacion.IngresoTarjetas = acum.IngresoTarjetas
	operacion.IngresoCheques = acum.IngresoCheques
	operacion.IngresoTransferencia = acum.IngresoTransferencia
	operacion.IngresoOtros = acum.IngresoOtros
	operacion.CFDIEfectivo = decimal.NewFromInt(int64(acum.CFDIEfectivo))
	operacion.CFDITarjetas = decimal.NewFromInt(int64(acum.CFDITarjetas))
	operacion.CFDICheques = decimal.NewFromInt(int64(acum.CFDICheques))
	operacion.CFDITransferencia = decimal.NewFromInt(int64(acum.CFDITransferencia))
	operacion.CFDIOtros = decimal.NewFromInt(int64(acum.CFDIOtros))
	operacion.BajasMercancia = acum.BajasMercancia
	operacion.ValorFinalInventario = operacion.ValorInicialInventario.
		Add(acum.ValorCompras).
		Sub(acum.ValorVentas).
		Sub(acum.BajasMercancia).
		Add(operacion.AjusteInventario)

	return dto.NewResponseDto(true, "Jornada activa encontrada", operacion, nil)
}

// ObtenerResumenVentasOperacion devuelve las ventas reales de la operación más
// reciente, agrupadas por hora desde su apertura hasta su cierre (o hasta ahora).
func (o *OperacionesSucursalRepository) ObtenerResumenVentasOperacion(sucursalID uint) *dto.ResponseDto {
	var operacion models.OperacionSucursal
	if err := o.db.
		Where("sucursal_id = ? AND deleted_at IS NULL", sucursalID).
		Order("fecha_inicio DESC").
		First(&operacion).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return dto.NewResponseDto(true, "Sin operaciones registradas", nil, nil)
		}
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	fechaFin := time.Now()
	if operacion.FechaFin != nil {
		fechaFin = *operacion.FechaFin
	}

	type resumenRow struct {
		Total  float64
		Ventas int64
	}
	var resumen resumenRow
	if err := o.db.Raw(`
		SELECT COALESCE(SUM(
			(pd.precio_venta * pd.cantidad) -
			((pd.precio_venta * pd.cantidad) * COALESCE(pd.descuento, 0) / 100)
		), 0) AS total,
		       COUNT(DISTINCT p.id) AS ventas
		FROM pedido_detalle pd
		INNER JOIN pedidos p ON p.id = pd.pedido_id
		INNER JOIN tipos_pedido tp ON tp.id = p.tipo_pedido_id
		INNER JOIN estatus e ON e.id = p.estatus_id
		WHERE p.sucursal_origen_id = ?
		  AND p.fecha BETWEEN ? AND ?
		  AND tp.guid::text = ?
		  AND LOWER(e.nombre) = LOWER(?)
		  AND p.deleted_at IS NULL
		  AND pd.deleted_at IS NULL
		  AND tp.deleted_at IS NULL
		  AND e.deleted_at IS NULL
	`, sucursalID, operacion.FechaInicio, fechaFin,
		models.TipoPedidoVentaGuid, "Completado").Scan(&resumen).Error; err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	var horas []dto.VentaHoraDto
	if err := o.db.Raw(`
		SELECT date_trunc('hour', p.fecha) AS hora,
		       COALESCE(SUM(
			   (pd.precio_venta * pd.cantidad) -
			   ((pd.precio_venta * pd.cantidad) * COALESCE(pd.descuento, 0) / 100)
		   ), 0) AS total
		FROM pedido_detalle pd
		INNER JOIN pedidos p ON p.id = pd.pedido_id
		INNER JOIN tipos_pedido tp ON tp.id = p.tipo_pedido_id
		INNER JOIN estatus e ON e.id = p.estatus_id
		WHERE p.sucursal_origen_id = ?
		  AND p.fecha BETWEEN ? AND ?
		  AND tp.guid::text = ?
		  AND LOWER(e.nombre) = LOWER(?)
		  AND p.deleted_at IS NULL
		  AND pd.deleted_at IS NULL
		  AND tp.deleted_at IS NULL
		  AND e.deleted_at IS NULL
		GROUP BY date_trunc('hour', p.fecha)
		ORDER BY hora
	`, sucursalID, operacion.FechaInicio, fechaFin,
		models.TipoPedidoVentaGuid, "Completado").Scan(&horas).Error; err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	// Completar horas sin ventas para mantener una línea temporal continua.
	porHora := make([]dto.VentaHoraDto, 0)
	porHoraMap := make(map[int64]float64, len(horas))
	for _, hora := range horas {
		porHoraMap[hora.Hora.Truncate(time.Hour).Unix()] = hora.Total
	}
	inicioHora := operacion.FechaInicio.Truncate(time.Hour)
	finHora := fechaFin.Truncate(time.Hour)
	for hora := inicioHora; !hora.After(finHora); hora = hora.Add(time.Hour) {
		porHora = append(porHora, dto.VentaHoraDto{Hora: hora, Total: porHoraMap[hora.Unix()]})
	}

	var actividades []dto.ActividadOperacionDto
	if err := o.db.Raw(`
		SELECT
			CASE
				WHEN tp.guid::text = ? THEN 'venta'
				WHEN tp.guid::text = ? THEN 'cotizacion'
				WHEN tp.guid::text = ? THEN 'transferencia'
				WHEN tp.guid::text = ? THEN 'compra'
				WHEN tp.guid::text = ? THEN 'baja'
				ELSE 'pedido'
			END AS tipo,
			p.folio,
			p.fecha,
			COALESCE(SUM(pd.precio_venta * pd.cantidad), 0)::double precision AS valor,
			COALESCE(sd.nombre_sucursal, tp.nombre, '') AS detalle
		FROM pedidos p
		LEFT JOIN tipos_pedido tp ON tp.id = p.tipo_pedido_id
		LEFT JOIN pedido_detalle pd ON pd.pedido_id = p.id AND pd.deleted_at IS NULL
		LEFT JOIN traspasos t ON t.pedido_id = p.id AND t.deleted_at IS NULL
		LEFT JOIN sucursales sd ON sd.id = t.sucursal_destino_id AND sd.deleted_at IS NULL
		WHERE p.sucursal_origen_id = ?
		  AND p.fecha BETWEEN ? AND ?
		  AND p.deleted_at IS NULL
		GROUP BY p.id, p.tipo_pedido_id, tp.guid, tp.nombre, t.id, sd.nombre_sucursal
		ORDER BY p.fecha DESC
		LIMIT 5
	`, models.TipoPedidoVentaGuid, models.TipoPedidoCotizacionGuid,
		models.TipoPedidoTraspasoGuid, models.TipoPedidoCompraGuid,
		models.TipoPedidoBajaMercanciaGuid,
		sucursalID, operacion.FechaInicio, fechaFin).Scan(&actividades).Error; err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	return dto.NewResponseDto(true, "Resumen de ventas de la operación", dto.ResumenVentasOperacionDto{
		OperacionID: operacion.ID,
		FechaInicio: operacion.FechaInicio,
		FechaFin:    operacion.FechaFin,
		Total:       resumen.Total,
		Ventas:      resumen.Ventas,
		PorHora:     porHora,
		Actividades: actividades,
	}, nil)
}

// acumuladosDia contiene los totales calculados desde pedidos/pagos del período.
type acumuladosDia struct {
	ValorVentas          decimal.Decimal
	ValorCompras         decimal.Decimal
	BajasMercancia       decimal.Decimal
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

	// Totales por tipo de transacción. Los IDs locales de tipo y estatus no son
	// estables porque ambos catálogos se sincronizan desde Cloud.
	type ventaRow struct {
		Ventas     decimal.Decimal
		Compras    decimal.Decimal
		Bajas      decimal.Decimal
		Descuentos decimal.Decimal
	}
	var venta ventaRow
	o.db.Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN tp.guid::text = ?
				THEN (pd.precio_venta * pd.cantidad) - ((pd.precio_venta * pd.cantidad) * pd.descuento / 100)
				ELSE 0 END), 0) AS ventas,
			COALESCE(SUM(CASE WHEN tp.guid::text = ?
				THEN pd.precio_venta * pd.cantidad ELSE 0 END), 0) AS compras,
			COALESCE(SUM(CASE WHEN tp.guid::text = ?
				THEN pd.precio_venta * pd.cantidad ELSE 0 END), 0) AS bajas,
			COALESCE(SUM(CASE WHEN tp.guid::text = ?
				THEN (pd.precio_venta * pd.cantidad) * pd.descuento / 100 ELSE 0 END), 0) AS descuentos
		FROM pedido_detalle pd
		INNER JOIN pedidos p ON p.id = pd.pedido_id
		INNER JOIN tipos_pedido tp ON tp.id = p.tipo_pedido_id
		INNER JOIN estatus e ON e.id = p.estatus_id
		WHERE p.sucursal_origen_id = ?
		  AND p.fecha BETWEEN ? AND ?
		  AND LOWER(e.nombre) = LOWER(?)
		  AND p.deleted_at IS NULL
		  AND pd.deleted_at IS NULL
		  AND tp.deleted_at IS NULL
		  AND e.deleted_at IS NULL
	`, models.TipoPedidoVentaGuid, models.TipoPedidoCompraGuid,
		models.TipoPedidoBajaMercanciaGuid, models.TipoPedidoVentaGuid,
		operacion.SucursalID, operacion.FechaInicio, fechaFin, "Completado").Scan(&venta)

	result.ValorVentas = venta.Ventas
	result.ValorCompras = venta.Compras
	result.BajasMercancia = venta.Bajas
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
		INNER JOIN tipos_pedido tp    ON tp.id = p.tipo_pedido_id
		INNER JOIN estatus e          ON e.id = p.estatus_id
		WHERE p.sucursal_origen_id = ?
		  AND pg.fecha BETWEEN ? AND ?
		  AND tp.guid::text = ?
		  AND LOWER(e.nombre) = LOWER(?)
		  AND p.deleted_at IS NULL
		GROUP BY s.clave
	`, operacion.SucursalID, operacion.FechaInicio, fechaFin,
		models.TipoPedidoVentaGuid, "Completado").Scan(&pagos)

	for _, p := range pagos {
		switch p.Clave {
		case "01": // Efectivo
			result.IngresoEfectivo = p.Total
			result.CFDIEfectivo = p.Conteo
		case "04", "28", "29": // Tarjetas de crédito, débito y monedero
			result.IngresoTarjetas = result.IngresoTarjetas.Add(p.Total)
			result.CFDITarjetas += p.Conteo
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

	// Una jornada no puede cerrarse mientras existan turnos de caja activos.
	// Esta validacion vive en backend para que aplique aunque la operacion sea
	// invocada desde una Caja o por otro cliente distinto a la interfaz actual.
	var cajasAbiertas int64
	if err := o.db.Model(&models.OperacionCajero{}).
		Where("operacion_sucursal_id = ? AND estatus_id = ? AND fecha_fin IS NULL", operacion.ID, 1).
		Count(&cajasAbiertas).Error; err != nil {
		return dto.NewResponseDto(false, "No se pudo validar el estado de las cajas", nil, []string{err.Error()})
	}
	if cajasAbiertas > 0 {
		mensaje := fmt.Sprintf("No se puede cerrar la jornada: hay %d caja(s) con turno activo", cajasAbiertas)
		return dto.NewResponseDto(false, mensaje, map[string]any{"cajasAbiertas": cajasAbiertas}, nil)
	}

	// Calcular acumulados automáticamente
	acum := o.CalcularAcumuladosDia(operacion)

	ahora := time.Now()
	estatusID := uint(2) // cerrado
	usuarioCierre := datos.UsuarioCierreID

	// Valor final = inicial + compras - ventas + ajustes
	valorFinal := operacion.ValorInicialInventario.
		Add(acum.ValorCompras).
		Sub(acum.ValorVentas).
		Sub(acum.BajasMercancia).
		Add(operacion.AjusteInventario)

	updates := map[string]any{
		"estatus_id":             &estatusID,
		"usuario_cierre_id":      &usuarioCierre,
		"fecha_fin":              ahora,
		"valor_ventas":           acum.ValorVentas,
		"valor_compras":          acum.ValorCompras,
		"descuentos_aplicados":   acum.DescuentosAplicados,
		"bajas_mercancia":        acum.BajasMercancia,
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
