import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { es } from 'date-fns/locale';
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Eye, FileText, Image as ImageIcon, Loader2, Plus, RefreshCw, Repeat2, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { RowActionButton, RowActionsMenu } from '@/components/common/row-actions-menu';
import { useTurno } from '@/providers/TurnoProvider';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePosService } from '@/features/pos/usePosService';

const CANCELLED_GUID = '86968037-975a-43ce-880c-043003010103';
const EMPTY_FILTERS = { dateRange: undefined, status: '' };
const MONTH_NAMES = Array.from({ length: 12 }, (_, month) => { const label = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(2026, month, 1)); return label.charAt(0).toUpperCase() + label.slice(1); });
const number = value => Number(value || 0);
const formatNumber = value => number(value).toLocaleString('es-MX', { maximumFractionDigits: 3 });
const formatFolio = value => String(value || 0).padStart(7, '0');
const imageUrl = path => path ? `${import.meta.env.VITE_CLOUD_API_URL || ''}${path}` : '';
const cleanError = error => String(error?.message || error || '').replace(/^Error:\s*/, '');
const toDate = value => { const parsed = value ? new Date(value) : null; return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null; };
const dayKey = value => { const date = value instanceof Date ? value : toDate(value); return date ? date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate() : null; };
const formatFilterDate = value => value?.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) || '';

export function ConversionsPage() {
  const navigate = useNavigate();
  const { turnoActivo } = useTurno();
  const { consultarConversiones, cancelarConversion, generarReporteConversion } = usePosService();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState('');
  const [detail, setDetail] = useState(null);
  const [cancelItem, setCancelItem] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draft, setDraft] = useState(filters);
  const [calendarView, setCalendarView] = useState('days');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [yearPageStart, setYearPageStart] = useState(() => Math.floor(new Date().getFullYear() / 12) * 12);
  const [viewer, setViewer] = useState({ open: false, url: '', fileName: '' });
  const [generating, setGenerating] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await consultarConversiones() || []); }
    catch (error) { setItems([]); toast.error(cleanError(error) || 'No fue posible consultar las conversiones.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (viewer.url) URL.revokeObjectURL(viewer.url); }, [viewer.url]);

  const jornadaID = turnoActivo?.OperacionSucursalID ?? turnoActivo?.operacionSucursalId ?? 0;
  const advanced = Boolean(filters.dateRange?.from || filters.status);
  const activeCount = [filters.dateRange?.from, filters.status].filter(Boolean).length;
  const statuses = useMemo(() => [...new Set(items.map(item => item.estatus).filter(Boolean))].sort(), [items]);
  const visible = useMemo(() => items.filter(item => {
    if (!advanced && number(item.operacionSucursalId) !== number(jornadaID)) return false;
    const itemDay = dayKey(item.fecha);
    const from = dayKey(filters.dateRange?.from);
    const to = dayKey(filters.dateRange?.to || filters.dateRange?.from);
    if (from && (!itemDay || itemDay < from || itemDay > to)) return false;
    if (filters.status && item.estatus !== filters.status) return false;
    const term = search.trim().toLocaleLowerCase('es-MX');
    return !term || [formatFolio(item.folio), item.productoOrigen, item.productoDestino, item.codigoOrigen, item.codigoDestino, item.estatus].some(value => String(value || '').toLocaleLowerCase('es-MX').includes(term));
  }), [advanced, filters, items, jornadaID, search]);

  const openFilters = () => {
    const initial = filters.dateRange?.from || new Date();
    setDraft({ ...filters, dateRange: filters.dateRange ? { ...filters.dateRange } : undefined });
    setCalendarMonth(initial); setYearPageStart(Math.floor(initial.getFullYear() / 12) * 12); setCalendarView('days'); setFiltersOpen(true);
  };
  const moveCalendar = amount => {
    if (calendarView === 'years') return setYearPageStart(value => value + amount * 12);
    setCalendarMonth(value => calendarView === 'months' ? new Date(value.getFullYear() + amount, value.getMonth(), 1) : new Date(value.getFullYear(), value.getMonth() + amount, 1));
  };
  const applyFilters = () => {
    if (!draft.dateRange?.from && !draft.status) { toast.warning('Selecciona al menos un filtro para realizar la búsqueda.'); return; }
    setFilters(draft); setFiltersOpen(false);
  };
  const clearFilters = () => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setFiltersOpen(false); };
  const openReport = async item => {
    setGenerating(item.pedidoGuid); setMenu('');
    try {
      const output = await generarReporteConversion(item.pedidoGuid);
      const bytes = Uint8Array.from(atob(output?.dataBase64 ?? output?.DataBase64 ?? ''), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      if (viewer.url) URL.revokeObjectURL(viewer.url);
      setViewer({ open: true, url, fileName: output?.fileName ?? output?.FileName ?? `conversion-${formatFolio(item.folio)}.pdf` });
    } catch (error) { toast.error(cleanError(error) || 'No fue posible generar el documento.'); }
    finally { setGenerating(''); }
  };
  const confirmCancel = async () => {
    if (!cancelItem) return;
    setCancelling(true);
    try { await cancelarConversion(cancelItem.pedidoGuid); toast.success(`Conversión ${formatFolio(cancelItem.folio)} cancelada.`); setCancelItem(null); await load(); }
    catch (error) { toast.error(cleanError(error) || 'No fue posible cancelar la conversión.'); }
    finally { setCancelling(false); }
  };

  return <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col gap-5 p-5 lg:p-6" onClick={() => menu && setMenu('')}>
    <nav className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><button onClick={() => navigate('/home')}>Home</button><span>/</span><span className="text-foreground">Conversiones</span></nav>
    <header className="flex flex-col justify-between gap-4 rounded-2xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] dark:border-white/10 dark:bg-white/[.04] sm:flex-row sm:items-center">
      <div className="flex items-center gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600"><Repeat2 className="size-6" /></div><div><h1 className="text-xl font-bold">Conversiones</h1><p className="mt-1 text-xs text-muted-foreground">Transforma existencias entre presentaciones mediante equivalencias configuradas.</p></div></div>
      <div className="flex gap-2"><button onClick={() => navigate('/home')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 px-4 text-xs font-semibold"><ArrowLeft className="size-4" /> Volver</button><button onClick={() => navigate('/conversions/new')} className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"><Plus className="size-4" /> Nueva conversión</button></div>
    </header>
    <section className="flex min-h-[430px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] dark:border-white/10 dark:bg-white/[.04]">
      <div className="flex flex-col justify-between gap-3 border-b border-border/70 px-5 py-4 md:flex-row md:items-center"><div><h2 className="text-sm font-semibold">Historial de conversiones</h2><p className="mt-1 text-[11px] text-muted-foreground">{advanced ? 'Resultados de la búsqueda avanzada.' : 'Conversiones realizadas durante la jornada actual.'}</p></div><div className="flex items-center gap-2"><div className="relative min-w-0 flex-1 md:w-[360px]"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar folio, producto o código…" className="h-10 w-full rounded-full border border-border/70 bg-background/75 pl-10 pr-4 text-sm outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/10" /></div><button onClick={openFilters} className={cn('flex h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition', activeCount ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/70 bg-background/75 text-muted-foreground hover:text-primary')}><SlidersHorizontal className="size-4" /><span className="hidden xl:inline">Búsqueda avanzada</span>{activeCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-white">{activeCount}</span>}</button><button onClick={load} className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-background/75 text-muted-foreground hover:text-primary"><RefreshCw className={cn('size-4', loading && 'animate-spin')} /></button></div></div>
      {loading ? <div className="flex flex-1 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div> : visible.length === 0 ? <Empty advanced={advanced} hasJourney={Boolean(jornadaID)} onNew={() => navigate('/conversions/new')} /> : <div className="overflow-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-muted/35 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3">Folio</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Producto origen</th><th className="px-4 py-3">Ruta de conversión</th><th className="px-4 py-3 text-center">Cantidades</th><th className="px-4 py-3">Estatus</th><th className="w-16 px-3 py-3 text-center">Acciones</th></tr></thead><tbody>{visible.map(item => <tr key={item.pedidoGuid} className="border-t border-border/60 hover:bg-primary/[.018]"><td className="px-5 py-4 text-sm font-bold text-primary">{formatFolio(item.folio)}</td><td className="px-4 py-4 text-xs text-muted-foreground">{toDate(item.fecha)?.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) || item.fecha}</td><td className="px-4 py-4"><p className="max-w-[260px] truncate text-xs font-semibold">{item.productoOrigen}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.codigoOrigen} · {item.empaqueOrigen}</p></td><td className="px-4 py-4"><div className="flex items-center gap-2 text-xs"><span className="max-w-[150px] truncate">{item.empaqueOrigen}</span><ArrowRight className="size-3.5 shrink-0 text-primary" /><span className="max-w-[150px] truncate font-semibold">{item.empaqueDestino}</span></div><p className="mt-1 text-[10px] text-muted-foreground">{item.codigoDestino} · {item.productoDestino}</p></td><td className="px-4 py-4 text-center text-xs tabular-nums"><span className="font-semibold">{formatNumber(item.cantidadOrigen)}</span><span className="px-2 text-muted-foreground">→</span><span className="font-bold text-primary">{formatNumber(item.cantidadDestino)}</span></td><td className="px-4 py-4"><StatusBadge status={item.estatus} /></td><td className="px-3 py-4" onClick={event => event.stopPropagation()}><RowActionsMenu open={menu === item.pedidoGuid} onToggle={() => setMenu(value => value === item.pedidoGuid ? '' : item.pedidoGuid)}><RowActionButton label="Ver conversión" icon={Eye} onClick={() => { setDetail(item); setMenu(''); }} /><RowActionButton label="Imprimir" icon={generating === item.pedidoGuid ? Loader2 : FileText} disabled={Boolean(generating)} onClick={() => openReport(item)} /><RowActionButton label="Cancelar conversión" icon={Trash2} disabled={item.estatusGuid === CANCELLED_GUID || item.estatus?.toLowerCase() === 'cancelado'} tone="text-red-500 hover:bg-red-500/10" onClick={() => { setCancelItem(item); setMenu(''); }} /></RowActionsMenu></td></tr>)}</tbody></table></div>}
    </section>
    <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}><DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-[760px]"><DialogHeader className="border-b px-6 py-5 text-left"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><SlidersHorizontal className="size-5" /></div><div><DialogTitle>Búsqueda avanzada</DialogTitle><DialogDescription>Combina uno o varios criterios para localizar conversiones.</DialogDescription></div></div></DialogHeader><div className="grid gap-6 px-6 py-5 md:grid-cols-[330px_1fr]"><div><div className="mb-3 flex items-center justify-between"><label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.06em] text-muted-foreground"><CalendarDays className="size-4 text-primary" />Rango de fechas</label>{draft.dateRange?.from && <button onClick={() => setDraft(value => ({ ...value, dateRange: undefined }))} className="text-[11px] font-semibold text-primary">Limpiar fechas</button>}</div><div className="rounded-2xl border bg-muted/20 p-1"><div className="flex h-10 items-center justify-between px-2 pt-1"><button onClick={() => moveCalendar(-1)} className="flex size-8 items-center justify-center rounded-lg hover:bg-background"><ChevronLeft className="size-4" /></button>{calendarView === 'days' && <button onClick={() => setCalendarView('months')} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-background">{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</button>}{calendarView === 'months' && <button onClick={() => { setYearPageStart(Math.floor(calendarMonth.getFullYear() / 12) * 12); setCalendarView('years'); }} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-background">{calendarMonth.getFullYear()}</button>}{calendarView === 'years' && <span className="text-sm font-semibold">{yearPageStart} — {yearPageStart + 11}</span>}<button onClick={() => moveCalendar(1)} className="flex size-8 items-center justify-center rounded-lg hover:bg-background"><ChevronRight className="size-4" /></button></div>{calendarView === 'days' && <Calendar mode="range" locale={es} month={calendarMonth} onMonthChange={setCalendarMonth} hideNavigation selected={draft.dateRange} onSelect={dateRange => setDraft(value => ({ ...value, dateRange }))} className="w-full px-3 pb-3 pt-0" classNames={{ months: 'w-full', month: 'w-full', month_grid: 'w-full table-fixed border-collapse', month_caption: 'hidden', weekday: 'h-8 w-auto p-0 text-center text-xs font-medium text-muted-foreground/80', day: 'group h-9 w-auto px-0 py-px text-center text-sm', range_middle: 'range-middle [&>button]:!bg-blue-100 [&>button]:!text-blue-800 dark:[&>button]:!bg-blue-400/20 dark:[&>button]:!text-blue-200' }} />}{calendarView === 'months' && <div className="grid grid-cols-3 gap-2 p-3">{MONTH_NAMES.map((month, index) => <button key={month} onClick={() => { setCalendarMonth(value => new Date(value.getFullYear(), index, 1)); setCalendarView('days'); }} className={cn('h-10 rounded-xl text-xs font-semibold hover:bg-primary/10', index === calendarMonth.getMonth() && 'bg-primary text-white')}>{month.slice(0, 3)}</button>)}</div>}{calendarView === 'years' && <div className="grid grid-cols-3 gap-2 p-3">{Array.from({ length: 12 }, (_, index) => yearPageStart + index).map(year => <button key={year} onClick={() => { setCalendarMonth(value => new Date(year, value.getMonth(), 1)); setCalendarView('months'); }} className={cn('h-10 rounded-xl text-xs font-semibold hover:bg-primary/10', year === calendarMonth.getFullYear() && 'bg-primary text-white')}>{year}</button>)}</div>}</div><p className="mt-2 text-center text-[11px] text-muted-foreground">{draft.dateRange?.from ? `${formatFilterDate(draft.dateRange.from)}${draft.dateRange.to ? ` — ${formatFilterDate(draft.dateRange.to)}` : ''}` : 'Selecciona una fecha inicial y una final'}</p></div><div className="space-y-4"><div className="space-y-2"><label className="text-xs font-semibold">Estatus de la conversión</label><select value={draft.status} onChange={event => setDraft(value => ({ ...value, status: event.target.value }))} className="h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="">Todos los estatus</option>{statuses.map(status => <option key={status}>{status}</option>)}</select></div><div className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-4 py-3 text-xs text-muted-foreground">Selecciona al menos un criterio. Los campos pueden combinarse y ninguno es obligatorio individualmente.</div></div></div><DialogFooter className="border-t bg-muted/20 px-6 py-4 sm:justify-between"><Button variant="ghost" onClick={clearFilters}>Limpiar filtros</Button><div className="flex gap-2"><Button variant="outline" onClick={() => setFiltersOpen(false)}>Cancelar</Button><Button onClick={applyFilters}><Search className="size-4" />Buscar</Button></div></DialogFooter></DialogContent></Dialog>
    {detail && <Modal onClose={() => setDetail(null)} max="max-w-2xl"><Detail item={detail} onClose={() => setDetail(null)} /></Modal>}
    {cancelItem && <Modal onClose={() => !cancelling && setCancelItem(null)} max="max-w-md"><div className="p-6"><div className="flex size-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-500"><Trash2 className="size-5" /></div><h2 className="mt-4 text-lg font-bold">Cancelar conversión</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Se reintegrarán {formatNumber(cancelItem.cantidadOrigen)} unidades al producto origen y se retirarán {formatNumber(cancelItem.cantidadDestino)} del producto destino. La operación solo continuará si existe inventario destino suficiente.</p><div className="mt-6 flex justify-end gap-2"><button disabled={cancelling} onClick={() => setCancelItem(null)} className="h-10 rounded-xl border px-4 text-xs font-semibold">Volver</button><button disabled={cancelling} onClick={confirmCancel} className="flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white">{cancelling && <Loader2 className="size-4 animate-spin" />} Confirmar cancelación</button></div></div></Modal>}
    {viewer.open && <Modal onClose={() => setViewer(value => ({ ...value, open: false }))} max="max-w-5xl"><div className="flex h-[82vh] flex-col"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="text-sm font-bold">Documento de conversión</h2><p className="mt-1 text-[11px] text-muted-foreground">{viewer.fileName}</p></div><Close onClick={() => setViewer(value => ({ ...value, open: false }))} /></div><iframe title="Documento de conversión" src={viewer.url} className="min-h-0 flex-1 bg-zinc-200" /></div></Modal>}
  </div>;
}

function StatusBadge({ status }) { const value = (status || '').toLowerCase(); const style = value === 'cancelado' ? 'bg-red-500/10 text-red-600' : value === 'completado' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-700'; return <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold ${style}`}>{status || 'Pendiente'}</span>; }
function Empty({ advanced, hasJourney, onNew }) { return <div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><div className="flex size-14 items-center justify-center rounded-2xl bg-primary/8 text-primary"><Repeat2 className="size-6" /></div><p className="mt-4 text-sm font-semibold">{advanced ? 'No encontramos conversiones' : hasJourney ? 'Aún no hay conversiones en esta jornada' : 'No existe una jornada activa'}</p><p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{advanced ? 'Modifica los criterios de búsqueda e inténtalo nuevamente.' : hasJourney ? 'Las conversiones registradas aparecerán aquí.' : 'Abre una jornada y un turno para comenzar a convertir productos.'}</p>{hasJourney && <button onClick={onNew} className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"><Plus className="size-4" /> Nueva conversión</button>}</div>; }
function Modal({ children, onClose, max }) { return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className={`w-full ${max} overflow-hidden rounded-3xl border border-white/60 bg-background shadow-2xl`}>{children}</div></div>; }
function Close({ onClick }) { return <button onClick={onClick} className="flex size-9 items-center justify-center rounded-full hover:bg-muted"><X className="size-4" /></button>; }
function Product({ image, name, code, packageName, quantity }) { return <div className="flex min-w-0 flex-col items-center text-center"><div className="flex size-24 items-center justify-center overflow-hidden rounded-2xl border bg-muted">{image ? <img src={imageUrl(image)} alt="" className="size-full object-cover" /> : <ImageIcon className="size-7 text-muted-foreground/45" />}</div><p className="mt-3 w-full truncate text-sm font-semibold">{name}</p><p className="mt-1 text-[11px] text-muted-foreground">{code} · {packageName}</p><p className="mt-2 text-base font-bold text-primary">{formatNumber(quantity)}</p></div>; }
function Detail({ item, onClose }) { return <><div className="flex items-start justify-between border-b px-6 py-5"><div><h2 className="text-lg font-bold">Conversión {formatFolio(item.folio)}</h2><p className="mt-1 text-xs text-muted-foreground">{toDate(item.fecha)?.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}</p></div><Close onClick={onClose} /></div><div className="p-6"><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-5 rounded-2xl border border-primary/15 bg-primary/[.025] p-5"><Product image={item.imagenOrigen} name={item.productoOrigen} code={item.codigoOrigen} packageName={item.empaqueOrigen} quantity={item.cantidadOrigen} /><div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><ArrowRight className="size-5" /></div><Product image={item.imagenDestino} name={item.productoDestino} code={item.codigoDestino} packageName={item.empaqueDestino} quantity={item.cantidadDestino} /></div><div className="mt-4 flex items-center justify-between rounded-xl bg-muted/45 px-4 py-3 text-xs"><span className="text-muted-foreground">Factor aplicado</span><span className="font-bold text-primary">× {formatNumber(item.factorConversion)}</span></div></div></>; }
