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
	operacion.ValorBrutoVentas = acum.ValorBrutoVentas
	operacion.ValorVentas = acum.ValorVentas
	operacion.ValorCompras = acum.ValorCompras
	operacion.DescuentosAplicados = acum.DescuentosAplicados
	operacion.TransferenciasEntrantes = acum.TransferenciasEntrantes
	operacion.TransferenciasSalientes = acum.TransferenciasSalientes
	operacion.IngresoEfectivo = acum.IngresoEfectivo
	operacion.IngresoTarjetas = acum.IngresoTarjetas
	operacion.IngresoCheques = acum.IngresoCheques
	operacion.IngresoTransferencia = acum.IngresoTransferencia
	operacion.IngresoOtros = acum.IngresoOtros
	operacion.CFDIEfectivo = acum.CFDIEfectivo
	operacion.CFDITarjetas = acum.CFDITarjetas
	operacion.CFDICheques = acum.CFDICheques
	operacion.CFDITransferencia = acum.CFDITransferencia
	operacion.CFDIOtros = acum.CFDIOtros
	operacion.BajasMercancia = acum.BajasMercancia
	operacion.AjusteInventario = acum.AjusteInventario
	operacion.ValorFinalInventario = acum.ValorFinalInventario

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
	ValorBrutoVentas        decimal.Decimal
	ValorVentas             decimal.Decimal
	ValorCompras            decimal.Decimal
	BajasMercancia          decimal.Decimal
	DescuentosAplicados     decimal.Decimal
	TransferenciasEntrantes decimal.Decimal
	TransferenciasSalientes decimal.Decimal
	AjusteInventario        decimal.Decimal
	ValorFinalInventario    decimal.Decimal
	IngresoEfectivo         decimal.Decimal
	IngresoTarjetas         decimal.Decimal
	IngresoCheques          decimal.Decimal
	IngresoTransferencia    decimal.Decimal
	IngresoOtros            decimal.Decimal
	CFDIEfectivo            decimal.Decimal
	CFDITarjetas            decimal.Decimal
	CFDICheques             decimal.Decimal
	CFDITransferencia       decimal.Decimal
	CFDIOtros               decimal.Decimal
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
		VentasBrutas decimal.Decimal
		Ventas       decimal.Decimal
		Compras      decimal.Decimal
		Bajas        decimal.Decimal
		Descuentos   decimal.Decimal
	}
	var venta ventaRow
	o.db.Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN tp.guid::text = ?
				THEN pd.precio_venta * pd.cantidad ELSE 0 END), 0) AS ventas_brutas,
			COALESCE(SUM(CASE WHEN tp.guid::text = ?
				THEN (pd.precio_venta * pd.cantidad) - ((pd.precio_venta * pd.cantidad) * COALESCE(pd.descuento, 0) / 100)
				ELSE 0 END), 0) AS ventas,
			COALESCE(SUM(CASE WHEN tp.guid::text = ?
				THEN pd.precio_venta * pd.cantidad ELSE 0 END), 0) AS compras,
			COALESCE(SUM(CASE WHEN tp.guid::text = ?
				THEN pd.precio_venta * pd.cantidad ELSE 0 END), 0) AS bajas,
			COALESCE(SUM(CASE WHEN tp.guid::text = ?
				THEN (pd.precio_venta * pd.cantidad) * COALESCE(pd.descuento, 0) / 100 ELSE 0 END), 0) AS descuentos
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
	`, models.TipoPedidoVentaGuid, models.TipoPedidoVentaGuid, models.TipoPedidoCompraGuid,
		models.TipoPedidoBajaMercanciaGuid, models.TipoPedidoVentaGuid,
		operacion.SucursalID, operacion.FechaInicio, fechaFin, "Completado").Scan(&venta)

	result.ValorBrutoVentas = venta.VentasBrutas
	result.ValorVentas = venta.Ventas
	result.ValorCompras = venta.Compras
	result.BajasMercancia = venta.Bajas
	result.DescuentosAplicados = venta.Descuentos

	// Las transferencias afectan el valor del inventario únicamente cuando ya
	// fueron aceptadas. Se contabilizan en la jornada en la que ocurrió la
	// recepción, que es el momento en que se aplican ambos movimientos.
	type transferenciaRow struct {
		Entrantes decimal.Decimal
		Salientes decimal.Decimal
	}
	var transferencia transferenciaRow
	o.db.Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN t.sucursal_destino_id = ?
				THEN pd.precio_venta * pd.cantidad ELSE 0 END), 0) AS entrantes,
			COALESCE(SUM(CASE WHEN t.sucursal_origen_id = ?
				THEN pd.precio_venta * pd.cantidad ELSE 0 END), 0) AS salientes
		FROM traspasos t
		INNER JOIN pedidos p ON p.id = t.pedido_id
		INNER JOIN pedido_detalle pd ON pd.pedido_id = p.id
		INNER JOIN estatus e ON e.id = t.estatus_id
		WHERE (t.sucursal_origen_id = ? OR t.sucursal_destino_id = ?)
		  AND COALESCE(t.fecha_recepcion, t.fecha_envio) BETWEEN ? AND ?
		  AND e.guid::text = ?
		  AND t.deleted_at IS NULL
		  AND p.deleted_at IS NULL
		  AND pd.deleted_at IS NULL
		  AND e.deleted_at IS NULL
	`, operacion.SucursalID, operacion.SucursalID,
		operacion.SucursalID, operacion.SucursalID,
		operacion.FechaInicio, fechaFin,
		"86968037-975a-43ce-880c-043003010105").Scan(&transferencia)
	result.TransferenciasEntrantes = transferencia.Entrantes
	result.TransferenciasSalientes = transferencia.Salientes

	// Ajuste = inventario final - bajas -
	//          (inventario inicial + compras - ventas brutas - transferencias de salida)
	// El inventario final corresponde al valor real de las existencias actuales.
	o.db.Model(&models.SucursalProducto{}).
		Select("COALESCE(SUM(precio_venta * existencia), 0)").
		Scan(&result.ValorFinalInventario)
	valorEsperado := operacion.ValorInicialInventario.
		Add(result.ValorCompras).
		Sub(result.ValorBrutoVentas).
		Sub(result.TransferenciasSalientes)
	result.AjusteInventario = result.ValorFinalInventario.
		Sub(result.BajasMercancia).
		Sub(valorEsperado)

	// Pagos agrupados por clave SAT de forma de pago
	type pagoRow struct {
		Clave string
		Total decimal.Decimal
	}
	var pagos []pagoRow
	o.db.Raw(`
		SELECT 
			s.clave,
			COALESCE(SUM(pg.monto), 0) AS total
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
		case "04", "28", "29": // Tarjetas de crédito, débito y monedero
			result.IngresoTarjetas = result.IngresoTarjetas.Add(p.Total)
		case "02": // Cheque nominativo
			result.IngresoCheques = p.Total
		case "03": // Transferencia electrónica
			result.IngresoTransferencia = p.Total
		default: // Otros métodos
			result.IngresoOtros = result.IngresoOtros.Add(p.Total)
		}
	}

	// Valor efectivamente facturado durante la jornada, agrupado por la forma
	// de pago registrada en el CFDI. El DISTINCT evita duplicar una factura si
	// llegara a estar relacionada con más de un pedido.
	var facturado []pagoRow
	o.db.Raw(`
		SELECT forma.clave, COALESCE(SUM(documento.total), 0) AS total
		FROM (
			SELECT DISTINCT f.id, f.forma_pago_id, f.total
			FROM facturas f
			INNER JOIN pedidos p ON p.factura_id = f.id
			WHERE p.sucursal_origen_id = ?
			  AND f.fecha_factura BETWEEN ? AND ?
			  AND LOWER(COALESCE(f.estatus, 'vigente')) = 'vigente'
			  AND f.deleted_at IS NULL
			  AND p.deleted_at IS NULL
		) documento
		INNER JOIN sat_formas_pago forma ON forma.id = documento.forma_pago_id
		WHERE forma.deleted_at IS NULL
		GROUP BY forma.clave
	`, operacion.SucursalID, operacion.FechaInicio, fechaFin).Scan(&facturado)

	for _, f := range facturado {
		switch f.Clave {
		case "01":
			result.CFDIEfectivo = f.Total
		case "04", "28", "29":
			result.CFDITarjetas = result.CFDITarjetas.Add(f.Total)
		case "02":
			result.CFDICheques = f.Total
		case "03":
			result.CFDITransferencia = f.Total
		default:
			result.CFDIOtros = result.CFDIOtros.Add(f.Total)
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

	updates := map[string]any{
		"estatus_id":               &estatusID,
		"usuario_cierre_id":        &usuarioCierre,
		"fecha_fin":                ahora,
		"valor_bruto_ventas":       acum.ValorBrutoVentas,
		"valor_ventas":             acum.ValorVentas,
		"valor_compras":            acum.ValorCompras,
		"descuentos_aplicados":     acum.DescuentosAplicados,
		"transferencias_entrantes": acum.TransferenciasEntrantes,
		"transferencias_salientes": acum.TransferenciasSalientes,
		"bajas_mercancia":          acum.BajasMercancia,
		"ajuste_inventario":        acum.AjusteInventario,
		"valor_final_inventario":   acum.ValorFinalInventario,
		"ingreso_efectivo":         acum.IngresoEfectivo,
		"ingreso_tarjetas":         acum.IngresoTarjetas,
		"ingreso_cheques":          acum.IngresoCheques,
		"ingreso_transferencia":    acum.IngresoTransferencia,
		"ingreso_otros":            acum.IngresoOtros,
		"cfdi_efectivo":            acum.CFDIEfectivo,
		"cfdi_tarjetas":            acum.CFDITarjetas,
		"cfdi_cheques":             acum.CFDICheques,
		"cfdi_transferencia":       acum.CFDITransferencia,
		"cfdi_otros":               acum.CFDIOtros,
		"updated_at":               ahora,
	}

	if err := o.db.Model(&operacion).Updates(updates).Error; err != nil {
		return dto.NewResponseDto(false, "Error al cerrar la jornada: "+err.Error(), nil, []string{err.Error()})
	}

	o.db.Preload("Estatus").Preload("UsuarioApertura").Preload("UsuarioCierre").First(&operacion, operacion.ID)

	return dto.NewResponseDto(true, "Jornada cerrada correctamente", operacion, nil)
}
