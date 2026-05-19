import { useState, useEffect, useMemo } from 'react';
import {
  Search, Filter, Eye, FileText,
  TrendingUp, CheckCircle, Clock, XCircle,
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosService } from '../../../crm/pages/pos/usePosService';

/* ── Helpers ── */
const PAGE_SIZE = 15;

/** Parsea la fecha de TransaccionDto ("2006-01-02T15:04:05Z07:00" o similar) y
 *  devuelve un objeto { fecha, hora } para mostrar en la tabla. */
function parseFecha(fechaStr) {
  if (!fechaStr) return { fecha: '—', hora: '' };
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return { fecha: fechaStr, hora: '' };
  const fecha = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora  = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return { fecha, hora };
}

/** Devuelve true si la fecha ISO cae en el día de hoy (hora local). */
function esHoy(fechaStr) {
  if (!fechaStr) return false;
  const d = new Date(fechaStr);
  const hoy = new Date();
  return (
    d.getFullYear() === hoy.getFullYear() &&
    d.getMonth()    === hoy.getMonth()    &&
    d.getDate()     === hoy.getDate()
  );
}

/* ── Mapa de estatus ── */
const statusConfig = {
  'Completado':  { icon: CheckCircle, className: 'bg-success/10 text-success border-success/20' },
  'Completada':  { icon: CheckCircle, className: 'bg-success/10 text-success border-success/20' },
  'Pendiente':   { icon: Clock,       className: 'bg-warning/10 text-warning border-warning/20' },
  'Cancelado':   { icon: XCircle,     className: 'bg-danger/10  text-danger  border-danger/20'  },
  'Cancelada':   { icon: XCircle,     className: 'bg-danger/10  text-danger  border-danger/20'  },
};

function getStatusConfig(estatus) {
  return statusConfig[estatus] ?? {
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-border',
  };
}

/* ── Componente principal ── */
export function HistoryPage() {
  const { consultarTransacciones } = usePosService();

  const [transacciones, setTransacciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);

  /* ── Carga inicial ── */
  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await consultarTransacciones();
      if (!res.success) {
        setError(res.message || 'Error al obtener transacciones');
        return;
      }
      setTransacciones(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  /* ── Filtrado ── */
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
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const pageItems   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reinicia página cuando cambia la búsqueda
  useEffect(() => setPage(1), [search]);

  /* ── Resumen del día (calculado en cliente) ── */
  const resumen = useMemo(() => {
    const hoy = transacciones.filter(t => esHoy(t.Fecha));
    const completados = hoy.filter(t => t.Estatus === 'Completado' || t.Estatus === 'Completada');
    const pendientes  = hoy.filter(t => t.Estatus === 'Pendiente');
    const totalHoy    = completados.reduce((acc, t) => acc + (t.MontoTransaccion ?? 0), 0);
    return { totalHoy, completados: completados.length, pendientes: pendientes.length };
  }, [transacciones]);

  const summaryCards = [
    {
      label: 'Ventas Hoy',
      value: `$${resumen.totalHoy.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon:  TrendingUp,
      color: 'text-brand-500',
      bg:    'bg-brand-500/10',
    },
    {
      label: 'Completados',
      value: String(resumen.completados),
      icon:  CheckCircle,
      color: 'text-success',
      bg:    'bg-success/10',
    },
    {
      label: 'Pendientes',
      value: String(resumen.pendientes),
      icon:  Clock,
      color: 'text-warning',
      bg:    'bg-warning/10',
    },
  ];

  /* ── Render ── */
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in">

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden p-5 gap-5">

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Gestión de Pedidos</h2>
            <p className="text-sm text-muted-foreground">Revisa y administra el historial de ventas.</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={cargar}
              disabled={loading}
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Recargar"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            </button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por folio, cliente o tipo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-60 rounded-lg border border-border bg-surface pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>

            <button className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Filter className="size-3.5" />
              Filtrar
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="flex-1 overflow-hidden rounded-xl border border-border bg-surface flex flex-col">

          {/* ── Error state ── */}
          {error && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-danger/10">
                <AlertCircle className="size-6 text-danger" />
              </div>
              <p className="text-sm font-semibold text-foreground">No se pudo cargar el historial</p>
              <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
              <button
                onClick={cargar}
                className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
              >
                <RefreshCw className="size-3" /> Reintentar
              </button>
            </div>
          )}

          {/* ── Loading skeleton ── */}
          {loading && !error && (
            <div className="flex-1 p-4 space-y-2 overflow-hidden">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="h-9 w-24 rounded-md bg-muted" />
                  <div className="h-9 w-32 rounded-md bg-muted" />
                  <div className="h-9 flex-1 rounded-md bg-muted" />
                  <div className="h-9 w-24 rounded-md bg-muted" />
                  <div className="h-9 w-24 rounded-md bg-muted" />
                </div>
              ))}
            </div>
          )}

          {/* ── Table ── */}
          {!loading && !error && (
            <>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-subtle">
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
                          {search ? 'Sin resultados para la búsqueda.' : 'No hay transacciones registradas aún.'}
                        </td>
                      </tr>
                    )}
                    {pageItems.map((t) => {
                      const { fecha, hora } = parseFecha(t.Fecha);
                      const sc = getStatusConfig(t.Estatus);
                      const StatusIcon = sc.icon;
                      return (
                        <tr key={t.ID} className="hover:bg-bg-subtle transition-colors group">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                            #{String(t.Folio).padStart(4, '0')}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            <div className="text-xs font-medium">{fecha}</div>
                            {hora && <div className="text-xs text-muted-foreground/70">{hora}</div>}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">
                            {t.RazonSocial || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {t.TipoOperacion || '—'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground tabular-nums whitespace-nowrap">
                            ${(t.MontoTransaccion ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                              sc.className,
                            )}>
                              <StatusIcon className="size-3" />
                              {t.Estatus || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                                <Eye className="size-3" /> Ver
                              </button>
                              <button className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-600 transition-colors">
                                <FileText className="size-3" />
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

      {/* ── Right Panel — Summary ── */}
      <div className="w-[280px] shrink-0 border-l border-border bg-surface flex flex-col gap-4 p-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Resumen del Día</h3>
          {loading && <RefreshCw className="size-3.5 text-muted-foreground animate-spin" />}
        </div>
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-bg-subtle p-4">
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

        {/* Total general */}
        {!loading && !error && (
          <div className="rounded-xl border border-border bg-bg-subtle p-4 mt-auto">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total registros</p>
            <p className="text-2xl font-bold text-foreground">{transacciones.length}</p>
            <p className="text-xs text-muted-foreground mt-1">en todas las fechas</p>
          </div>
        )}
      </div>
    </div>
  );
}
