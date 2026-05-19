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
    ServiceObtenerTiposPedido,
    ServiceGetSucursales,
    ServiceGetSatFormasPago,
    ServiceConsultaTransacciones,
} from '../../../../wailsjs/go/main/App';

export function usePosService() {

    // ── Productos ─────────────────────────────────────────────────────────────

    /**
     * Busca productos por descripción, SKU o código de barras.
     * @param {string} q — término de búsqueda
     * @returns {Promise<ProductoDto[]>}
     */
    const buscarProductos = (q) => ServiceConsultaProductos(q);

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
    const consultarTransacciones = () => ServiceConsultaTransacciones();

    /**
     * Confirma y registra la transacción en la base de datos.
     * @param {number} tipoOperacion — ID del tipo de pedido
     * @param {PagosAplicadosDto[]} pagosAplicados
     * @param {PedidoProductoDto[]} itemsPedido
     * @param {number|null} sucursalOrigen — ID de sucursal origen (traspasos)
     * @param {number|null} sucursalDestino — ID de sucursal destino (traspasos)
     * @returns {Promise<ResponseDto>}
     */
    const confirmarTransaccion = (tipoOperacion, pagosAplicados, itemsPedido, sucursalOrigen, sucursalDestino) =>
        ServiceConfirmarTransaccion(tipoOperacion, pagosAplicados, itemsPedido, sucursalOrigen, sucursalDestino);

    // ── TODO (futuras implementaciones) ───────────────────────────────────────
    // Para implementar, seguir los 5 pasos del patrón dual en Go y luego
    // descomentar e importar aquí.
    //
    // const abrirCajon = () => ServiceAbrirCajon();
    //
    // const obtenerCajeroActivo = () => ServiceGetCajeroActivo();
    //
    // const aplicarDescuentoCliente = (clienteGuid, total) =>
    //     ServiceAplicarDescuentoCliente(clienteGuid, total);
    //
    // const emitirFactura = (pedidoGuid, receptorFiscal) =>
    //     ServiceEmitirFactura(pedidoGuid, receptorFiscal);
    //
    // const consultarCreditoCliente = (clienteGuid) =>
    //     ServiceConsultarCreditoCliente(clienteGuid);
    // ─────────────────────────────────────────────────────────────────────────

    return {
        // Productos
        buscarProductos,
        consultarExistencias,
        // Clientes
        buscarClientes,
        // Catálogos
        obtenerTiposPedido,
        obtenerSucursales,
        obtenerFormasPago,
        // Transacciones
        confirmarTransaccion,
        consultarTransacciones,
    };
}
