import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Box,
  FileSpreadsheet,
  Layers,
  Package,
  PlayCircle,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ScrollText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PdfViewer } from '@/components/common/pdf-viewer';
import { useActivation } from '@/providers/ActivationProvider';
import { ReportDateRangePicker } from '../components/ReportDateRangePicker';
import { useReportsService } from '../useReportsService';

const read = (source, ...keys) => {
  if (!source) return undefined;
  for (const k of keys) {
    if (source[k] !== undefined && source[k] !== null) return source[k];
  }
  return undefined;
};

const qty = (value) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 });
const localDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatDate = (value) => (value ? value.split('-').reverse().join('/') : '—');

function fileURL(output) {
  const base64 = read(output, 'PDFBase64', 'pdfBase64');
  if (!base64) return '';
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

function KardexFilterDialog({ open, onOpenChange, from, to, product, onApply, searchProducts, loading }) {
  const [range, setRange] = useState({ from, to });
  const [selected, setSelected] = useState(product);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setRange({ from, to });
      setSelected(product);
      setQuery('');
      searchProducts('').then(setOptions).catch(() => setOptions([]));
    }
  }, [open, from, to, product, searchProducts]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setOptions(await searchProducts(query));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open, searchProducts]);

  const selectedNivelId = read(selected, 'NivelID', 'nivelID', 'nivelId', 'nivel_id', 'id');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal className="size-5" />
            </span>
            <span>
              <span className="block text-lg">Configurar kárdex</span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Selecciona la presentación y el periodo que deseas rastrear.
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 p-6 lg:grid-cols-[1.05fr_.95fr]">
          <ReportDateRangePicker from={range.from} to={range.to} onChange={setRange} />
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Producto y empaque
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nivel ID, código o descripción"
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>

            {selected && (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-primary">
                    {read(selected, 'Producto', 'producto')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {read(selected, 'Codigo', 'codigo')} · {read(selected, 'Empaque', 'empaque')}
                  </p>
                </div>
                <span className="ml-3 shrink-0 rounded-lg bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">
                  Nivel {selectedNivelId}
                </span>
              </div>
            )}

            <div className="mt-2 max-h-[220px] space-y-1 overflow-y-auto rounded-xl border border-border p-1.5">
              {searching ? (
                <p className="p-4 text-center text-xs text-muted-foreground">Buscando…</p>
              ) : (
                options.map((option) => {
                  const id = read(option, 'NivelID', 'nivelID', 'nivelId', 'nivel_id', 'id');
                  const active = Number(selectedNivelId) === Number(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelected(option)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                        active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <span className="grid min-w-12 shrink-0 place-items-center rounded-lg bg-background px-2 py-1.5 text-center shadow-sm">
                        <span className="font-mono text-[9px] text-muted-foreground">Nivel {id}</span>
                        <span className="font-mono text-[10px] font-semibold">
                          {read(option, 'Codigo', 'codigo') || '—'}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">
                          {read(option, 'Producto', 'producto')}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {read(option, 'Empaque', 'empaque')}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
              {!searching && !options.length && (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  No se encontraron niveles con ese criterio.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl border border-border px-4 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            disabled={loading || !selected}
            onClick={() => onApply({ ...range, product: selected })}
            className="h-10 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? 'Generando…' : 'Consultar kárdex'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function KardexReportPage() {
  const navigate = useNavigate();
  const { store } = useActivation();
  const branchID = store?.ID ?? store?.id ?? 0;
  const service = useReportsService();
  const searchProducts = useCallback((query) => service.buscarProductosKardex(query), [service]);
  const today = localDate(new Date());
  const monthStart = localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [product, setProduct] = useState(null);
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [viewer, setViewer] = useState({ open: false, url: '', fileName: '' });

  const report = read(output, 'Report', 'report');
  const rows = read(report, 'Movimientos', 'movimientos') || [];
  const summary = read(report, 'Resumen', 'resumen') || [];
  const productInfo = read(report, 'Producto', 'producto') || product;

  useEffect(() => () => {
    if (viewer.url) URL.revokeObjectURL(viewer.url);
  }, [viewer.url]);

  const generate = async ({ from: nextFrom, to: nextTo, product: nextProduct }) => {
    if (!nextProduct) return toast.warning('Selecciona un producto.');
    const nivelId = Number(read(nextProduct, 'NivelID', 'nivelID', 'nivelId', 'nivel_id', 'id') || 0);
    if (!nivelId) return toast.warning('El producto seleccionado no tiene un nivel de empaque válido.');

    setLoading(true);
    try {
      const result = await service.generarKardex({
        NivelID: nivelId,
        SucursalID: Number(branchID),
        FechaInicio: nextFrom,
        FechaFin: nextTo,
      });
      setFrom(nextFrom);
      setTo(nextTo);
      setProduct(nextProduct);
      setOutput(result);
      setFiltersOpen(false);
    } catch (error) {
      toast.error(error?.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      await service.actualizarStockDiario(branchID);
      if (product) await generate({ from, to, product });
      toast.success('Movimiento diario actualizado.');
    } catch (error) {
      toast.error(error?.message || String(error));
      setLoading(false);
    }
  };

  const openPDF = () => {
    const url = fileURL(output);
    if (!url) return;
    setViewer({ open: true, url, fileName: read(output, 'FileName', 'fileName') || 'kardex.pdf' });
  };

  const exportCSV = () => {
    if (!rows.length && !summary.length) {
      return toast.info('No hay movimientos registrados para exportar.');
    }
    const headers = ['Fecha', 'Tipo', 'Documento', 'Nota', 'Entrada', 'Salida', 'Existencia'];
    const csvLines = [
      headers.join(','),
      ...rows.map((r) => [
        `"${new Date(read(r, 'Fecha', 'fecha')).toLocaleString('es-MX')}"`,
        `"${read(r, 'Tipo', 'tipo')}"`,
        `"${read(r, 'Documento', 'documento')}"`,
        `"${(read(r, 'Nota', 'nota') || '').replace(/"/g, '""')}"`,
        read(r, 'Entrada', 'entrada') || 0,
        read(r, 'Salida', 'salida') || 0,
        read(r, 'Existencia', 'existencia') || 0,
      ].join(',')),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const code = read(productInfo, 'Codigo', 'codigo') || 'producto';
    a.href = url;
    a.download = `kardex-${code}-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo CSV descargado con éxito.');
  };

  // Métricas calculadas para las tarjetas
  const saldoInicial = Number(read(report, 'SaldoInicial', 'saldoInicial') || 0);
  const entradas = Number(read(report, 'Entradas', 'entradas') || 0);
  const salidas = Number(read(report, 'Salidas', 'salidas') || 0);
  const saldoFinal = Number(read(report, 'SaldoFinal', 'saldoFinal') || 0);

  const entradasCount = rows.filter((r) => Number(read(r, 'Entrada', 'entrada')) > 0).length;
  const salidasCount = rows.filter((r) => Number(read(r, 'Salida', 'salida')) > 0).length;

  const maxCapacidad = Math.max(saldoInicial + entradas, saldoFinal, 1);
  const progressRatio = Math.min(Math.max((saldoFinal / maxCapacidad) * 100, 4), 100);

  const nivelId = read(productInfo, 'NivelID', 'nivelID', 'nivelId', 'nivel_id', 'id') ?? 0;
  const empaqueText = read(productInfo, 'Empaque', 'empaque') || 'PIEZA';
  const codigoText = read(productInfo, 'Codigo', 'codigo') || '—';
  const productoText = read(productInfo, 'Producto', 'producto') || 'Producto sin descripción';

  // Determinación de estado de stock para badge
  const stockBadge = (() => {
    if (saldoFinal <= 0) {
      return {
        label: 'Agotado',
        className: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
        dot: 'bg-rose-500',
      };
    }
    if (saldoFinal < 10) {
      return {
        label: 'Nivel Bajo',
        className: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
        dot: 'bg-amber-500',
      };
    }
    return {
      label: 'Existencia Óptima',
      className: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
      dot: 'bg-emerald-500',
    };
  })();

  const getTipoBadgeClass = (tipo) => {
    const t = String(tipo || '').toUpperCase();
    if (t.includes('VENTA')) return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
    if (t.includes('COMPRA')) return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
    if (t.includes('TRANS')) return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
    if (t.includes('CONV')) return 'bg-purple-500/10 text-purple-600 border border-purple-500/20';
    if (t.includes('AJUST') || t.includes('AUD')) return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
    return 'bg-muted text-muted-foreground border border-border';
  };

  return (
    <div className="space-y-5 p-6 animate-fade-in">
      {/* ── TOP HEADER ── */}
      <header className="flex flex-col gap-4 rounded-[22px] border border-border/70 bg-card/80 backdrop-blur-md px-6 py-4.5 shadow-[0_12px_32px_-24px_rgba(28,70,133,0.18)] sm:flex-row sm:items-center dark:border-white/10 dark:bg-card/40">
        <button
          onClick={() => navigate(-1)}
          aria-label="Regresar"
          className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/15">
            <Layers className="size-6" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-foreground">
                Kárdex Cronológico
              </h1>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-primary">
                POS INVENTORY V2.4
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Auditoría en tiempo real & Saldo Rodante · Periodo: {formatDate(from)} al {formatDate(to)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/80 bg-background px-3.5 text-xs font-semibold text-foreground shadow-xs transition hover:bg-muted"
          >
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <span>Filtros</span>
          </button>

          <button
            disabled={loading}
            onClick={refresh}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/80 bg-background px-3.5 text-xs font-semibold text-foreground shadow-xs transition hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`size-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            disabled={!report}
            onClick={exportCSV}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/80 bg-background px-3.5 text-xs font-semibold text-foreground shadow-xs transition hover:bg-muted disabled:opacity-40"
          >
            <FileSpreadsheet className="size-4 text-muted-foreground" />
            <span>CSV</span>
          </button>

          <button
            disabled={!report}
            onClick={openPDF}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-40"
          >
            <Printer className="size-4" />
            <span>Imprimir Kárdex</span>
          </button>
        </div>
      </header>

      {report ? (
        <>
          {/* ── KPI & PRODUCT ROW (Aspecto Visual Inspirado en el Mockup) ── */}
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {/* 1. Tarjeta Principal del Producto (ocupa 2 columnas de 6) */}
            <div className="flex flex-col justify-between rounded-[22px] border border-border/70 bg-card p-4.5 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.06)] sm:col-span-2 md:col-span-2 lg:col-span-2 dark:border-white/10">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                    {empaqueText} · NIVEL {nivelId}
                  </span>
                  <span className="grid size-10 place-items-center rounded-2xl border border-border/60 bg-muted/40 text-primary shadow-xs">
                    <Package className="size-5" />
                  </span>
                </div>

                <h2 className="mt-2.5 line-clamp-2 text-lg font-extrabold tracking-tight text-foreground">
                  {productoText}
                </h2>

                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      SKU / Código
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs font-extrabold text-foreground">
                      {codigoText}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Presentación
                    </p>
                    <p className="mt-0.5 truncate text-xs font-extrabold text-foreground">
                      {empaqueText} (Nvl {nivelId})
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4.5 border-t border-border/50 pt-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Capacidad de Almacén
                  </span>
                  <span className="font-mono text-[11px] font-extrabold text-foreground">
                    Stock: {qty(saldoFinal)} / Máx: {qty(maxCapacidad)}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary/15">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${progressRatio}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Inicial: {qty(saldoInicial)}</span>
                  <span>Balance: {saldoFinal >= saldoInicial ? `+${qty(saldoFinal - saldoInicial)}` : qty(saldoFinal - saldoInicial)}</span>
                  <span>Final: {qty(saldoFinal)}</span>
                </div>
              </div>
            </div>

            {/* 2. Tarjeta: Stock Inicial (ocupa 1 columna de 6) */}
            <div className="flex flex-col justify-between rounded-[22px] border border-border/70 bg-card p-4.5 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.06)] sm:col-span-1 md:col-span-1 lg:col-span-1 dark:border-white/10">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Stock Inicial
                </span>
                <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-muted/60 text-muted-foreground">
                  <PlayCircle className="size-4" />
                </span>
              </div>
              <div className="my-2.5">
                <p className="font-mono text-2xl xl:text-3xl font-extrabold text-foreground">
                  {qty(saldoInicial)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Al inicio del rango</p>
              </div>
              <div>
                <span className="inline-block rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Arrastre previo
                </span>
              </div>
            </div>

            {/* 3. Tarjeta: Total Entradas (ocupa 1 columna de 6) */}
            <div className="flex flex-col justify-between rounded-[22px] border border-emerald-500/20 bg-card p-4.5 shadow-[0_4px_24px_-12px_rgba(16,185,129,0.08)] sm:col-span-1 md:col-span-1 lg:col-span-1 dark:border-emerald-500/20">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Total Entradas
                </span>
                <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <ArrowDownLeft className="size-4" />
                </span>
              </div>
              <div className="my-2.5">
                <p className="font-mono text-2xl xl:text-3xl font-extrabold text-emerald-600">
                  +{qty(entradas)}
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-600/80">Compras + Trans. Ent.</p>
              </div>
              <div>
                <span className="inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  {entradasCount} Movimientos
                </span>
              </div>
            </div>

            {/* 4. Tarjeta: Total Salidas (ocupa 1 columna de 6) */}
            <div className="flex flex-col justify-between rounded-[22px] border border-rose-500/20 bg-card p-4.5 shadow-[0_4px_24px_-12px_rgba(244,63,94,0.08)] sm:col-span-1 md:col-span-1 lg:col-span-1 dark:border-rose-500/20">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                  Total Salidas
                </span>
                <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600">
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
              <div className="my-2.5">
                <p className="font-mono text-2xl xl:text-3xl font-extrabold text-rose-600">
                  -{qty(salidas)}
                </p>
                <p className="mt-0.5 text-[11px] text-rose-600/80">Ventas + Bajas + Trans.</p>
              </div>
              <div>
                <span className="inline-block rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                  {salidasCount} Movimientos
                </span>
              </div>
            </div>

            {/* 5. Tarjeta: Stock Resultante (Hero Card) (ocupa 1 columna de 6) */}
            <div className="flex flex-col justify-between rounded-[22px] border border-primary/30 bg-primary/[0.035] p-4.5 shadow-[0_12px_32px_-16px_rgba(59,130,246,0.22)] sm:col-span-1 md:col-span-1 lg:col-span-1 dark:border-primary/40 dark:bg-primary/[0.07]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Stock Resultante
                </span>
                <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <Box className="size-4" />
                </span>
              </div>
              <div className="my-2.5">
                <p className="font-mono text-2xl xl:text-3xl font-extrabold text-primary">
                  {qty(saldoFinal)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Físico Disponible</p>
              </div>
              <div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${stockBadge.className}`}>
                  <span className={`size-1.5 rounded-full ${stockBadge.dot}`} />
                  {stockBadge.label}
                </span>
              </div>
            </div>
          </section>

          {/* ── TABLAS DE RESUMEN Y MOVIMIENTOS DETALLADOS ── */}
          <section className="overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-[0_4px_24px_-12px_rgba(0,0,0,0.06)] dark:border-white/10">
            {/* Header de sección de tablas */}
            <div className="flex flex-col gap-3 border-b border-border/60 px-6 py-4.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-extrabold tracking-tight text-foreground">
                  Trazabilidad de Movimientos & Auditoría
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Registro cronológico detallado de entradas, salidas y existencias calculadas.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
                  {rows.length} transacciones
                </span>
              </div>
            </div>

            {/* Resumen Diario Consolidado */}
            {summary.length > 0 && (
              <div className="border-b border-border/60">
                <div className="bg-muted/20 px-6 py-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Consolidado diario de existencias (movimiento_diario_stock)
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-muted/40 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-2.5">Fecha</th>
                        <th className="px-4 py-2.5 text-right">Inicial</th>
                        <th className="px-4 py-2.5 text-right text-emerald-600">Compras</th>
                        <th className="px-4 py-2.5 text-right text-rose-600">Ventas</th>
                        <th className="px-4 py-2.5 text-right">Trans. entrada</th>
                        <th className="px-4 py-2.5 text-right">Trans. salida</th>
                        <th className="px-4 py-2.5 text-right">Bajas</th>
                        <th className="px-4 py-2.5 text-right">Conversiones</th>
                        <th className="px-4 py-2.5 text-right">Ajustes</th>
                        <th className="px-5 py-2.5 text-right text-primary">Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono">
                      {summary.map((day, index) => (
                        <tr key={`${read(day, 'Fecha', 'fecha')}-${index}`} className="hover:bg-muted/20 transition">
                          <td className="px-5 py-2.5 font-sans font-semibold text-foreground">
                            {formatDate(read(day, 'Fecha', 'fecha'))}
                          </td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'InventarioInicial', 'inventarioInicial'))}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600">
                            {qty(read(day, 'Compras', 'compras'))}
                          </td>
                          <td className="px-4 py-2.5 text-right text-rose-600">
                            {qty(read(day, 'Ventas', 'ventas'))}
                          </td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'TransferenciasEntrada', 'transferenciasEntrada'))}</td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'TransferenciasSalida', 'transferenciasSalida'))}</td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'BajasMercancia', 'bajasMercancia'))}</td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'Conversiones', 'conversiones'))}</td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'AjustesAuditoria', 'ajustesAuditoria'))}</td>
                          <td className="px-5 py-2.5 text-right font-bold text-primary">
                            {qty(read(day, 'InventarioFinal', 'inventarioFinal'))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tabla de Detalle Cronológico */}
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="px-6 py-3">Fecha y hora</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Nota</th>
                    <th className="px-4 py-3 text-right">Entrada</th>
                    <th className="px-4 py-3 text-right">Salida</th>
                    <th className="px-6 py-3 text-right">Existencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {rows.map((row, index) => {
                    const tipo = read(row, 'Tipo', 'tipo');
                    const entradaVal = Number(read(row, 'Entrada', 'entrada') || 0);
                    const salidaVal = Number(read(row, 'Salida', 'salida') || 0);
                    return (
                      <tr key={`${read(row, 'Documento', 'documento')}-${index}`} className="hover:bg-muted/20 transition">
                        <td className="px-6 py-3 font-sans text-xs text-foreground">
                          {new Date(read(row, 'Fecha', 'fecha')).toLocaleString('es-MX')}
                        </td>
                        <td className="px-4 py-3 font-sans">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${getTipoBadgeClass(tipo)}`}>
                            {tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {read(row, 'Documento', 'documento')}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 font-sans text-xs text-muted-foreground">
                          {read(row, 'Nota', 'nota') || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-emerald-600">
                          {entradaVal > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <ArrowDownLeft className="size-3.5" />
                              +{qty(entradaVal)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-rose-600">
                          {salidaVal > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <ArrowUpRight className="size-3.5" />
                              -{qty(salidaVal)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right font-extrabold text-primary">
                          {qty(read(row, 'Existencia', 'existencia'))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!rows.length && (
                <div className="p-12 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">
                    No existen movimientos confirmados para este producto en el periodo seleccionado.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="grid min-h-80 place-items-center rounded-[24px] border border-dashed border-border/80 bg-card/50 p-8 text-center shadow-xs">
          <div className="max-w-md">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ScrollText className="size-7" />
            </span>
            <h2 className="mt-4 text-base font-extrabold tracking-tight text-foreground">
              Selecciona un producto y periodo
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Configura los filtros de búsqueda para consultar la auditoría completa, el consolidado diario y los saldos rodantes.
            </p>
            <button
              onClick={() => setFiltersOpen(true)}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
            >
              <SlidersHorizontal className="size-4" />
              Configurar kárdex
            </button>
          </div>
        </section>
      )}

      {/* Modal de filtros */}
      <KardexFilterDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        from={from}
        to={to}
        product={product}
        onApply={generate}
        searchProducts={searchProducts}
        loading={loading}
      />

      {/* Modal Visor PDF */}
      <Dialog open={viewer.open} onOpenChange={(open) => setViewer((v) => ({ ...v, open }))}>
        <DialogContent className="h-[92vh] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>Kardex del producto</DialogTitle>
          </DialogHeader>
          <PdfViewer
            fileUrl={viewer.url}
            fileName={viewer.fileName}
            className="h-[calc(92vh-72px)] rounded-none border-0"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
