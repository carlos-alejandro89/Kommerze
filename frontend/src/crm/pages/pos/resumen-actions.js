import {
    ServiceConsultarExistenciaProductos,
    ServiceConfirmarTransaccion
} from '../../../../wailsjs/go/main/App';

export const ConsultarExistencias = async (setInvalidItems) => {

    try {
        const cartItems = localStorage.getItem('cart')
        const cart = JSON.parse(cartItems)
        const productosGuids = cart.map(item => item.id)

        const productos = await ServiceConsultarExistenciaProductos(productosGuids)

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

            const existencia = prev.fraccionable
                ? parseDecimal(productoEncontrado.ExistenciaFraccion)
                : parseDecimal(productoEncontrado.Existencia)

            const contenido = parseDecimal(productoEncontrado.Contenido) || 1
            const cantidadBase = prev.fraccionable
                ? prev.quantity * contenido
                : prev.quantity

            return {
                ...prev,
                GuidBase: productoEncontrado.GuidBase ?? (prev.productoBaseGuid || prev.id),
                Existencia: existencia,
                CantidadBase: cantidadBase,
            }
        })

        localStorage.setItem('validCart', JSON.stringify(comparativoExistencias))

        // Validar item por item (iterar sobre el carrito, no sobre el backend)
        const invalidItemsFound = []

        const isValid = comparativoExistencias.every(item => {
            if (item.Existencia < item.quantity) {
                invalidItemsFound.push(item)
                return false
            }
            return true
        })

        if (!isValid) {
            setInvalidItems(invalidItemsFound)
        }

        return isValid
    } catch (error) {
        console.error('Error en ConsultarExistencias:', error)
        return false
    }
}

export const confirmarTransaccion = async (setAlertConfig, store) => {
    const operationType = JSON.parse(localStorage.getItem('operationType'))
    const pagosAplicados = JSON.parse(localStorage.getItem('pagosAplicados'))
    const sucursalTraspaso = JSON.parse(localStorage.getItem('sucursal'))

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

    try {
        const result = await ServiceConfirmarTransaccion(operationType, pagosAplicados, cart, store?.ID || null, sucursalTraspaso?.ID || null);

        localStorage.setItem('folio', result.data.Folio)
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
