/**
 * usePosService — Punto único de contacto entre el POS y el backend Go.
 *
 * Este hook centraliza TODAS las llamadas al backend para la Terminal POS.
 * Funciona de forma transparente en ambos modos del dispositivo:
 *   - Servidor Local → acceso directo a la base de datos PostgreSQL.
 *   - Caja           → proxy HTTP al Servidor Local en la red LAN.
 *
 * El modo es seleccionado automáticamente en Go (app.go / services.go).
 * Aquí solo importamos, nunca sabemos ni nos importa cuál es el modo activo.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CÓMO AGREGAR NUEVAS FUNCIONALIDADES:
 * ────────────────────────────────────────────────────────────────────────────
 * 1. Agrega el método público en app.go (nombre con mayúscula).
 * 2. wails dev lo detecta y regenera App.js / App.d.ts automáticamente.
 * 3. Importa la función aquí y expónla en el objeto retornado.
 * 4. Sigue el patrón de los 5 pasos en Go (ver análisis patron_dual_analisis.md).
 *
 * Busca las secciones "TODO (futuras implementaciones)" para ver
 * los placeholders listos para completar.
 * ────────────────────────────────────────────────────────────────────────────
 */

import {
    ServiceConsultaProductos,
    ServiceBuscarClientes,
    ServiceConsultarExistenciaProductos,
    ServiceConfirmarTransaccion,
    ServiceCrearSolicitudProductos,
    ServiceObtenerTiposPedido,
    ServiceGetSucursales,
    ServiceGetSatFormasPago,
    ServiceConsultaTransacciones,
    ServiceConsultarTransferencias,
    ServiceCotizacionSolicitarAutorizacion,
    ServiceCotizacionConvertirAVenta,
    ServiceCotizacionObtenerDetalle,
    ServiceGetTiposAutorizacion,
    ServicePrintReceipt,
    ServiceEmailReceipt,
    ServiceBuscarEntidadFiscalProveedor,
} from '../../../wailsjs/go/main/App';

export function usePosService() {

    // ── Productos ─────────────────────────────────────────────────────────────

    /**
     * Busca productos por descripción, SKU o código de barras.
     * @param {string} q — término de búsqueda
     * @returns {Promise<ProductoDto[]>}
     */
    const buscarProductos = (q, conExistencia = false) => ServiceConsultaProductos(q, conExistencia);

    /**
     * Consulta la existencia actual de una lista de productos por sus GUIDs.
     * @param {string[]} guids — array de GUIDs de nivel de empaque
     * @returns {Promise<InventarioDto[]>}
     */
    const consultarExistencias = (guids) =>
        ServiceConsultarExistenciaProductos(guids);

    // ── Clientes ──────────────────────────────────────────────────────────────

    /**
     * Busca clientes por razón social, RFC o teléfono.
     * @param {string} q — término de búsqueda
     * @returns {Promise<ClienteDto[]>}
     */
    const buscarClientes = (q) => ServiceBuscarClientes(q);
    const buscarProveedorPorRFC = (rfc) => ServiceBuscarEntidadFiscalProveedor(rfc);

    // ── Catálogos POS ─────────────────────────────────────────────────────────

    /**
     * Retorna los tipos de pedido disponibles (Venta, Cotización, Traspaso...).
     * @returns {Promise<TipoPedido[]>}
     */
    const obtenerTiposPedido = () => ServiceObtenerTiposPedido();

    /**
     * Retorna las sucursales registradas (para traspasos).
     * @returns {Promise<ResponseDto>}
     */
    const obtenerSucursales = () => ServiceGetSucursales();

    /**
     * Retorna el catálogo SAT de formas de pago.
     * @returns {Promise<ResponseDto>}
     */
    const obtenerFormasPago = () => ServiceGetSatFormasPago();

    // ── Transacciones ─────────────────────────────────────────────────────────

    /**
     * Consulta el historial de transacciones registradas.
     * Devuelve ResponseDto cuyo campo `data` es un array de TransaccionDto.
     * @returns {Promise<ResponseDto>}
     */
    /**
     * Consulta el historial de transacciones con filtros opcionales.
     * @param {number|null} tipoPedidoID — 1=Venta, 2=Cotizacion, 3=Transferencia, null=Todos
     * @param {number|null} sucursalID — ID de sucursal origen, null=Todas
     */
    const consultarTransacciones = (tipoPedidoID = null, sucursalID = null) =>
        ServiceConsultaTransacciones(tipoPedidoID, sucursalID);

    const consultarTransferencias = () => ServiceConsultarTransferencias();

    /**
     * Confirma y registra la transacción en la base de datos.
     * @param {number} tipoOperacion — ID del tipo de pedido
     * @param {PagosAplicadosDto[]} pagosAplicados
     * @param {PedidoProductoDto[]} itemsPedido
     * @param {number|null} sucursalOrigen — ID de sucursal origen (traspasos)
     * @param {number|null} sucursalDestino — ID de sucursal destino (traspasos)
     * @param {number|null} operacionCajeroID — ID del turno activo del cajero
     * @returns {Promise<ResponseDto>}
     */
    const confirmarTransaccion = (tipoOperacion, pagosAplicados, itemsPedido, sucursalOrigen, sucursalDestino, operacionCajeroID = null) =>
        ServiceConfirmarTransaccion(tipoOperacion, pagosAplicados, itemsPedido, sucursalOrigen, sucursalDestino, operacionCajeroID);

    const crearSolicitudProductos = (solicitud) => ServiceCrearSolicitudProductos(solicitud);

    const imprimirRecibo = (pedidoGuid) => ServicePrintReceipt(pedidoGuid);
    const enviarRecibo = (pedidoGuid, correo) => ServiceEmailReceipt(pedidoGuid, correo);

    // ── Cotizaciones ────────────────────────────────────────────────────────────────────

    /**
     * Solicita autorización de descuentos al sistema central para una cotización.
     * @param {string} pedidoGuid
     * @param {string} sucursalGuid
     * @param {string} tipoAutorizacionGuid
     * @param {string} usuarioSolicitanteGuid
     * @param {string} comentarios
     * @param {ItemDescuentoDto[]} items
     */
    const solicitarAutorizacion = (pedidoGuid, sucursalGuid, tipoAutorizacionGuid, usuarioSolicitanteGuid, comentarios, items) =>
        ServiceCotizacionSolicitarAutorizacion(pedidoGuid, sucursalGuid, tipoAutorizacionGuid, usuarioSolicitanteGuid, comentarios, items);

    /**
     * Convierte una cotización autorizada (o sin descuento especial) en una venta real.
     * @param {number} pedidoID
     * @param {PagosAplicadosDto[]} pagos
     * @param {number|null} sucursalOrigenID
     */
    const convertirCotizacionAVenta = (pedidoID, pagos, sucursalOrigenID = null) =>
        ServiceCotizacionConvertirAVenta(pedidoID, pagos, sucursalOrigenID);

    /**
     * Obtiene el detalle completo de una cotización incluyendo estado de autorización.
     * @param {number} pedidoID
     */
    const obtenerDetalleCotizacion = (pedidoID) =>
        ServiceCotizacionObtenerDetalle(pedidoID);

    /**
     * Retorna el catálogo de tipos de autorización disponibles en el cloud.
     * @returns {Promise<TipoAutorizacionDto[]>}
     */
    const obtenerTiposAutorizacion = () => ServiceGetTiposAutorizacion();

    // ── TODO (futuras implementaciones) ────────────────────────────────────────
    // const abrirCajon = () => ServiceAbrirCajon();
    // const emitirFactura = (pedidoGuid, receptorFiscal) => ServiceEmitirFactura(pedidoGuid, receptorFiscal);
    // ─────────────────────────────────────────────────────────────────────────

    return {
        // Productos
        buscarProductos,
        consultarExistencias,
        // Clientes
        buscarClientes,
        buscarProveedorPorRFC,
        // Catálogos
        obtenerTiposPedido,
        obtenerSucursales,
        obtenerFormasPago,
        // Transacciones
        confirmarTransaccion,
        crearSolicitudProductos,
        consultarTransacciones,
        consultarTransferencias,
        imprimirRecibo,
        enviarRecibo,
        // Cotizaciones
        solicitarAutorizacion,
        convertirCotizacionAVenta,
        obtenerDetalleCotizacion,
        obtenerTiposAutorizacion,
    };
}
