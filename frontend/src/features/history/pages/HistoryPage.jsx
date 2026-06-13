import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Eye, TrendingUp, CheckCircle, Clock, XCircle,
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
  ShoppingCart, FileText, Tag, ArrowRightLeft,
  LayoutList, BadgeCheck, BadgeX, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosService } from '@/features/pos/usePosService';
import { EventsOn } from '../../../../wailsjs/runtime/runtime';
import { ModalSolicitarDescuento } from '../components/ModalSolicitarDescuento';
import { ModalConvertirVenta } from '../components/ModalConvertirVenta';
import { ModalVerTransaccion } from '../components/ModalVerTransaccion';
import { toast } from 'sonner';

/* ── Constantes ── */
const PAGE_SIZE = 15;

const TIPO_TABS = [
  { id: null,  label: 'Todos',          icon: LayoutList },
  { id: 1,     label: 'Ventas',         icon: ShoppingCart },
  { id: 2,     label: 'Cotizaciones',   icon: FileText },
  { id: 3,     label: 'Transferencias', icon: ArrowRightLeft },
];

/* ── Helpers ── */
function parseFecha(fechaStr) {
  if (!fechaStr) return { fecha: '—', hora: '' };
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return { fecha: fechaStr, hora: '' };
  const fecha = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora  = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return { fecha, hora };
}

function esHoy(fechaStr) {
  if (!fechaStr) return false;
  const d   = new Date(fechaStr);
  const hoy = new Date();
  return (
    d.getFullYear() === hoy.getFullYear() &&
    d.getMonth()    === hoy.getMonth()    &&
    d.getDate()     === hoy.getDate()
  );
}

/* ── Badges de estatus de pedido ── */
const statusConfig = {
  'Completado': { icon: CheckCircle, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' },
  'Completada': { icon: CheckCircle, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' },
  'Pendiente':  { icon: Clock,       className: 'bg-amber-500/10  text-amber-600  border-amber-500/20  dark:text-amber-400'  },
  'Cancelado':  { icon: XCircle,     className: 'bg-red-500/10    text-red-600    border-red-500/20    dark:text-red-400'    },
  'Cancelada':  { icon: XCircle,     className: 'bg-red-500/10    text-red-600    border-red-500/20    dark:text-red-400'    },
  'En proceso': { icon: Loader2,     className: 'bg-blue-500/10   text-blue-600   border-blue-500/20   dark:text-blue-400'   },
};

function getStatusConfig(estatus) {
  return statusConfig[estatus] ?? { icon: Clock, className: 'bg-muted text-muted-foreground border-border' };
}

/* ── Badge de autorización de cotización ── */
function AuthBadge({ estatus }) {
  if (!estatus) return null;
  const cfg = {
    solicitada: { label: 'Esperando auth.',  className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400', icon: Clock },
    autorizada: { label: 'Autorizada',        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400', icon: BadgeCheck },
    rechazada:  { label: 'Rechazada',         className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400', icon: BadgeX },
  }[estatus];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold mt-1', cfg.className)}>
      <Icon className="size-2.5" />
      {cfg.label}
    </span>
  );
}

/* ── Botones de acción contextuales para cotizaciones ── */
function CotizacionAcciones({ row, onSolicitarDescuento, onConvertirVenta }) {
  if (row.TipoPedidoID !== 2) return null;
  if (row.Estatus === 'Completada' || row.Estatus === 'Completado') return null;

  const auth = row.EstatusAutorizacion || '';

  if (auth === 'solicitada') {
    return (
      <span className="text-xs text-indigo-500 font-medium px-1">Esperando...</span>
    );
  }
  if (auth === 'rechazada') {
    return (
      <span className="text-xs text-red-500 font-medium px-1">Rechazada</span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {auth === '' && (
        <button
          onClick={() => onSolicitarDescuento(row)}
          className="flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/5 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-500/10 transition-colors dark:text-indigo-400"
        >
          <Tag className="size-3" />
          Desc.
        </button>
      )}
      <button
        onClick={() => onConvertirVenta(row)}
        className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <ShoppingCart className="size-3" />
        Convertir
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
/*  Componente principal                                        */
/* ════════════════════════════════════════════════════════════ */
export function HistoryPage() {
  const { consultarTransacciones } = usePosService();

  const [transacciones, setTransacciones] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [search, setSearch]               = useState('');
  const [page, setPage]                   = useState(1);
  const [tipoFiltro, setTipoFiltro]       = useState(null); // null | 1 | 2 | 3

  // Modales
  const [modalDescuento, setModalDescuento] = useState(null); // row | null
  const [modalVenta, setModalVenta]         = useState(null); // row | null
  const [modalVer, setModalVer]             = useState(null); // row | null

  /* ── Carga de datos ── */
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await consultarTransacciones(tipoFiltro, null);
      if (!res.success) { setError(res.message || 'Error al obtener transacciones'); return; }
      setTransacciones(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [tipoFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  /* ── Listener WebSocket: el backend emite este evento cuando llega una resolución ── */
  useEffect(() => {
    const unsub = EventsOn('cotizacion_resuelta', (data) => {
      cargar(); // recarga la tabla automáticamente
      if (data) {
        const isApproved = data.estatus === 'autorizada';
        const msg = isApproved
          ? `La solicitud de descuento para la cotización ha sido AUTORIZADA.`
          : `La solicitud de descuento para la cotización ha sido RECHAZADA.`;
        if (isApproved) {
          toast.success(msg, { duration: 5000 });
        } else {
          toast.error(msg, { duration: 5000 });
        }
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [cargar]);

  /* ── Filtrado por búsqueda ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return transacciones;
    return transacciones.filter(t =>
      String(t.Folio ?? '').toLowerCase().includes(q) ||
      (t.RazonSocial ?? '').toLowerCase().includes(q) ||
      (t.TipoOperacion ?? '').toLowerCase().includes(q),
    );
  }, [transacciones, search]);

  /* ── Paginación ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => setPage(1), [search, tipoFiltro]);

  /* ── Resumen del día ── */
  const resumen = useMemo(() => {
    const hoy         = transacciones.filter(t => esHoy(t.Fecha));
    const completados = hoy.filter(t => t.Estatus === 'Completado' || t.Estatus === 'Completada');
    const pendientes  = hoy.filter(t => t.Estatus === 'Pendiente');
    const totalHoy    = completados.reduce((acc, t) => acc + (t.MontoTransaccion ?? 0), 0);
    return { totalHoy, completados: completados.length, pendientes: pendientes.length };
  }, [transacciones]);

  const summaryCards = [
    { label: 'Ventas Hoy',   value: `$${resumen.totalHoy.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: TrendingUp,  color: 'text-primary',  bg: 'bg-primary/10' },
    { label: 'Completados',  value: String(resumen.completados), icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Pendientes',   value: String(resumen.pendientes),  icon: Clock,       color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/10'  },
  ];

  /* ── Handlers modales ── */
  const handleSolicitarDescuento = (row) => setModalDescuento(row);
  const handleConvertirVenta     = (row) => setModalVenta(row);
  const handleModalClose         = ()    => { setModalDescuento(null); setModalVenta(null); cargar(); };

  const modalAbierto = !!modalDescuento || !!modalVenta;

  /* ── Render ── */
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in">

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Gestión de Pedidos</h2>
            <p className="text-sm text-muted-foreground">Historial de ventas, cotizaciones y transferencias.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cargar}
              disabled={loading}
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Recargar"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por folio, cliente o tipo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-lg border border-border bg-surface pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
          </div>
        </div>

        {/* ── Tabs de tipo ── */}
        <div className="flex items-center gap-1 shrink-0 p-1 bg-muted/40 rounded-xl w-fit border border-border/60">
          {TIPO_TABS.map(tab => {
            const Icon    = tab.icon;
            const active  = tipoFiltro === tab.id;
            const pending = tab.id === 2
              ? transacciones.filter(t => t.TipoPedidoID === 2 && t.EstatusAutorizacion === 'solicitada').length
              : 0;
            return (
              <button
                key={String(tab.id)}
                onClick={() => setTipoFiltro(tab.id)}
                className={cn(
                  'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  active
                    ? 'bg-background text-foreground shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {tab.label}
                {pending > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white">
                    {pending}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Table card */}
        <div className="flex-1 overflow-hidden rounded-xl border border-border bg-surface flex flex-col">

          {/* Error */}
          {error && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-red-500/10">
                <AlertCircle className="size-6 text-red-500" />
              </div>
              <p className="text-sm font-semibold text-foreground">No se pudo cargar el historial</p>
              <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
              <button onClick={cargar} className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <RefreshCw className="size-3" /> Reintentar
              </button>
            </div>
          )}

          {/* Skeleton */}
          {loading && !error && (
            <div className="flex-1 p-4 space-y-2 overflow-hidden">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="h-9 w-20 rounded-md bg-muted" />
                  <div className="h-9 w-28 rounded-md bg-muted" />
                  <div className="h-9 flex-1 rounded-md bg-muted" />
                  <div className="h-9 w-24 rounded-md bg-muted" />
                  <div className="h-9 w-20 rounded-md bg-muted" />
                  <div className="h-9 w-28 rounded-md bg-muted" />
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {!loading && !error && (
            <>
              <div className={cn('flex-1', modalAbierto ? 'overflow-hidden' : 'overflow-auto')}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 sticky top-0">
                      {['Folio', 'Fecha', 'Cliente', 'Tipo', 'Total', 'Estado', 'Acciones'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                          {search ? 'Sin resultados para la búsqueda.' : 'No hay transacciones registradas.'}
                        </td>
                      </tr>
                    )}
                    {pageItems.map((t) => {
                      const { fecha, hora } = parseFecha(t.Fecha);
                      let sc                = getStatusConfig(t.Estatus);
                      let displayEstatus    = t.Estatus;
                      const esCotizacion    = t.TipoPedidoID === 2;

                      if (esCotizacion) {
                        if (t.EstatusAutorizacion === 'solicitada') {
                          sc = { icon: Clock, className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400' };
                          displayEstatus = 'Esperando Auth';
                        } else if (t.EstatusAutorizacion === 'autorizada') {
                          sc = { icon: BadgeCheck, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' };
                          displayEstatus = 'Autorizada';
                        } else if (t.EstatusAutorizacion === 'rechazada') {
                          sc = { icon: BadgeX, className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400' };
                          displayEstatus = 'Rechazada';
                        }
                      }
                      const StatusIcon      = sc.icon;

                      return (
                        <tr key={t.ID} className="hover:bg-muted/20 transition-colors group">

                          {/* Folio */}
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-primary whitespace-nowrap">
                            #{String(t.Folio).padStart(4, '0')}
                          </td>

                          {/* Fecha */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-xs font-medium text-foreground">{fecha}</div>
                            {hora && <div className="text-xs text-muted-foreground/70">{hora}</div>}
                          </td>

                          {/* Cliente */}
                          <td className="px-4 py-3 font-medium text-foreground max-w-[160px] truncate">
                            {t.RazonSocial || 'Público General'}
                          </td>

                          {/* Tipo */}
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {t.TipoOperacion || '—'}
                          </td>

                          {/* Total */}
                          <td className="px-4 py-3 font-semibold text-foreground tabular-nums whitespace-nowrap">
                            ${(t.MontoTransaccion ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Estado */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-0.5">
                              <span className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                                sc.className,
                              )}>
                                <StatusIcon className="size-3" />
                                {displayEstatus || '—'}
                              </span>
                              {esCotizacion && t.EstatusAutorizacion && (
                                <span className={cn(
                                  "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-md",
                                  t.EstatusAutorizacion === 'solicitada' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 dark:text-indigo-400' :
                                  t.EstatusAutorizacion === 'autorizada' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400' :
                                  'bg-red-500/10 text-red-600 border border-red-500/20 dark:text-red-400'
                                )}>
                                  <Tag className="size-2.5" />
                                  Desc. {t.EstatusAutorizacion === 'solicitada' ? 'Solicitado' : t.EstatusAutorizacion === 'autorizada' ? 'Aprobado' : 'Rechazado'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Acciones genéricas */}
                              <button
                                onClick={() => setModalVer(t)}
                                className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                              >
                                <Eye className="size-3" /> Ver
                              </button>
                              {/* Acciones contextuales de cotización */}
                              {esCotizacion && (
                                <CotizacionAcciones
                                  row={t}
                                  onSolicitarDescuento={handleSolicitarDescuento}
                                  onConvertirVenta={handleConvertirVenta}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border px-4 py-3 shrink-0">
                <p className="text-xs text-muted-foreground">
                  {filtered.length === 0
                    ? 'Sin resultados'
                    : `Mostrando ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length} pedido${filtered.length !== 1 ? 's' : ''}`
                  }
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="px-2 text-xs font-medium text-foreground">{safePage} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Right Panel — Resumen ── */}
      <div className={cn('w-[260px] shrink-0 border-l border-border bg-surface flex flex-col gap-4 p-4', modalAbierto ? 'overflow-hidden' : 'overflow-y-auto')}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Resumen del Día</h3>
          {loading && <RefreshCw className="size-3.5 text-muted-foreground animate-spin" />}
        </div>

        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <div className={cn('flex size-7 items-center justify-center rounded-lg', card.bg)}>
                <card.icon className={cn('size-3.5', card.color)} />
              </div>
            </div>
            {loading
              ? <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
              : <p className="text-2xl font-bold text-foreground">{card.value}</p>
            }
          </div>
        ))}

        {/* Cotizaciones pendientes de auth */}
        {!loading && !error && (() => {
          const pendientes = transacciones.filter(t => t.TipoPedidoID === 2 && t.EstatusAutorizacion === 'solicitada');
          if (pendientes.length === 0) return null;
          return (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="size-3.5 text-indigo-500" />
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Esperando autorización</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{pendientes.length}</p>
              <p className="text-xs text-muted-foreground mt-1">cotización{pendientes.length !== 1 ? 'es' : ''}</p>
            </div>
          );
        })()}

        {/* Total general */}
        {!loading && !error && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 mt-auto">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total registros</p>
            <p className="text-2xl font-bold text-foreground">{transacciones.length}</p>
            <p className="text-xs text-muted-foreground mt-1">en todas las fechas</p>
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      {modalDescuento && (
        <ModalSolicitarDescuento
          row={modalDescuento}
          onClose={handleModalClose}
        />
      )}
      {modalVenta && (
        <ModalConvertirVenta
          row={modalVenta}
          onClose={handleModalClose}
        />
      )}
      {modalVer && (
        <ModalVerTransaccion
          row={modalVer}
          onClose={() => setModalVer(null)}
        />
      )}
    </div>
  );
}
