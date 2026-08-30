import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { es } from 'date-fns/locale';
import {
  ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign,
  FileText, Loader2, PackageCheck, Plus, RefreshCw, Search,
  ShoppingCart, SlidersHorizontal, UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePosService } from '@/features/pos/usePosService';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PAGE_SIZE = 15;
const EMPTY_FILTERS = { dateRange: undefined, origin: '', supplier: '', status: '' };
const MONTH_NAMES = Array.from({ length: 12 }, (_, month) => {
  const label = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(2026, month, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
});

function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '—', time: '' };
  return {
    date: date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  };
}

function formatFilterDate(value) {
  return value?.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) || '';
}

function money(value, currency = 'MXN') {
  return Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 });
}

function initials(value) {
  return String(value || 'Proveedor').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'P';
}

export function PurchaseHistoryPage() {
  const navigate = useNavigate();
  const { consultarHistorialCompras, generarReporteCompra } = usePosService();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [calendarView, setCalendarView] = useState('days');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [yearPageStart, setYearPageStart] = useState(() => Math.floor(new Date().getFullYear() / 12) * 12);
  const [openingReport, setOpeningReport] = useState('');
  const [viewer, setViewer] = useState({ open: false, url: '', fileName: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPurchases(await consultarHistorialCompras() || []);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (viewer.url) URL.revokeObjectURL(viewer.url); }, [viewer.url]);

  const statuses = useMemo(() => Array.from(new Set(purchases.map(item => item.Estatus).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')), [purchases]);
  const activeCount = [filters.dateRange?.from, filters.origin, filters.supplier.trim(), filters.status].filter(Boolean).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const supplier = filters.supplier.trim().toLowerCase();
    const from = dayKey(filters.dateRange?.from);
    const to = dayKey(filters.dateRange?.to || filters.dateRange?.from);
    return purchases.filter(item => {
      const quick = !query || [item.Folio, item.Proveedor, item.ProveedorRFC, item.FolioFactura, item.UUIDFiscal, item.OrigenCaptura]
        .some(value => String(value || '').toLowerCase().includes(query));
      const itemDay = dayKey(item.Fecha);
      return quick &&
        (!from || (itemDay !== null && itemDay >= from && itemDay <= to)) &&
        (!filters.origin || item.OrigenCaptura === filters.origin) &&
        (!supplier || String(item.Proveedor || '').toLowerCase().includes(supplier)) &&
        (!filters.status || item.Estatus === filters.status);
    });
  }, [purchases, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(() => setPage(1), [search, filters]);

  const summary = useMemo(() => ({
    total: purchases.reduce((sum, item) => sum + Number(item.Total || 0), 0),
    records: purchases.length,
    xml: purchases.filter(item => item.OrigenCaptura === 'XML').length,
    manual: purchases.filter(item => item.OrigenCaptura !== 'XML').length,
  }), [purchases]);

  const openFilters = () => {
    const initial = filters.dateRange?.from || new Date();
    setDraft({ ...filters, dateRange: filters.dateRange ? { ...filters.dateRange } : undefined });
    setCalendarMonth(initial);
    setYearPageStart(Math.floor(initial.getFullYear() / 12) * 12);
    setCalendarView('days');
    setFiltersOpen(true);
  };

  const moveCalendar = amount => {
    if (calendarView === 'years') return setYearPageStart(value => value + amount * 12);
    setCalendarMonth(value => calendarView === 'months'
      ? new Date(value.getFullYear() + amount, value.getMonth(), 1)
      : new Date(value.getFullYear(), value.getMonth() + amount, 1));
  };

  const applyFilters = () => {
    if (!draft.dateRange?.from && !draft.origin && !draft.supplier.trim() && !draft.status) {
      toast.warning('Selecciona al menos un filtro para realizar la búsqueda.');
      return;
    }
    setFilters({ ...draft, supplier: draft.supplier.trim() });
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setFiltersOpen(false);
  };

  const openReport = async item => {
    setOpeningReport(item.PedidoGuid);
    try {
      const output = await generarReporteCompra(item.PedidoGuid);
      const bytes = Uint8Array.from(atob(output.DataBase64 || output.dataBase64), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      if (viewer.url) URL.revokeObjectURL(viewer.url);
      setViewer({ open: true, url, fileName: output.FileName || output.fileName || 'reporte-compra.pdf' });
    } catch (err) {
      toast.error(`No se pudo generar el reporte: ${err?.message || err}`);
    } finally {
      setOpeningReport('');
    }
  };

  const cards = [
    { label: 'Valor registrado', value: money(summary.total), detail: 'Total histórico de compras', icon: CircleDollarSign, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Compras', value: summary.records, detail: 'Operaciones registradas', icon: ShoppingCart, color: 'text-violet-600', bg: 'bg-violet-500/10' },
    { label: 'Carga XML', value: summary.xml, detail: 'Capturas automatizadas', icon: UploadCloud, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Captura manual', value: summary.manual, detail: 'Capturas realizadas manualmente', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-[radial-gradient(circle_at_55%_0%,rgba(92,155,255,.14),transparent_42%),#f7faff] text-foreground dark:bg-[radial-gradient(circle_at_55%_0%,rgba(30,89,180,.18),transparent_42%),#07111f]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-hidden p-5 lg:p-6">
        <div className="shrink-0">
          <nav className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><button onClick={() => navigate('/home')} className="hover:text-primary">Home</button><span>/</span><span className="text-foreground">Historial de compras</span></nav>
          <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600"><ShoppingCart className="size-6" /></div><div><h1 className="text-xl font-bold tracking-[-.025em]">Historial de compras</h1><p className="mt-0.5 text-xs text-muted-foreground">Consulta compras manuales y documentos cargados mediante XML.</p></div></div>
            <div className="flex items-center gap-2"><Button variant="outline" onClick={() => navigate('/home')}><ArrowLeft className="size-4" />Volver</Button><Button onClick={() => navigate('/purchases')}><Plus className="size-4" />Nueva compra</Button></div>
          </header>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(card => <div key={card.label} className="flex min-h-[92px] items-center gap-3.5 rounded-2xl border border-white/70 bg-white/65 p-4 shadow-[0_12px_32px_-27px_rgba(30,64,120,.42)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.045]"><div className={cn('flex size-11 items-center justify-center rounded-xl', card.bg)}><card.icon className={cn('size-5', card.color)} /></div><div><p className="text-[11px] font-semibold text-muted-foreground">{card.label}</p><p className="mt-0.5 text-xl font-bold">{card.value}</p><p className="text-[10px] text-muted-foreground/75">{card.detail}</p></div></div>)}</div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div><p className="text-sm font-semibold">Compras registradas</p><p className="text-[10px] text-muted-foreground">{filtered.length} resultado{filtered.length === 1 ? '' : 's'}</p></div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2"><div className="relative w-full max-w-md"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar folio, proveedor, RFC o UUID…" className="h-10 w-full rounded-full border border-border/70 bg-background/75 pl-10 pr-4 text-sm outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/10" /></div><button onClick={openFilters} className={cn('flex h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition', activeCount ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/70 bg-background/75 text-muted-foreground hover:text-primary')}><SlidersHorizontal className="size-4" /><span className="hidden xl:inline">Búsqueda avanzada</span>{activeCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">{activeCount}</span>}</button><button onClick={load} className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-background/75 text-muted-foreground hover:text-primary"><RefreshCw className={cn('size-4', loading && 'animate-spin')} /></button></div>
          </div>

          {error ? <div className="flex flex-1 flex-col items-center justify-center gap-3"><p className="text-sm font-semibold">No se pudo cargar el historial</p><p className="text-xs text-muted-foreground">{error}</p><Button onClick={load}>Reintentar</Button></div> : loading ? <div className="flex flex-1 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div> : <><div className="flex-1 overflow-auto"><table className="w-full text-sm"><thead><tr className="sticky top-0 border-b border-border/70 bg-slate-50/95 dark:bg-white/[.055]">{['Folio', 'Fecha', 'Proveedor', 'Factura proveedor', 'Captura', 'Total', 'Estado', 'Acciones'].map(header => <th key={header} className="whitespace-nowrap px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">{header}</th>)}</tr></thead><tbody className="divide-y divide-border/65">{pageItems.length === 0 ? <tr><td colSpan={8} className="py-16 text-center text-sm text-muted-foreground">No se encontraron compras.</td></tr> : pageItems.map(item => { const stamp = formatDate(item.Fecha); const isXML = item.OrigenCaptura === 'XML'; return <tr key={item.ID} className="hover:bg-blue-50/40 dark:hover:bg-white/[.035]"><td className="px-5 py-3.5 text-xs font-bold text-primary">{String(item.Folio || '').padStart(6, '0')}</td><td className="px-5 py-3.5"><p className="text-xs font-medium">{stamp.date}</p><p className="text-[10px] text-muted-foreground">{stamp.time}</p></td><td className="px-5 py-3.5"><div className="flex min-w-[230px] items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{initials(item.Proveedor)}</div><div className="min-w-0"><p className="max-w-[260px] truncate text-xs font-semibold">{item.Proveedor}</p><p className="text-[10px] text-muted-foreground">RFC: {item.ProveedorRFC || '—'}</p></div></div></td><td className="px-5 py-3.5"><p className="text-xs font-semibold">{item.FolioFactura || 'Sin folio'}</p>{item.UUIDFiscal && <p className="max-w-[180px] truncate text-[9px] text-muted-foreground" title={item.UUIDFiscal}>{item.UUIDFiscal}</p>}</td><td className="px-5 py-3.5"><span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold', isXML ? 'border-blue-500/20 bg-blue-500/10 text-blue-600' : 'border-amber-500/20 bg-amber-500/10 text-amber-700')}>{isXML ? <UploadCloud className="size-3" /> : <FileText className="size-3" />}{isXML ? 'XML' : 'Manual'}</span></td><td className="whitespace-nowrap px-5 py-3.5 text-xs font-bold">{money(item.Total, item.Moneda || 'MXN')}</td><td className="px-5 py-3.5"><span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600">{item.Estatus || '—'}</span></td><td className="px-5 py-3.5"><button onClick={() => openReport(item)} disabled={openingReport === item.PedidoGuid} className="flex size-9 items-center justify-center rounded-full text-primary transition hover:bg-primary/10" title="Visualizar reporte">{openingReport === item.PedidoGuid ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}</button></td></tr>; })}</tbody></table></div><div className="flex items-center justify-between border-t border-border/70 px-5 py-3"><p className="text-xs text-muted-foreground">{filtered.length ? `Mostrando ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length}` : 'Sin resultados'}</p><div className="flex items-center gap-1"><button disabled={safePage === 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="flex size-8 items-center justify-center rounded-lg border disabled:opacity-40"><ChevronLeft className="size-4" /></button><span className="min-w-16 text-center text-xs font-semibold">{safePage} / {totalPages}</span><button disabled={safePage === totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} className="flex size-8 items-center justify-center rounded-lg border disabled:opacity-40"><ChevronRight className="size-4" /></button></div></div></>}
        </div>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}><DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-[760px]"><DialogHeader className="border-b px-6 py-5 text-left"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><SlidersHorizontal className="size-5" /></div><div><DialogTitle>Búsqueda avanzada</DialogTitle><DialogDescription>Combina uno o varios criterios para localizar compras.</DialogDescription></div></div></DialogHeader><div className="grid gap-6 px-6 py-5 md:grid-cols-[330px_1fr]"><div><div className="mb-3 flex items-center justify-between"><label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.06em] text-muted-foreground"><CalendarDays className="size-4 text-primary" />Rango de fechas</label>{draft.dateRange?.from && <button onClick={() => setDraft(value => ({ ...value, dateRange: undefined }))} className="text-[11px] font-semibold text-primary">Limpiar fechas</button>}</div><div className="rounded-2xl border bg-muted/20 p-1"><div className="flex h-10 items-center justify-between px-2 pt-1"><button onClick={() => moveCalendar(-1)} className="flex size-8 items-center justify-center rounded-lg hover:bg-background"><ChevronLeft className="size-4" /></button>{calendarView === 'days' && <button onClick={() => setCalendarView('months')} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-background">{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</button>}{calendarView === 'months' && <button onClick={() => { setYearPageStart(Math.floor(calendarMonth.getFullYear() / 12) * 12); setCalendarView('years'); }} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-background">{calendarMonth.getFullYear()}</button>}{calendarView === 'years' && <span className="text-sm font-semibold">{yearPageStart} — {yearPageStart + 11}</span>}<button onClick={() => moveCalendar(1)} className="flex size-8 items-center justify-center rounded-lg hover:bg-background"><ChevronRight className="size-4" /></button></div>{calendarView === 'days' && <Calendar mode="range" locale={es} month={calendarMonth} onMonthChange={setCalendarMonth} hideNavigation selected={draft.dateRange} onSelect={dateRange => setDraft(value => ({ ...value, dateRange }))} className="w-full px-3 pb-3 pt-0" classNames={{ months: 'w-full', month: 'w-full', month_grid: 'w-full table-fixed border-collapse', month_caption: 'hidden', weekday: 'h-8 w-auto p-0 text-center text-xs font-medium text-muted-foreground/80', day: 'group h-9 w-auto px-0 py-px text-center text-sm', range_middle: 'range-middle [&>button]:!bg-blue-100 [&>button]:!text-blue-800 dark:[&>button]:!bg-blue-400/20 dark:[&>button]:!text-blue-200' }} />}{calendarView === 'months' && <div className="grid grid-cols-3 gap-2 p-3">{MONTH_NAMES.map((month, index) => <button key={month} onClick={() => { setCalendarMonth(value => new Date(value.getFullYear(), index, 1)); setCalendarView('days'); }} className={cn('h-10 rounded-xl text-xs font-semibold hover:bg-primary/10', index === calendarMonth.getMonth() && 'bg-primary text-white')}>{month.slice(0, 3)}</button>)}</div>}{calendarView === 'years' && <div className="grid grid-cols-3 gap-2 p-3">{Array.from({ length: 12 }, (_, index) => yearPageStart + index).map(year => <button key={year} onClick={() => { setCalendarMonth(value => new Date(year, value.getMonth(), 1)); setCalendarView('months'); }} className={cn('h-10 rounded-xl text-xs font-semibold hover:bg-primary/10', year === calendarMonth.getFullYear() && 'bg-primary text-white')}>{year}</button>)}</div>}</div><p className="mt-2 text-center text-[11px] text-muted-foreground">{draft.dateRange?.from ? `${formatFilterDate(draft.dateRange.from)}${draft.dateRange.to ? ` — ${formatFilterDate(draft.dateRange.to)}` : ''}` : 'Selecciona una fecha inicial y una final'}</p></div><div className="space-y-4"><div className="space-y-2"><label className="text-xs font-semibold">Tipo de captura</label><select value={draft.origin} onChange={event => setDraft(value => ({ ...value, origin: event.target.value }))} className="h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="">Todos</option><option value="MANUAL">Manual</option><option value="XML">XML</option></select></div><div className="space-y-2"><label className="text-xs font-semibold">Nombre del proveedor</label><input value={draft.supplier} onChange={event => setDraft(value => ({ ...value, supplier: event.target.value }))} placeholder="Escribe el nombre o razón social" className="h-11 w-full rounded-xl border bg-background px-3 text-sm" /></div><div className="space-y-2"><label className="text-xs font-semibold">Estatus de la compra</label><select value={draft.status} onChange={event => setDraft(value => ({ ...value, status: event.target.value }))} className="h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="">Todos los estatus</option>{statuses.map(status => <option key={status}>{status}</option>)}</select></div><div className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-4 py-3 text-xs text-muted-foreground">Selecciona al menos un criterio. Los campos pueden combinarse y ninguno es obligatorio individualmente.</div></div></div><DialogFooter className="border-t bg-muted/20 px-6 py-4 sm:justify-between"><Button variant="ghost" onClick={clearFilters}>Limpiar filtros</Button><div className="flex gap-2"><Button variant="outline" onClick={() => setFiltersOpen(false)}>Cancelar</Button><Button onClick={applyFilters}><Search className="size-4" />Buscar</Button></div></DialogFooter></DialogContent></Dialog>

      <Dialog open={viewer.open} onOpenChange={open => setViewer(value => ({ ...value, open }))}><DialogContent className="flex h-[94vh] w-[min(1180px,97vw)] max-w-none flex-col overflow-hidden rounded-2xl p-0"><DialogHeader className="border-b px-6 py-4 text-left"><DialogTitle>Reporte de compra</DialogTitle><DialogDescription>{viewer.fileName}</DialogDescription></DialogHeader>{viewer.url && <iframe title={viewer.fileName} src={viewer.url} className="min-h-0 w-full flex-1 bg-zinc-100" />}</DialogContent></Dialog>
    </div>
  );
}
