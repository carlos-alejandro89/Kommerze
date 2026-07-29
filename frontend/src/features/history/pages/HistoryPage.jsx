import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search, Eye, TrendingUp, CheckCircle, Clock, XCircle,
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
  ShoppingCart, FileText, Tag, ArrowRightLeft,
  LayoutList, BadgeCheck, BadgeX, Loader2,
  ReceiptText,
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
  const navigate = useNavigate();
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

  useEffect(() => {
    const unsub = EventsOn('cotizacion_resuelta', (data) => {
      if (!data || !data.pedidoGuid) return;
      
      // Actualizar la lista silenciosamente si el pedido está visible
      setTransacciones(prev => prev.map(t => {
        if (t.Guid === data.pedidoGuid) {
          const isApproved = data.estatus === 'autorizada';
          const msg = isApproved
            ? `La solicitud de descuento para la cotización ha sido AUTORIZADA.`
            : `La solicitud de descuento para la cotización ha sido RECHAZADA.`;
          
          if (isApproved) {
            toast.success(msg, { duration: 5000 });
          } else {
            toast.error(msg, { duration: 5000 });
          }
          
          return { ...t, EstatusAutorizacion: data.estatus };
        }
        return t;
      }));
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
    { label: 'Ventas hoy', value: `$${resumen.totalHoy.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, detail: 'Importe completado', icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Completados', value: String(resumen.completados), detail: 'Operaciones del día', icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Pendientes', value: String(resumen.pendientes), detail: resumen.pendientes ? 'Requieren atención' : 'Sin pendientes', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Total registros', value: String(transacciones.length), detail: 'En todas las fechas', icon: FileText, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
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
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-hidden p-5 lg:p-6">

        {/* Header */}
        <div className="shrink-0">
          <nav className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <button type="button" onClick={() => navigate('/home')} className="transition hover:text-primary">Home</button>
            <span>/</span>
            <span className="text-foreground">Historial de ventas</span>
          </nav>
          <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ReceiptText className="size-6" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-[-0.025em] text-foreground">Historial de ventas</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Consulta y seguimiento de ventas, cotizaciones y transferencias.</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/home')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-xs font-semibold text-foreground transition hover:bg-muted">
              <ArrowLeft className="size-4" />
              Volver al inicio
            </button>
          </header>
        </div>

        {/* Resumen */}
        <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="flex min-h-[92px] items-center gap-3.5 rounded-2xl border border-white/70 bg-white/65 p-4 shadow-[0_12px_32px_-27px_rgba(30,64,120,.42)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.045]">
              <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', card.bg)}>
                <card.icon className={cn('size-5', card.color)} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground">{card.label}</p>
                {loading
                  ? <div className="mt-1 h-6 w-20 animate-pulse rounded-md bg-muted" />
                  : <p className="mt-0.5 truncate text-xl font-bold tracking-[-0.025em] text-foreground">{card.value}</p>
                }
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground/75">{card.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Navegación, búsqueda y actualización ── */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/55 p-2.5 shadow-[0_12px_34px_-29px_rgba(30,64,120,.4)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.035]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por folio, cliente o tipo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-border/70 bg-background/75 pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/75 focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <button
              onClick={cargar}
              disabled={loading}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/75 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              title="Actualizar historial"
            >
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/35 p-1">
            {TIPO_TABS.map(tab => {
              const Icon = tab.icon;
              const active = tipoFiltro === tab.id;
              const pending = tab.id === 2
                ? transacciones.filter(t => t.TipoPedidoID === 2 && t.EstatusAutorizacion === 'solicitada').length
                : 0;
              return (
                <button
                  key={String(tab.id)}
                  onClick={() => setTipoFiltro(tab.id)}
                  className={cn(
                    'relative flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all',
                    active
                      ? 'border border-border/60 bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                  {pending > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white">{pending}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table card */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">

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
                    <tr className="sticky top-0 border-b border-border/70 bg-slate-50/95 backdrop-blur dark:bg-white/[.055]">
                      {['Folio', 'Fecha', 'Cliente', 'Tipo', 'Total', 'Estado', 'Acciones'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/65">
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
                        <tr key={t.ID} className="group transition-colors hover:bg-blue-50/40 dark:hover:bg-white/[.035]">

                          {/* Folio */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <button onClick={() => setModalVer(t)} className="font-mono text-xs font-bold text-primary underline-offset-4 hover:underline">
                              #{String(t.Folio).padStart(4, '0')}
                            </button>
                          </td>

                          {/* Fecha */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="text-xs font-medium text-foreground">{fecha}</div>
                            {hora && <div className="text-xs text-muted-foreground/70">{hora}</div>}
                          </td>

                          {/* Cliente */}
                          <td className="max-w-[200px] truncate px-5 py-3.5 text-sm font-medium text-foreground">
                            {t.RazonSocial || 'Público General'}
                          </td>

                          {/* Tipo */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="rounded-md bg-blue-500/8 px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                              {t.TipoOperacion || '—'}
                            </span>
                          </td>

                          {/* Total */}
                          <td className="px-5 py-3.5 font-bold text-foreground tabular-nums whitespace-nowrap">
                            ${(t.MontoTransaccion ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Estado */}
                          <td className="px-5 py-3.5">
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
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {/* Acciones genéricas */}
                              <button
                                onClick={() => setModalVer(t)}
                                className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/65 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
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
              <div className="flex shrink-0 items-center justify-between border-t border-border/70 bg-background/35 px-5 py-3">
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
                    className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="min-w-16 px-2 text-center text-xs font-semibold text-foreground">{safePage} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
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
