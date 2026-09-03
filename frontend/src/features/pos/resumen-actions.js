/**
 * resumen-actions.js
 *
 * Acciones del resumen del POS. Las funciones de servicio se reciben como
 * parámetros desde usePosService — no importan directamente desde wailsjs.
 * Esto permite que el patrón dual (Servidor Local / Caja) funcione de forma
 * transparente sin cambios aquí.
 */

/**
 * Consulta las existencias de los productos en el carrito.
 * @param {Function} consultarExistenciasService - posService.consultarExistencias
 * @param {Function} setInvalidItems
 */
export const ConsultarExistencias = async (consultarExistenciasService, setInvalidItems) => {

    try {
        const cartItems = localStorage.getItem('cart')
        const cart = JSON.parse(cartItems)
        const productosGuids = cart.map(item => item.id)

        const productos = await consultarExistenciasService(productosGuids)

        /**
         * shopspring/decimal se serializa a JSON como string (ej: "15.000")
         * o a veces como número según la versión del marshaler.
         * parseDecimal() normaliza ambos casos a number.
         */
        const parseDecimal = (val) => {
            if (val === null || val === undefined) return 0
            return parseFloat(val) || 0
        }

        // Construir validCart enriquecido con existencias reales
        const comparativoExistencias = cart.map(prev => {
            const productoEncontrado = productos.find(p => p.Guid === prev.id)
            if (!productoEncontrado) {
                // Si el backend no devolvió el producto, lo marcamos con existencia 0
                return { ...prev, GuidBase: prev.productoBaseGuid || prev.id, Existencia: 0, CantidadBase: prev.quantity }
            }

            // La existencia propia de un hijo permanece en cero. Para validar la
            // venta se usa por separado la existencia de su concentrador.
            const existencia = parseDecimal(productoEncontrado.Existencia)
            const contenido = parseDecimal(productoEncontrado.Contenido) || 1
            const cantidadBase = prev.fraccionable
                ? prev.quantity * contenido
                : prev.quantity

            return {
                ...prev,
                GuidBase: productoEncontrado.GuidBase ?? (prev.productoBaseGuid || prev.id),
                Existencia: existencia,
                ExistenciaValidacion: prev.fraccionable
                    ? parseDecimal(productoEncontrado.ExistenciaBase)
                    : existencia,
                CantidadBase: cantidadBase,
            }
        })

        localStorage.setItem('validCart', JSON.stringify(comparativoExistencias))

        // Acumular todos los niveles que consumen una misma existencia. Esto
        // incluye varios hijos y la venta directa del propio concentrador.
        const grupos = comparativoExistencias.reduce((resultado, item) => {
            const clave = item.GuidBase || item.id
            const grupo = resultado.get(clave) || {
                cantidad: 0,
                existencia: item.ExistenciaValidacion ?? item.Existencia,
                items: [],
            }
            grupo.cantidad += item.CantidadBase
            grupo.existencia = Math.min(
                grupo.existencia,
                item.ExistenciaValidacion ?? item.Existencia,
            )
            grupo.items.push(item)
            resultado.set(clave, grupo)
            return resultado
        }, new Map())

        const invalidItemsFound = []
        for (const grupo of grupos.values()) {
            if (grupo.existencia < grupo.cantidad) {
                invalidItemsFound.push(...grupo.items.map(item => ({
                    ...item,
                    CantidadSolicitadaGrupo: grupo.cantidad,
                    ExistenciaValidacion: grupo.existencia,
                })))
            }
        }
        const isValid = invalidItemsFound.length === 0

        if (!isValid) {
            setInvalidItems(invalidItemsFound)
        }

        return isValid
    } catch (error) {
        console.error('Error en ConsultarExistencias:', error)
        return false
    }
}

/**
 * Confirma la transacción contra el backend.
 * @param {Function} confirmarTransaccionService - posService.confirmarTransaccion
 * @param {Function} setAlertConfig
 * @param {object|null} store
 * @param {object|null} turnoActivo - turno activo del cajero (de useTurno)
 */
export const confirmarTransaccion = async (confirmarTransaccionService, setAlertConfig, store, turnoActivo = null) => {
    const operationType = JSON.parse(localStorage.getItem('operationType'))
    const pagosAplicados = JSON.parse(localStorage.getItem('pagosAplicados'))
    const sucursalTraspaso = JSON.parse(localStorage.getItem('sucursal'))
    const selectedClient = JSON.parse(localStorage.getItem('selectedClient') || 'null')

    // B7: validCart puede ser null cuando se salta la verificación de stock (cotizaciones).
    // En ese caso, construimos la estructura desde el cart original.
    let cart = JSON.parse(localStorage.getItem('validCart'))
    if (!cart) {
        const rawCart = JSON.parse(localStorage.getItem('cart')) || []
        cart = rawCart.map(item => ({
            ...item,
            GuidBase: item.productoBaseGuid || item.id,
            Existencia: item.quantity, // suficiente para cotización
            CantidadBase: item.quantity,
        }))
    }

    const cajeroID = turnoActivo?.ID ?? turnoActivo?.id ?? null;

    try {
        const result = await confirmarTransaccionService(operationType, pagosAplicados, cart, store?.ID || null, sucursalTraspaso?.ID || null, cajeroID, selectedClient?.Guid || '');

        localStorage.setItem('folio', result.data.Folio)
        localStorage.setItem('pedidoGuid', result.data.Guid)
        return result.success;
    } catch (error) {
        console.error("Error en la transacción:", error);
        setAlertConfig({
            open: true,
            title: 'Error en la transacción',
            description: error,
            type: 'error'
        });
        return false;
    }
}


export const validarPago = async (total, setAlertConfig) => {
    const pagosAplicados = JSON.parse(localStorage.getItem('pagosAplicados'))

    if (!pagosAplicados || pagosAplicados.length === 0) {
        setAlertConfig({
            open: true,
            title: 'No hay pagos',
            description: 'Debe aplicar al menos un método de pago para procesar la transacción.',
            type: 'warning'
        });
        return false
    }
    const totalPagado = pagosAplicados.reduce((suma, item) => {
        return suma + parseFloat(item.Monto || 0)
    }, 0)

    // Adding 0.01 tolerance for floating point JS bugs
    if (totalPagado < total - 0.01) {
        setAlertConfig({
            open: true,
            title: 'Monto Insuficiente',
            description: 'El total pagado no cubre el importe del pedido. Faltan $' + (total - totalPagado).toFixed(2),
            type: 'warning'
        });

        return false
    }
    return true
}
