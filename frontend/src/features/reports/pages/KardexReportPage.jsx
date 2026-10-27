import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Barcode,
  Box,
  CalendarDays,
  Clock,
  Eye,
  FileSpreadsheet,
  GitCommitVertical,
  Image as ImageIcon,
  Layers,
  Package,
  PlayCircle,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ScrollText,
  ZoomIn,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PdfViewer } from '@/components/common/pdf-viewer';
import { useActivation } from '@/providers/ActivationProvider';
import { useCloudConfig } from '@/providers/CloudConfigProvider';
import { ReportDateRangePicker } from '../components/ReportDateRangePicker';
import { useReportsService } from '../useReportsService';

const read = (source, ...keys) => {
  if (!source) return undefined;
  for (const k of keys) {
    if (source[k] !== undefined && source[k] !== null) return source[k];
  }
  return undefined;
};

function KardexProductThumbnail({ src, alt, className = '', imgClassName = '', showZoom = false }) {
  const { getCloudAssetUrl } = useCloudConfig();
  const [hasError, setHasError] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const url = src ? getCloudAssetUrl(src) : '';
  const canDisplay = Boolean(url && !hasError);

  return (
    <>
      <div
        onClick={() => {
          if (showZoom && canDisplay) setZoomOpen(true);
        }}
        className={`group relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-muted/30 p-1.5 shadow-xs transition-all ${
          showZoom && canDisplay ? 'cursor-pointer hover:border-primary/40 hover:shadow-md' : ''
        } dark:border-white/10 dark:bg-muted/20 ${className}`}
        title={showZoom && canDisplay ? 'Ver imagen completa' : alt}
      >
        {canDisplay ? (
          <>
            <img
              src={url}
              alt={alt || 'Producto'}
              onError={() => setHasError(true)}
              className={`size-full object-contain transition-transform duration-300 group-hover:scale-105 ${imgClassName}`}
            />
            {showZoom && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                <ZoomIn className="size-4 text-white drop-shadow" />
              </span>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground/40">
            <Package className="size-8" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {showZoom && canDisplay && (
        <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
          <DialogContent className="max-w-md overflow-hidden p-6 text-center">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-base font-bold text-foreground truncate">
                {alt || 'Vista previa del producto'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-muted/20 p-4">
              <img
                src={url}
                alt={alt || 'Producto'}
                className="max-h-[360px] w-auto object-contain rounded-xl"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

const qty = (value) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 });
const localDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatDate = (value) => (value ? value.split('-').reverse().join('/') : '—');

const formatTimelineDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}`;
  } catch {
    return iso;
  }
};

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
                placeholder="Código, clave o descripción del producto"
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>

            {selected && (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <KardexProductThumbnail
                    src={read(selected, 'Imagen', 'imagen', 'imgReferencia', 'ImgReferencia')}
                    alt={read(selected, 'Producto', 'producto')}
                    className="size-10 rounded-xl"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-primary">
                      {read(selected, 'Producto', 'producto')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {read(selected, 'Codigo', 'codigo')} · {read(selected, 'Empaque', 'empaque')}
                    </p>
                  </div>
                </div>
                <span className="ml-3 shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                  {read(selected, 'Empaque', 'empaque') || 'Seleccionado'}
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
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                        active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <KardexProductThumbnail
                        src={read(option, 'Imagen', 'imagen', 'imgReferencia', 'ImgReferencia')}
                        alt={read(option, 'Producto', 'producto')}
                        className="size-10 rounded-lg"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">
                          {read(option, 'Producto', 'producto')}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {read(option, 'Codigo', 'codigo')} · {read(option, 'Empaque', 'empaque')}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
              {!searching && !options.length && (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  No se encontraron productos con ese criterio.
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
  const [activeTab, setActiveTab] = useState('consolidado'); // 'consolidado' | 'timeline'
  const [timelineFilter, setTimelineFilter] = useState('TODOS');
  const [detailModal, setDetailModal] = useState({ open: false, row: null });

  const report = read(output, 'Report', 'report');
  const rows = read(report, 'Movimientos', 'movimientos') || [];
  const summary = read(report, 'Resumen', 'resumen') || [];
  const productInfo = read(report, 'Producto', 'producto') || product;

  const filteredRows = rows.filter((r) => {
    if (timelineFilter === 'TODOS') return true;
    const t = String(read(r, 'Tipo', 'tipo') || '').toUpperCase();
    if (timelineFilter === 'VENTAS') return t.includes('VENTA');
    if (timelineFilter === 'COMPRAS') return t.includes('COMPRA');
    if (timelineFilter === 'TRANSFERENCIAS') return t.includes('TRANS');
    if (timelineFilter === 'BAJAS') return t.includes('BAJA') || t.includes('MERMA');
    return true;
  });

  const getTimelineIcon = (tipo) => {
    const t = String(tipo || '').toUpperCase();
    if (t.includes('TRANS')) {
      return {
        icon: <ArrowLeftRight className="size-4 text-blue-600" />,
        boxClass: 'border-blue-500/20 bg-blue-50/70 dark:bg-blue-950/40 text-blue-600',
        badgeClass: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
      };
    }
    if (t.includes('VENTA')) {
      return {
        icon: <ArrowUpRight className="size-4 text-rose-600" />,
        boxClass: 'border-rose-500/20 bg-rose-50/70 dark:bg-rose-950/40 text-rose-600',
        badgeClass: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
      };
    }
    if (t.includes('COMPRA')) {
      return {
        icon: <ArrowDownLeft className="size-4 text-emerald-600" />,
        boxClass: 'border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-600',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
      };
    }
    if (t.includes('CONV')) {
      return {
        icon: <ArrowLeftRight className="size-4 text-purple-600" />,
        boxClass: 'border-purple-500/20 bg-purple-50/70 dark:bg-purple-950/40 text-purple-600',
        badgeClass: 'bg-purple-500/10 text-purple-600 border border-purple-500/20',
      };
    }
    if (t.includes('BAJA') || t.includes('MERMA')) {
      return {
        icon: <ArrowUpRight className="size-4 text-orange-600" />,
        boxClass: 'border-orange-500/20 bg-orange-50/70 dark:bg-orange-950/40 text-orange-600',
        badgeClass: 'bg-orange-500/10 text-orange-600 border border-orange-500/20',
      };
    }
    return {
      icon: <SlidersHorizontal className="size-4 text-amber-600" />,
      boxClass: 'border-amber-500/20 bg-amber-50/70 dark:bg-amber-950/40 text-amber-600',
      badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    };
  };

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
  const rawImage = read(productInfo, 'Imagen', 'imagen', 'imgReferencia', 'ImgReferencia');

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
        label: 'Stock Bajo',
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
            <div>
              <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-foreground">
                Kárdex Cronológico
              </h1>
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
                <div className="flex items-start gap-3.5">
                  {/* Imagen integrada del producto con fallback y vista previa */}
                  <KardexProductThumbnail
                    src={rawImage}
                    alt={productoText}
                    showZoom={true}
                    className="size-20 sm:size-[84px] shrink-0"
                  />

                  {/* Información y Chips */}
                  <div className="min-w-0 flex-1">
                    <h2
                      className="line-clamp-2 text-base font-extrabold tracking-tight text-foreground sm:text-[17px] leading-snug"
                      title={productoText}
                    >
                      {productoText}
                    </h2>

                    {/* Chips de SKU y Presentación */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground dark:border-white/10">
                        <Barcode className="size-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SKU</span>
                        <span className="font-mono font-bold text-foreground">{codigoText}</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                        <Package className="size-3.5" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Presentación</span>
                        <span>{empaqueText}</span>
                      </span>
                    </div>
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

          {/* ── SECCIÓN DE TABLAS EN 2 PESTAÑAS: 1) CONSOLIDADO DIARIO (PRIMERO) | 2) LÍNEA DE TIEMPO ── */}
          <section className="overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-[0_4px_24px_-12px_rgba(0,0,0,0.06)] dark:border-white/10">
            {/* Header / Barra de Pestañas */}
            <div className="flex flex-col gap-4 border-b border-border/60 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              {/* Selector de Pestañas (Consolidado Diario es la primera pestaña) */}
              <div className="inline-flex rounded-2xl border border-border/60 bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('consolidado')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                    activeTab === 'consolidado'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CalendarDays className="size-4 text-primary" />
                  <span>Consolidado Diario</span>
                  {summary.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                      {summary.length} días
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                    activeTab === 'timeline'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <GitCommitVertical className="size-4 text-primary" />
                  <span>Línea de Tiempo</span>
                  {rows.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                      {rows.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Filtros de Tipo para la Línea de Tiempo (idénticos al diseño de referencia) */}
              {activeTab === 'timeline' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'TODOS', label: 'Ver Todos' },
                    { key: 'VENTAS', label: 'Ventas' },
                    { key: 'COMPRAS', label: 'Compras' },
                    { key: 'TRANSFERENCIAS', label: 'Transferencias' },
                    { key: 'BAJAS', label: 'Bajas / Mermas' },
                  ].map((f) => {
                    const isSelected = timelineFilter === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setTimelineFilter(f.key)}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'border border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'consolidado' && (
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
                    Período: {formatDate(from)} al {formatDate(to)}
                  </span>
                </div>
              )}
            </div>

            {/* ── TAB 1: CONSOLIDADO DIARIO (PRIMER TAB) ── */}
            {activeTab === 'consolidado' && (
              <div>
                <div className="flex items-center justify-between bg-muted/20 px-6 py-3 border-b border-border/40">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Tabla consolidada de existencias por día (movimiento_diario_stock)
                  </p>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {summary.length} registros diarios
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[520px]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                      <tr>
                        <th className="px-5 py-3">Fecha</th>
                        <th className="px-4 py-3 text-right">Inicial</th>
                        <th className="px-4 py-3 text-right text-emerald-600">Compras</th>
                        <th className="px-4 py-3 text-right text-rose-600">Ventas</th>
                        <th className="px-4 py-3 text-right">Trans. entrada</th>
                        <th className="px-4 py-3 text-right">Trans. salida</th>
                        <th className="px-4 py-3 text-right">Bajas</th>
                        <th className="px-4 py-3 text-right">Conversiones</th>
                        <th className="px-4 py-3 text-right">Ajustes</th>
                        <th className="px-5 py-3 text-right text-primary font-extrabold">Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono">
                      {summary.map((day, index) => (
                        <tr key={`${read(day, 'Fecha', 'fecha')}-${index}`} className="hover:bg-muted/20 transition">
                          <td className="px-5 py-2.5 font-sans font-semibold text-foreground">
                            {formatDate(read(day, 'Fecha', 'fecha'))}
                          </td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'InventarioInicial', 'inventarioInicial'))}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">
                            {qty(read(day, 'Compras', 'compras'))}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-rose-600">
                            {qty(read(day, 'Ventas', 'ventas'))}
                          </td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'TransferenciasEntrada', 'transferenciasEntrada'))}</td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'TransferenciasSalida', 'transferenciasSalida'))}</td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'BajasMercancia', 'bajasMercancia'))}</td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'Conversiones', 'conversiones'))}</td>
                          <td className="px-4 py-2.5 text-right">{qty(read(day, 'AjustesAuditoria', 'ajustesAuditoria'))}</td>
                          <td className="px-5 py-2.5 text-right font-extrabold text-primary">
                            {qty(read(day, 'InventarioFinal', 'inventarioFinal'))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!summary.length && (
                    <div className="p-12 text-center">
                      <p className="text-xs font-semibold text-muted-foreground">
                        No existe un consolidado diario para el periodo seleccionado.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 2: LÍNEA DE TIEMPO (ASPECTO VISUAL DE LA IMAGEN) ── */}
            {activeTab === 'timeline' && (
              <div className="p-6 sm:p-8 max-h-[600px] overflow-y-auto">
                {filteredRows.length > 0 ? (
                  <div className="relative pl-8 sm:pl-10 space-y-5">
                    {/* Línea vertical de la cronología */}
                    <div className="absolute left-3.5 sm:left-4.5 top-4 bottom-4 w-0.5 bg-border/70 dark:bg-border/40" />

                    {filteredRows.map((row, index) => {
                      const tipo = read(row, 'Tipo', 'tipo');
                      const doc = read(row, 'Documento', 'documento');
                      const fechaIso = read(row, 'Fecha', 'fecha');
                      const nota = read(row, 'Nota', 'nota');
                      const entradaVal = Number(read(row, 'Entrada', 'entrada') || 0);
                      const salidaVal = Number(read(row, 'Salida', 'salida') || 0);
                      const existencia = Number(read(row, 'Existencia', 'existencia') || 0);
                      const iconMeta = getTimelineIcon(tipo);

                      return (
                        <div key={`${doc}-${index}`} className="relative group">
                          {/* Nodo central sobre la línea vertical */}
                          <div
                            className={`absolute -left-8 sm:-left-10 top-3.5 grid size-8 place-items-center rounded-xl border shadow-xs transition-transform group-hover:scale-110 z-10 ${iconMeta.boxClass}`}
                          >
                            {iconMeta.icon}
                          </div>

                          {/* Tarjeta del evento en la cronología */}
                          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs transition hover:shadow-md dark:border-white/10">
                            {/* Cabecera del ítem */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <span className={`inline-block rounded-md px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${iconMeta.badgeClass}`}>
                                  {tipo}
                                </span>
                                <span className="font-mono text-xs font-extrabold text-foreground">
                                  {doc}
                                </span>
                                <span className="text-muted-foreground/40 text-xs">|</span>
                                <span className="text-xs text-muted-foreground">
                                  {read(report, 'Sucursal', 'sucursal') || 'Almacén Central'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                                <Clock className="size-3.5" />
                                <span>{formatTimelineDate(fechaIso)}</span>
                              </div>
                            </div>

                            {/* Cuerpo del ítem */}
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
                              {/* Izquierda: Descripción / Nota / Operador */}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground">
                                  {nota || (entradaVal > 0 ? 'Entrada confirmada de inventario.' : 'Venta / Salida de mostrador directa.')}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground font-mono">
                                  Doc: {doc} · Presentación: {empaqueText}
                                </p>
                              </div>

                              {/* Derecha: Píldora de Variación + Saldo Resultante + Icono Ver */}
                              <div className="flex shrink-0 items-center gap-5 rounded-2xl border border-border/50 bg-muted/30 px-5 py-2.5">
                                <div>
                                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground text-right">
                                    Variación
                                  </p>
                                  <p
                                    className={`font-mono text-sm font-extrabold text-right ${
                                      entradaVal > 0 ? 'text-emerald-600' : 'text-rose-600'
                                    }`}
                                  >
                                    {entradaVal > 0 ? `+${qty(entradaVal)} uds` : `-${qty(salidaVal)} uds`}
                                  </p>
                                </div>

                                <div className="h-7 w-px bg-border/60" />

                                <div>
                                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground text-right">
                                    Saldo Resultante
                                  </p>
                                  <p className="font-mono text-sm font-extrabold text-primary text-right">
                                    {qty(existencia)} uds
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setDetailModal({ open: true, row })}
                                  className="grid size-8 place-items-center rounded-xl border border-border/60 bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                  title="Ver detalle del movimiento"
                                >
                                  <Eye className="size-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-xs font-semibold text-muted-foreground">
                      No hay movimientos que coincidan con el filtro seleccionado ({timelineFilter}).
                    </p>
                  </div>
                )}
              </div>
            )}
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

      {/* Modal Detalle de Movimiento */}
      <Dialog open={detailModal.open} onOpenChange={(open) => setDetailModal((m) => ({ ...m, open }))}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="border-b border-border px-6 py-4.5">
            <DialogTitle className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Box className="size-5" />
              </span>
              <span>
                <span className="block text-base font-bold">Detalle de Transacción</span>
                <span className="font-mono text-xs font-normal text-muted-foreground">
                  Folio: {read(detailModal.row, 'Documento', 'documento')}
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>

          {detailModal.row && (
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Movimiento</p>
                  <p className="mt-1 font-bold text-foreground">{read(detailModal.row, 'Tipo', 'tipo')}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Fecha y Hora</p>
                  <p className="mt-1 font-mono font-bold text-foreground">
                    {formatTimelineDate(read(detailModal.row, 'Fecha', 'fecha'))}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Nota / Comentarios</p>
                <p className="mt-1 text-foreground">
                  {read(detailModal.row, 'Nota', 'nota') || 'Sin comentarios adicionales registrados en el documento.'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <p className="text-[10px] uppercase font-bold text-emerald-600">Entrada</p>
                  <p className="mt-1 text-sm font-extrabold text-emerald-600">
                    +{qty(read(detailModal.row, 'Entrada', 'entrada'))}
                  </p>
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                  <p className="text-[10px] uppercase font-bold text-rose-600">Salida</p>
                  <p className="mt-1 text-sm font-extrabold text-rose-600">
                    -{qty(read(detailModal.row, 'Salida', 'salida'))}
                  </p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                  <p className="text-[10px] uppercase font-bold text-primary">Saldo Resultante</p>
                  <p className="mt-1 text-sm font-extrabold text-primary">
                    {qty(read(detailModal.row, 'Existencia', 'existencia'))}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDetailModal({ open: false, row: null })}
                  className="rounded-xl bg-primary px-4.5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-95"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
