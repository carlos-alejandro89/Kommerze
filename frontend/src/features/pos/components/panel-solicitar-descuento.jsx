'use client';

import * as React from 'react';
import {
    Tag,
    Send,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Percent,
    Save,
    ShieldCheck,
    ShoppingCart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EventsOn, EventsOff } from '../../../../wailsjs/runtime/runtime';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { ModalConvertirVenta } from '@/features/history/components/ModalConvertirVenta';

// ── Configuración visual por estatus de autorización ─────────────────────────
const STATUS_CONFIG = {
    sin_solicitud: {
        label: 'Sin solicitud',
        icon: AlertCircle,
        className: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400',
        border: 'border-slate-200 dark:border-zinc-700',
    },
    solicitada: {
        label: 'Pendiente de autorización',
        icon: Clock,
        className: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/50',
        animate: true,
    },
    autorizada: {
        label: 'Descuento autorizado',
        icon: CheckCircle2,
        className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    rechazada: {
        label: 'Solicitud rechazada',
        icon: XCircle,
        className: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800/50',
    },
};

/**
 * PanelSolicitarDescuento
 *
 * Muestra una tabla de los productos del carrito donde el cajero puede
 * especificar el % de descuento por producto.
 *
 * Al enviar la solicitud, el componente:
 *   1. Guarda la cotización en BD con ConfirmarTransaccion (tipo 2)
 *      si aún no tiene pedidoGuid.
 *   2. Usa el GUID devuelto para llamar a SolicitarAutorizacion.
 *
 * Props:
 *  - cart       : array de items del carrito
 *  - sucursalGuid  : GUID de la sucursal activa (string)
 *  - posService : hook usePosService() para llamar al backend
 */
export function PanelSolicitarDescuento({ cart, sucursalGuid, posService }) {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [collapsed, setCollapsed] = React.useState(false);

    // Catálogo de tipos de autorización cargado desde el backend
    const [tiposAutorizacion, setTiposAutorizacion] = React.useState([]);
    // Tipo seleccionado (Descuento Especial por defecto)
    const GUID_DESCUENTO_ESPECIAL = 'e57b32c1-d9a4-4638-b02f-f481c7e93da0';
    const [tipoSeleccionado, setTipoSeleccionado] = React.useState(GUID_DESCUENTO_ESPECIAL);

    // Map: item.id (guid del nivel) → porcentaje de descuento solicitado (string)
    const [descuentos, setDescuentos] = React.useState({});

    // GUID del pedido una vez guardado en BD, su ID numérico y folio
    const [pedidoGuid, setPedidoGuid] = React.useState(null);
    const [pedidoId, setPedidoId] = React.useState(null);
    const [pedidoFolio, setPedidoFolio] = React.useState(null);
    const [showConvertirModal, setShowConvertirModal] = React.useState(false);

    const [statusAutorizacion, setStatusAutorizacion] = React.useState('sin_solicitud');
    const [obsAutorizacion, setObsAutorizacion] = React.useState('');
    const [autorizadoPor, setAutorizadoPor] = React.useState('');
    const [comentarios, setComentarios] = React.useState('');

    // 'idle' | 'guardando' | 'enviando' | 'error'
    const [etapa, setEtapa] = React.useState('idle');
    const [errorMsg, setErrorMsg] = React.useState('');

    // ── Cargar catálogo de tipos al montar ──────────────────────────────────
    React.useEffect(() => {
        posService.obtenerTiposAutorizacion()
            .then(tipos => {
                setTiposAutorizacion(tipos || []);
            })
            .catch(err => console.error('[PanelSolicitarDescuento] Error cargando tipos:', err));
    }, []);

    // ── Escuchar el evento Wails de resolución de cotización ────────────────
    React.useEffect(() => {
        const handler = (data) => {
            if (!pedidoGuid || data?.pedidoGuid !== pedidoGuid) return;
            setStatusAutorizacion(data?.estatus || 'sin_solicitud');
            setAutorizadoPor(data?.autorizadoPor || '');
            setObsAutorizacion(data?.observaciones || '');
            
            // Notification is now handled globally by NotificationProvider
        };
        const unsub = EventsOn('cotizacion_resuelta', handler);
        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [pedidoGuid]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const getPct = (itemId) => {
        const val = descuentos[itemId];
        return val !== undefined && val !== '' ? parseFloat(val) : 0;
    };

    const hayDescuentos = cart.some(item => getPct(item.id) > 0);

    const handleDescuentoChange = (itemId, raw) => {
        const cleaned = raw.replace(/[^0-9.]/g, '');
        const num = parseFloat(cleaned);
        if (cleaned === '' || (!isNaN(num) && num >= 0 && num <= 100)) {
            setDescuentos(prev => ({ ...prev, [itemId]: cleaned }));
        }
    };

    // ── Construir items de pedido para ConfirmarTransaccion ──────────────────
    const buildItemsPedido = () =>
        cart.map(item => ({
            ID: item.id,
            Sku: item.sku || '',
            Name: item.name || '',
            Price: item.price,
            Quantity: item.quantity,
            Empaque: item.empaque || '',
            Discount: 0,           // sin descuento aún, se aplica después de autorización
            Fraccionable: item.fraccionable || false,
            ProductoBaseGuid: item.productoBaseGuid || item.id,
            GuidBase: item.productoBaseGuid || item.id,
            Existencia: item.quantity,
            CantidadBase: item.quantity,
        }));

    // ── Guardar cotización en BD y devuelve el GUID ──────────────────────────
    const guardarCotizacion = async () => {
        const tipoCotizacion = 2;
        const itemsPedido = buildItemsPedido();

        const result = await posService.confirmarTransaccion(
            tipoCotizacion,
            [],           // sin pagos (cotización no requiere pago inmediato)
            itemsPedido,
            null,         // sin sucursal origen
            null,         // sin sucursal destino
        );

        if (!result?.success) {
            throw new Error(result?.message || 'No se pudo guardar la cotización');
        }

        // result.data es el modelo Pedido serializado por Go
        const id = result?.data?.ID;
        const guid = result?.data?.Guid;
        const folio = result?.data?.Folio;

        if (!guid) {
            throw new Error('El backend no devolvió el GUID del pedido');
        }

        // Persistir folio para que cart-order-placed lo encuentre
        if (folio) localStorage.setItem('folio', String(folio));
        if (id) setPedidoId(id);

        return { id, guid, folio };
    };

    // ── Enviar solicitud (guarda cotización si es necesario) ─────────────────
    const handleEnviarSolicitud = async () => {
        if (!hayDescuentos) return;
        setErrorMsg('');

        const items = cart
            .filter(item => getPct(item.id) > 0)
            .map(item => ({
                nivelGuid:           item.id,
                cantidad:            item.quantity,
                precioVenta:         item.price,
                descuentoSolicitado: getPct(item.id),
                descuentoAutorizado: 0,
            }));

        try {
            let guid = pedidoGuid;

            // Paso 1 — Guardar la cotización si aún no tiene GUID
            if (!guid) {
                setEtapa('guardando');
                const saved = await guardarCotizacion();
                guid = saved.guid;
                setPedidoGuid(guid);
                setPedidoFolio(saved.folio);
                setPedidoId(saved.id);
            }

            // Paso 2 — Enviar solicitud de autorización
            setEtapa('enviando');
            await posService.solicitarAutorizacion(
                guid,
                sucursalGuid || '',
                tipoSeleccionado,
                user?.Guid || '',
                comentarios,
                items,
            );
            setStatusAutorizacion('solicitada');
            setEtapa('idle');

        } catch (err) {
            setEtapa('error');
            setErrorMsg(err?.message || String(err) || 'Error al procesar la solicitud.');
            console.error('[PanelSolicitarDescuento]', err);
        }
    };

    // ── Cierre de modal de conversión y limpieza de checkout ─────────────────
    const handleConvertirVentaClose = () => {
        setShowConvertirModal(false);

        // Persistir folio y tipo de operación para cart-order-placed
        localStorage.setItem('folio', JSON.stringify(pedidoFolio));
        localStorage.setItem('operationType', JSON.stringify(1)); // Convertido a Venta

        const totalNeto = cart.reduce((sum, item) => {
            const pct = getPct(item.id);
            const price = item.price;
            const disc = pct > 0 ? (price * pct / 100) : 0;
            return sum + (price - disc) * item.quantity;
        }, 0);

        localStorage.setItem('pagosAplicados', JSON.stringify([{
            ID: 1,
            Nombre: 'Efectivo',
            Monto: totalNeto.toFixed(2),
        }]));

        // Limpiar el carrito de compras del POS
        localStorage.removeItem('cart');
        localStorage.removeItem('validCart');
        localStorage.removeItem('sucursal');

        // Redirigir a la pantalla de transacción exitosa
        navigate('/pos/order-placed');
    };

    // ── Calcular totales del preview ─────────────────────────────────────────
    const subtotalGeneral = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const descuentoGeneral = cart.reduce((s, i) => {
        const pct = getPct(i.id);
        return s + (pct > 0 ? (i.price * i.quantity * pct / 100) : 0);
    }, 0);
    const totalConDescuento = subtotalGeneral - descuentoGeneral;

    const status = STATUS_CONFIG[statusAutorizacion] || STATUS_CONFIG.sin_solicitud;
    const StatusIcon = status.icon;

    const bloqueado = statusAutorizacion === 'solicitada' || statusAutorizacion === 'autorizada';
    const enviando = etapa === 'guardando' || etapa === 'enviando';

    const btnLabel = etapa === 'guardando'
        ? 'Guardando cotización...'
        : etapa === 'enviando'
            ? 'Enviando solicitud...'
            : 'Enviar Solicitud de Descuento';

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            id="panel-solicitar-descuento"
            className={cn(
                'rounded-2xl border transition-all duration-300',
                status.border,
            )}
        >
            {/* ── Header colapsable ── */}
            <button
                type="button"
                onClick={() => setCollapsed(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors rounded-t-2xl"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shrink-0">
                        <Tag className="size-4" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-foreground leading-none mb-1">
                            Solicitar Descuento
                            {pedidoFolio && (
                                <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                                    — Folio #{pedidoFolio}
                                </span>
                            )}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-none">
                            Especifica el % por producto y envía para autorización
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide',
                            status.className,
                        )}
                    >
                        <StatusIcon
                            className={cn('size-3', status.animate && 'animate-spin')}
                        />
                        {status.label}
                    </span>

                    {collapsed
                        ? <ChevronDown className="size-4 text-muted-foreground" />
                        : <ChevronUp className="size-4 text-muted-foreground" />
                    }
                </div>
            </button>

            {/* ── Cuerpo colapsable ── */}
            {!collapsed && (
                <div className="px-5 pb-5 space-y-4 border-t border-inherit">

                    {/* Banner: cotización guardada */}
                    {pedidoGuid && (
                        <div className="mt-4 rounded-xl px-4 py-2.5 flex items-center gap-2.5 bg-violet-50 dark:bg-violet-900/15 border border-violet-200 dark:border-violet-800/40 text-xs text-violet-700 dark:text-violet-300 font-medium">
                            <Save className="size-3.5 shrink-0" />
                            Cotización guardada en sistema. GUID: <span className="font-mono text-[10px] opacity-70">{pedidoGuid}</span>
                        </div>
                    )}

                    {/* Banner: estado autorizado / rechazado */}
                    {(statusAutorizacion === 'autorizada' || statusAutorizacion === 'rechazada') && (
                        <div className={cn(
                            'rounded-xl p-3.5 flex items-start gap-3 text-sm',
                            statusAutorizacion === 'autorizada'
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40'
                                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40',
                        )}>
                            <StatusIcon className={cn(
                                'size-4 shrink-0 mt-0.5',
                                statusAutorizacion === 'autorizada' ? 'text-emerald-500' : 'text-red-500',
                            )} />
                            <div>
                                {autorizadoPor && (
                                    <p className="font-semibold text-foreground text-xs mb-0.5">
                                        {statusAutorizacion === 'autorizada' ? 'Autorizado' : 'Rechazado'} por: {autorizadoPor}
                                    </p>
                                )}
                                {obsAutorizacion && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">{obsAutorizacion}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Selector tipo de autorización + solicitante ── */}
                    <div className="mt-4 grid grid-cols-1 gap-3">
                        {/* Tipo de autorización */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                                <ShieldCheck className="size-3" />
                                Tipo de autorización
                            </label>
                            <div
                                id="select-tipo-autorizacion"
                                className="w-full text-xs font-bold rounded-xl border border-border bg-slate-50 dark:bg-zinc-800/50 px-3 py-2 text-foreground"
                            >
                                Descuento Especial
                            </div>
                        </div>

                        {/* Solicitante */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-border/50 text-xs text-muted-foreground">
                            <span className="font-bold text-foreground shrink-0">Solicitante:</span>
                            <span className="truncate">{user?.Nombre || user?.CorreoElectronico || 'Usuario actual'}</span>
                            {user?.Guid && (
                                <span className="font-mono text-[9px] opacity-50 ml-auto shrink-0">{user.Guid.slice(0, 8)}…</span>
                            )}
                        </div>
                    </div>

                    {/* ── Tabla de productos ── */}
                    <div className="mt-4 rounded-xl overflow-hidden border border-border/50">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-border/50">
                                    <th className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Producto</th>
                                    <th className="text-right px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Importe</th>
                                    <th className="text-center px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-muted-foreground w-24">
                                        <span className="flex items-center justify-center gap-1">
                                            <Percent className="size-3" /> Desc.
                                        </span>
                                    </th>
                                    <th className="text-right px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {cart.map((item) => {
                                    const pct = getPct(item.id);
                                    const importe = item.price * item.quantity;
                                    const montoDesc = importe * pct / 100;
                                    const subtotalItem = importe - montoDesc;
                                    const tieneDesc = pct > 0;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={cn(
                                                'transition-colors',
                                                tieneDesc
                                                    ? 'bg-violet-50/60 dark:bg-violet-900/10'
                                                    : 'bg-white dark:bg-zinc-900',
                                            )}
                                        >
                                            {/* Producto */}
                                            <td className="px-3 py-2.5">
                                                <div className="font-mono font-bold text-[11px] text-foreground leading-none mb-0.5">
                                                    {item.sku}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground leading-tight truncate max-w-[180px]">
                                                    {item.name}
                                                </div>
                                                <div className="text-[9px] text-muted-foreground/60 mt-0.5">
                                                    {item.quantity} × ${item.price.toFixed(2)}
                                                </div>
                                            </td>

                                            {/* Importe */}
                                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                                                ${importe.toFixed(2)}
                                            </td>

                                            {/* Input % descuento */}
                                            <td className="px-3 py-2.5 text-center">
                                                <div className="relative inline-flex items-center">
                                                    <input
                                                        id={`desc-pct-${item.id}`}
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={descuentos[item.id] ?? ''}
                                                        onChange={e => handleDescuentoChange(item.id, e.target.value)}
                                                        disabled={bloqueado || enviando}
                                                        placeholder="0"
                                                        className={cn(
                                                            'w-16 text-center text-xs font-bold rounded-lg border py-1.5 pr-5 pl-2 outline-none transition-all',
                                                            'bg-white dark:bg-zinc-800 border-border',
                                                            'focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400',
                                                            tieneDesc && 'border-violet-400 text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20',
                                                            (bloqueado || enviando) && 'opacity-60 cursor-not-allowed',
                                                        )}
                                                    />
                                                    <span className="absolute right-1.5 text-[9px] font-bold text-muted-foreground pointer-events-none">%</span>
                                                </div>
                                            </td>

                                            {/* Subtotal con descuento */}
                                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                <div className={cn(
                                                    'font-mono font-bold',
                                                    tieneDesc ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
                                                )}>
                                                    ${subtotalItem.toFixed(2)}
                                                </div>
                                                {tieneDesc && (
                                                    <div className="text-[9px] text-muted-foreground line-through">
                                                        ${importe.toFixed(2)}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                            {/* Footer: totales */}
                            {hayDescuentos && (
                                <tfoot className="border-t-2 border-border bg-slate-50/80 dark:bg-zinc-800/60">
                                    <tr>
                                        <td colSpan={2} className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                            Ahorro total
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <Badge variant="secondary" className="text-[9px] font-black bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-none px-1.5">
                                                {((descuentoGeneral / subtotalGeneral) * 100).toFixed(1)}%
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                            -${descuentoGeneral.toFixed(2)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={3} className="px-3 py-2 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                            Total con descuento
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-black text-foreground text-base">
                                            ${totalConDescuento.toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Error */}
                    {errorMsg && (
                        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                            <AlertCircle className="size-3.5 shrink-0" />
                            {errorMsg}
                        </p>
                    )}

                    {/* ── Botón principal: guardar + enviar ── */}
                    {!bloqueado && (
                        <Button
                            id="btn-enviar-solicitud-descuento"
                            onClick={handleEnviarSolicitud}
                            disabled={!hayDescuentos || enviando}
                            className={cn(
                                'w-full h-11 rounded-xl text-sm font-bold gap-2 transition-all active:scale-[0.98]',
                                hayDescuentos && !enviando
                                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-500/20'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                            )}
                        >
                            {enviando
                                ? <Clock className="size-4 animate-spin" />
                                : <Send className="size-4" />
                            }
                            {btnLabel}
                        </Button>
                    )}

                    {/* Estado: esperando respuesta del autorizador */}
                    {statusAutorizacion === 'solicitada' && (
                        <div className="w-full h-11 rounded-xl flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 text-sm font-semibold">
                            <Clock className="size-4 animate-spin" />
                            Esperando respuesta del autorizador...
                        </div>
                    )}

                    {/* Estado: autorizada — proceder a pago y venta */}
                    {statusAutorizacion === 'autorizada' && (
                        <Button
                            id="btn-convertir-venta-pos"
                            onClick={() => setShowConvertirModal(true)}
                            className="w-full h-11 rounded-xl text-sm font-bold gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 active:scale-[0.98]"
                        >
                            <ShoppingCart className="size-4" />
                            Convertir a Venta y Pagar
                        </Button>
                    )}

                    {/* Estado: rechazada — reintentar */}
                    {statusAutorizacion === 'rechazada' && (
                        <Button
                            onClick={() => {
                                setStatusAutorizacion('sin_solicitud');
                                setDescuentos({});
                                setObsAutorizacion('');
                                setAutorizadoPor('');
                                setErrorMsg('');
                                // Nota: pedidoGuid se mantiene para reusar el mismo pedido
                            }}
                            variant="outline"
                            className="w-full h-11 rounded-xl text-sm font-bold gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                            Reintentar solicitud
                        </Button>
                    )}

                    {/* Ayuda */}
                    {!hayDescuentos && statusAutorizacion === 'sin_solicitud' && (
                        <p className="text-[11px] text-muted-foreground text-center pt-1">
                            Ingresa un % de descuento en al menos un producto para habilitar el envío.
                        </p>
                    )}

                    {hayDescuentos && !pedidoGuid && statusAutorizacion === 'sin_solicitud' && (
                        <p className="text-[11px] text-violet-600 dark:text-violet-400 text-center pt-1 flex items-center justify-center gap-1">
                            <Save className="size-3.5 shrink-0" />
                            Al enviar, la cotización se guardará automáticamente en el sistema.
                        </p>
                    )}
                </div>
            )}

            {/* Modal de conversión de cotización a venta */}
            {showConvertirModal && (
                <ModalConvertirVenta
                    row={{
                        ID: pedidoId,
                        Folio: pedidoFolio,
                        EstatusAutorizacion: statusAutorizacion,
                    }}
                    onClose={handleConvertirVentaClose}
                />
            )}
        </div>
    );
}
