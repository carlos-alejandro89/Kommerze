import {
    ServiceConsultarExistenciaProductos,
    ServiceConfirmarTransaccion
} from '../../../../wailsjs/go/main/App';

export const ConsultarExistencias = async (setInvalidItems) => {

    try {
        const cartItems = localStorage.getItem('cart')
        const cart = JSON.parse(cartItems)
        let comparativoExistencias = JSON.parse(cartItems)
        const productosGuids = cart.map(item => item.id)

        const productos = await ServiceConsultarExistenciaProductos(productosGuids)

        comparativoExistencias = comparativoExistencias.map(prev => {
            const productoEncontrado = productos.find(producto => producto.Guid === prev.id)
            return {
                ...prev,

                GuidBase: productoEncontrado.GuidBase,
                Existencia: prev.fraccionable ? productoEncontrado.ExistenciaFraccion : productoEncontrado.Existencia,
                CantidadBase: prev.fraccionable ? prev.quantity * productoEncontrado.Contenido : prev.quantity
            }
        })

        localStorage.setItem('validCart', JSON.stringify(comparativoExistencias))

        const invalidItemsFound = []

        const isValid = productos.every(producto => {
            const productoEncontrado = cart.find(item => item.id === producto.Guid)
            const existencia = productoEncontrado.fraccionable ? producto.ExistenciaFraccion : producto.Existencia
            if (existencia < productoEncontrado.quantity) {
                invalidItemsFound.push({
                    ...productoEncontrado,
                    Existencia: existencia
                })
                return false
            }
            return true
        })

        if (!isValid) {
            setInvalidItems(comparativoExistencias)
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
    const cart = JSON.parse(localStorage.getItem('validCart'))
    const sucursalTraspaso = JSON.parse(localStorage.getItem('sucursal'))

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
