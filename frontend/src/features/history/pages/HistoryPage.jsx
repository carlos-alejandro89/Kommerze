import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search, Eye, TrendingUp, CheckCircle, Clock, XCircle,
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
  ShoppingCart, FileText, Tag,
  LayoutList, BadgeCheck, BadgeX, Loader2,
  ReceiptText, Printer, Mail, FileDown, Ban, MoreVertical, FileCheck2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosService } from '@/features/pos/usePosService';
import { EventsOn } from '../../../../wailsjs/runtime/runtime';
import { ModalSolicitarDescuento } from '../components/ModalSolicitarDescuento';
import { ModalConvertirVenta } from '../components/ModalConvertirVenta';
import { ModalVerTransaccion } from '../components/ModalVerTransaccion';
import { toast } from 'sonner';
import { TRANSACTION_TYPES, isTransactionType } from '@/features/pos/transaction-types';
import { DialogAlert } from '@/components/common/dialog-alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/* ── Constantes ── */
const PAGE_SIZE = 15;

const TIPO_TABS = [
  { id: null,  label: 'Todos',          icon: LayoutList },
  { id: TRANSACTION_TYPES.VENTA.guid,      label: 'Ventas',         icon: ShoppingCart },
  { id: TRANSACTION_TYPES.COTIZACION.guid, label: 'Cotizaciones',   icon: FileText },
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

function getInitials(value) {
  const words = String(value || 'Público General').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'PG';
}

function getDisplayFolio(row) {
  const folio = String(row?.Folio || '').padStart(6, '0');
  if (isTransactionType(row, TRANSACTION_TYPES.COTIZACION)) return `CTZ-${folio}`;
  return `${row?.SerieCFDI || 'A'}-${folio}`;
}

function RowActionButton({ label, icon: Icon, onClick, disabled, tone = 'text-primary hover:bg-primary/10' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn('group/action relative flex size-8 items-center justify-center rounded-full transition disabled:opacity-40', tone)}
    >
      <Icon className="size-3.5" />
      <span className="pointer-events-none absolute -top-9 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-950 px-2.5 py-1.5 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100">
        {label}
      </span>
    </button>
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
  if (!isTransactionType(row, TRANSACTION_TYPES.COTIZACION)) return null;
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
  const { consultarTransacciones, cancelarVenta, generarDocumentoVenta, imprimirRecibo, enviarRecibo, obtenerFacturaPDF } = usePosService();

  const [transacciones, setTransacciones] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [search, setSearch]               = useState('');
  const [page, setPage]                   = useState(1);
  const [tipoFiltro, setTipoFiltro]       = useState(null); // null | GUID de tipo

  // Modales
  const [modalDescuento, setModalDescuento] = useState(null); // row | null
  const [modalVenta, setModalVenta]         = useState(null); // row | null
  const [modalVer, setModalVer]             = useState(null); // row | null
  const [ventaCancelar, setVentaCancelar]   = useState(null);
  const [ventaEmail, setVentaEmail]         = useState(null);
  const [correoDestino, setCorreoDestino]   = useState('');
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [documentViewer, setDocumentViewer] = useState({ open: false, url: '', fileName: '' });

  /* ── Carga de datos ── */
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await consultarTransacciones(null, null);
      if (!res.success) { setError(res.message || 'Error al obtener transacciones'); return; }
      const data = Array.isArray(res.data) ? res.data : [];
      setTransacciones(data.filter(item =>
        (isTransactionType(item, TRANSACTION_TYPES.VENTA) || isTransactionType(item, TRANSACTION_TYPES.COTIZACION)) &&
        (!tipoFiltro || String(item.TipoPedidoGuid || item.tipoPedidoGuid || '').toLowerCase() === tipoFiltro),
      ));
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [tipoFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => () => {
    if (documentViewer.url) URL.revokeObjectURL(documentViewer.url);
  }, [documentViewer.url]);

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
      (t.SerieCFDI ?? '').toLowerCase().includes(q) ||
      (t.RazonSocial ?? '').toLowerCase().includes(q) ||
      (t.ReceptorRFC ?? '').toLowerCase().includes(q) ||
      (t.FacturaUUID ?? '').toLowerCase().includes(q) ||
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
    const hoy         = transacciones.filter(t => isTransactionType(t, TRANSACTION_TYPES.VENTA) && esHoy(t.Fecha));
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

  const pedidoGuid = (row) => row?.PedidoGuid || row?.pedidoGuid || row?.pedido_guid || row?.Guid || row?.guid || '';

  const requirePedidoGuid = (row) => {
    const guid = pedidoGuid(row);
    if (!guid) throw new Error('La operación no contiene un identificador válido. Actualiza el historial e intenta nuevamente.');
    return guid;
  };

  const abrirPDF = (result) => {
    if (!result?.dataBase64) throw new Error('El documento no contiene información');
    const bytes = Uint8Array.from(atob(result.dataBase64), char => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    setDocumentViewer(current => {
      if (current.url) URL.revokeObjectURL(current.url);
      return { open: true, url, fileName: result.fileName || 'documento.pdf' };
    });
  };

  const handleVerDocumento = async (row) => {
    setProcesandoAccion(true);
    try {
      abrirPDF(await generarDocumentoVenta(requirePedidoGuid(row)));
    } catch (err) {
      toast.error('No se pudo generar el documento: ' + String(err));
    } finally { setProcesandoAccion(false); }
  };

  const handleVerFactura = async (row) => {
    try {
      navigate('/pos/facturacion', { state: { pedidoGuid: requirePedidoGuid(row), mode: 'view' } });
    } catch (err) {
      toast.error('No se pudo abrir la factura: ' + String(err));
    }
  };

  const handleImprimir = async (row) => {
    setProcesandoAccion(true);
    try {
      const result = await imprimirRecibo(requirePedidoGuid(row));
      if (result?.kind === 'pdf') abrirPDF(result);
      else toast.success('Documento enviado a impresión');
    } catch (err) {
      toast.error('No se pudo imprimir: ' + String(err));
    } finally { setProcesandoAccion(false); }
  };

  const confirmarCancelacion = async () => {
    if (!ventaCancelar) return;
    setProcesandoAccion(true);
    try {
      const result = await cancelarVenta(requirePedidoGuid(ventaCancelar));
      if (!result?.success) throw new Error(result?.message || 'No fue posible cancelar la venta');
      toast.success('Venta cancelada y existencias reintegradas');
      setVentaCancelar(null);
      await cargar();
    } catch (err) {
      toast.error(String(err));
    } finally { setProcesandoAccion(false); }
  };

  const abrirEnvio = (row) => {
    setVentaEmail(row);
    setCorreoDestino(row?.Correo || row?.correo || '');
  };

  const confirmarEnvio = async () => {
    if (!ventaEmail || !correoDestino.trim()) return;
    setProcesandoAccion(true);
    try {
      await enviarRecibo(requirePedidoGuid(ventaEmail), correoDestino.trim());
      toast.success('Documento enviado por correo');
      setVentaEmail(null);
    } catch (err) {
      toast.error('No se pudo enviar el correo: ' + String(err));
    } finally { setProcesandoAccion(false); }
  };

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
                <p className="mt-0.5 text-xs text-muted-foreground">Consulta y seguimiento de ventas y cotizaciones.</p>
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

        {/* Table card */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">

          {/* Navegación y búsqueda integradas */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-5 self-stretch">
              {TIPO_TABS.map(tab => {
                const Icon = tab.icon;
                const active = tipoFiltro === tab.id;
                const pending = tab.id === TRANSACTION_TYPES.COTIZACION.guid
                  ? transacciones.filter(t => isTransactionType(t, TRANSACTION_TYPES.COTIZACION) && t.EstatusAutorizacion === 'solicitada').length
                  : 0;
                return (
                  <button
                    key={String(tab.id)}
                    onClick={() => setTipoFiltro(tab.id)}
                    className={cn(
                      'relative flex h-10 items-center gap-1.5 px-1 text-xs font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:rounded-full after:transition-colors',
                      active
                        ? 'text-primary after:bg-primary'
                        : 'text-muted-foreground after:bg-transparent hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {tab.label}
                    {pending > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white">{pending}</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por folio, cliente, RFC o UUID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-full border border-border/70 bg-background/75 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/45 focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <button
                onClick={cargar}
                disabled={loading}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/75 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                title="Actualizar historial"
              >
                <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

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
                      {['Folio / serie', 'Emisión', 'Receptor', 'Tipo', 'Total', 'Estado', 'Facturación', 'Acciones'].map(h => (
                        <th key={h} className={cn(
                          'py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground whitespace-nowrap',
                          h === 'Acciones' ? 'w-[58px] px-2 text-center' : 'px-5',
                        )}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/65">
                    {pageItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                          {search ? 'Sin resultados para la búsqueda.' : 'No hay transacciones registradas.'}
                        </td>
                      </tr>
                    )}
                    {pageItems.map((t) => {
                      const { fecha, hora } = parseFecha(t.Fecha);
                      let sc                = getStatusConfig(t.Estatus);
                      let displayEstatus    = t.Estatus;
                      const esCotizacion    = isTransactionType(t, TRANSACTION_TYPES.COTIZACION);
                      const actionKey       = t.PedidoGuid || t.ID;
                      const actionsOpen     = actionMenuOpen === actionKey;

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
                            <button onClick={() => setModalVer(t)} className="text-xs font-bold tracking-[0.01em] text-primary underline-offset-4 hover:underline">
                              {getDisplayFolio(t)}
                            </button>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{t.PedidoGuid ? 'Operación registrada' : 'Sin identificador'}</p>
                          </td>

                          {/* Fecha */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="text-xs font-medium text-foreground">{fecha}</div>
                            {hora && <div className="text-xs text-muted-foreground/70">{hora}</div>}
                          </td>

                          {/* Cliente */}
                          <td className="px-5 py-3.5">
                            <div className="flex min-w-[220px] items-center gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary ring-1 ring-primary/15">
                                {getInitials(t.RazonSocial)}
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-[250px] truncate text-xs font-semibold text-foreground">{t.RazonSocial || 'Público General'}</p>
                                <p className="mt-0.5 max-w-[250px] truncate text-[10px] text-muted-foreground">
                                  {t.ReceptorRFC ? `RFC: ${t.ReceptorRFC}` : (t.Correo || 'Sin datos fiscales asociados')}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Tipo */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="rounded-md bg-blue-500/8 px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                              {t.TipoOperacion || '—'}
                            </span>
                          </td>

                          {/* Total */}
                          <td className="px-5 py-3.5 font-bold text-foreground tabular-nums whitespace-nowrap">
                            ${(t.MontoTransaccion ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="ml-1 text-[9px] font-medium text-muted-foreground">MXN</span>
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

                          {/* Facturación */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {esCotizacion ? (
                              <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/45 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">No aplica</span>
                            ) : t.Facturada ? (
                              <span title={t.FacturaUUID || 'CFDI timbrado'} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <FileCheck2 className="size-3" /> Facturada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                <ReceiptText className="size-3" /> Sin facturar
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="relative w-[58px] px-2 py-3.5">
                            <div className="relative ml-auto flex w-9 items-center justify-end">
                              <div className={cn(
                                'absolute right-11 top-1/2 z-40 flex -translate-y-1/2 items-center gap-2 origin-right transition-all duration-200 ease-out',
                                actionsOpen
                                  ? 'pointer-events-auto translate-x-0 scale-100 opacity-100'
                                  : 'pointer-events-none translate-x-3 scale-95 opacity-0',
                              )}>
                                <div className="flex items-center rounded-full border border-border/70 bg-background/95 p-1 shadow-[0_16px_36px_-16px_rgba(20,54,110,.75)] backdrop-blur-xl">
                                  <RowActionButton label="Ver detalle" icon={Eye} onClick={() => { setActionMenuOpen(null); setModalVer(t); }} />
                                  <RowActionButton label="Ver documento" icon={FileDown} disabled={procesandoAccion} onClick={() => { setActionMenuOpen(null); handleVerDocumento(t); }} tone="text-blue-600 hover:bg-blue-500/10 dark:text-blue-400" />
                                  <RowActionButton label="Imprimir" icon={Printer} disabled={procesandoAccion} onClick={() => { setActionMenuOpen(null); handleImprimir(t); }} tone="text-violet-600 hover:bg-violet-500/10 dark:text-violet-400" />
                                  <RowActionButton label="Enviar por correo" icon={Mail} onClick={() => { setActionMenuOpen(null); abrirEnvio(t); }} tone="text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400" />
                                  {!esCotizacion && t.Facturada && (
                                    <RowActionButton label="Ver factura" icon={FileCheck2} disabled={procesandoAccion} onClick={() => { setActionMenuOpen(null); handleVerFactura(t); }} tone="text-teal-600 hover:bg-teal-500/10 dark:text-teal-400" />
                                  )}
                                  {!esCotizacion && !t.Facturada && (
                                    <RowActionButton label="Facturar venta" icon={ReceiptText} onClick={() => navigate('/pos/facturacion', { state: { pedidoGuid: requirePedidoGuid(t) } })} tone="text-sky-600 hover:bg-sky-500/10 dark:text-sky-400" />
                                  )}
                                  {!esCotizacion && !['Cancelado', 'Cancelada'].includes(t.Estatus) && (
                                    <RowActionButton label="Cancelar venta" icon={Ban} onClick={() => { setActionMenuOpen(null); setVentaCancelar(t); }} tone="text-red-600 hover:bg-red-500/10 dark:text-red-400" />
                                  )}
                                </div>
                                {esCotizacion && (
                                  <CotizacionAcciones
                                    row={t}
                                    onSolicitarDescuento={handleSolicitarDescuento}
                                    onConvertirVenta={handleConvertirVenta}
                                  />
                                )}
                              </div>
                              <button
                                type="button"
                                disabled={procesandoAccion}
                                aria-label={actionsOpen ? 'Cerrar acciones' : 'Mostrar acciones'}
                                aria-expanded={actionsOpen}
                                onClick={() => setActionMenuOpen(current => current === actionKey ? null : actionKey)}
                                className={cn(
                                  'flex size-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-50',
                                  actionsOpen
                                    ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                                    : 'text-muted-foreground hover:bg-muted hover:text-primary',
                                )}
                              >
                                <MoreVertical className="size-4" />
                              </button>
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
      <DialogAlert
        open={Boolean(ventaCancelar)}
        onOpenChange={(open) => !open && setVentaCancelar(null)}
        title="Cancelar venta"
        description={`¿Confirmas cancelar la venta #${String(ventaCancelar?.Folio || '').padStart(4, '0')}? Los productos vendidos regresarán al inventario. Esta acción no puede deshacerse.`}
        onConfirm={confirmarCancelacion}
        onCancel={() => setVentaCancelar(null)}
        type="warning"
      />
      <Dialog open={Boolean(ventaEmail)} onOpenChange={(open) => !open && setVentaEmail(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Enviar documento por correo</DialogTitle>
            <DialogDescription>Se enviará el PDF correspondiente a la operación seleccionada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label htmlFor="history-email-recipient" className="text-xs font-semibold text-foreground">Correo del destinatario</label>
            <input id="history-email-recipient" type="email" autoFocus value={correoDestino} onChange={event => setCorreoDestino(event.target.value)} placeholder="cliente@correo.com" className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setVentaEmail(null)}>Cancelar</Button>
            <Button type="button" disabled={procesandoAccion || !correoDestino.trim()} onClick={confirmarEnvio}>
              {procesandoAccion ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Enviar correo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={documentViewer.open} onOpenChange={(open) => setDocumentViewer(current => ({ ...current, open }))}>
        <DialogContent className="flex h-[94vh] w-[min(1180px,97vw)] max-w-none flex-col overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-border px-6 py-4 text-left">
            <DialogTitle>Documento de la operación</DialogTitle>
            <DialogDescription>Vista previa del PDF generado con la información registrada.</DialogDescription>
          </DialogHeader>
          {documentViewer.url && <iframe title={documentViewer.fileName} src={documentViewer.url} className="min-h-0 w-full flex-1 bg-zinc-100" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
