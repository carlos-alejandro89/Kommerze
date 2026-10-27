import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ClipboardCheck, FileDown, FileText, Layers3, PackageSearch, Search, SlidersHorizontal, Tags } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PdfViewer } from '@/components/common/pdf-viewer';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useActivation } from '@/providers/ActivationProvider';
import { useReportsService } from '../useReportsService';

const read = (source, pascal, camel) => source?.[pascal] ?? source?.[camel];
const quantity = (value) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 });

function MultiSelect({ label, icon: Icon, options, selected, onChange, valueKey, labelKey }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const summary = selected.length === 0
    ? 'Todas'
    : selected.length === 1
      ? read(options.find((item) => Number(read(item, valueKey, valueKey.toLowerCase())) === selected[0]), labelKey, labelKey[0].toLowerCase() + labelKey.slice(1))
      : `${selected.length} seleccionadas`;
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  const visibleOptions = options.filter((item) => {
    const name = read(item, labelKey, labelKey[0].toLowerCase() + labelKey.slice(1)) || '';
    return String(name).toLowerCase().includes(search.trim().toLowerCase());
  });

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-10 w-full items-center gap-2 rounded-[10px] border border-[#dfe7f2] bg-background px-3 text-left text-[11px] text-foreground outline-none transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/10">
        <Icon className="size-4 text-primary" />
        <span className="min-w-0 flex-1"><span className="font-bold uppercase tracking-[0.07em] text-muted-foreground">{label}</span><span className="ml-2 font-semibold text-foreground">{summary}</span></span>
        <ChevronDown className={`size-4 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="absolute z-40 mt-1.5 w-full min-w-64 overflow-hidden rounded-xl border border-[#dfe7f2] bg-surface shadow-[0_16px_35px_-18px_rgba(28,70,133,.45)]">
        <div className="border-b border-border/70 p-2"><div className="relative"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar ${label.toLowerCase()}...`} className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10" /></div></div>
        <div className="max-h-52 overflow-auto p-1.5">
        <button type="button" onClick={() => onChange([])} className="mb-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-muted">Todas</button>
        {visibleOptions.map((item) => {
          const id = Number(read(item, valueKey, valueKey.toLowerCase()));
          const name = read(item, labelKey, labelKey[0].toLowerCase() + labelKey.slice(1));
          const active = selected.includes(id);
          return (
            <button key={id} type="button" onClick={() => toggle(id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-foreground hover:bg-muted">
              <span className={`grid size-4 place-items-center rounded border ${active ? 'border-primary bg-primary text-white' : 'border-border'}`}>{active && <Check className="size-3" />}</span>
              <span className="truncate">{name}</span>
            </button>
          );
        })}
        {!visibleOptions.length && <p className="px-3 py-4 text-center text-xs text-muted-foreground">Sin coincidencias</p>}
        </div>
      </div>
      }
    </div>
  );
}

export function AuditReportPage() {
  const navigate = useNavigate();
  const { store } = useActivation();
  const { generarFormatoAuditoria } = useReportsService();
  const [lines, setLines] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [withStock, setWithStock] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftLines, setDraftLines] = useState([]);
  const [draftBrands, setDraftBrands] = useState([]);
  const [draftWithStock, setDraftWithStock] = useState(true);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [viewer, setViewer] = useState({ open: false, url: '', fileName: '' });
  const branchID = store?.ID ?? store?.id ?? 0;
  const report = read(output, 'Report', 'report');
  const rows = read(report, 'Productos', 'productos') || [];

  useEffect(() => {
    Promise.all([window.go.main.App.ServiceGetLineas(), window.go.main.App.ServiceGetMarcas()])
      .then(([lineResult, brandResult]) => {
        setLines(lineResult?.data || lineResult?.Data || []);
        setBrands(brandResult?.data || brandResult?.Data || []);
      })
      .catch((error) => toast.error(error?.message || String(error)))
      .finally(() => setLoadingCatalogs(false));
  }, []);

  useEffect(() => () => { if (viewer.url) URL.revokeObjectURL(viewer.url); }, [viewer.url]);

  const grouped = useMemo(() => rows.reduce((result, row) => {
    const line = read(row, 'Linea', 'linea') || 'Sin línea';
    (result[line] ||= []).push(row);
    return result;
  }, {}), [rows]);

  const openFilters = () => {
    setDraftLines(selectedLines);
    setDraftBrands(selectedBrands);
    setDraftWithStock(withStock);
    setFiltersOpen(true);
  };

  const generate = async (filters = { lines: selectedLines, brands: selectedBrands, withStock }) => {
    if (!branchID) return toast.error('No fue posible identificar la sucursal de este dispositivo.');
    setLoading(true);
    try {
      setOutput(await generarFormatoAuditoria({
        SucursalID: Number(branchID),
        LineasIDs: filters.lines,
        MarcasIDs: filters.brands,
        ConExistencia: filters.withStock,
      }));
      setSelectedLines(filters.lines);
      setSelectedBrands(filters.brands);
      setWithStock(filters.withStock);
      setFiltersOpen(false);
    } catch (error) {
      toast.error(error?.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  const pdfData = () => {
    const base64 = read(output, 'PDFBase64', 'pdfBase64');
    if (!base64) return null;
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  };
  const openPDF = () => {
    const url = pdfData();
    if (!url) return toast.error('El reporte no contiene un documento PDF.');
    if (viewer.url) URL.revokeObjectURL(viewer.url);
    setViewer({ open: true, url, fileName: read(output, 'FileName', 'fileName') || 'formato-auditoria.pdf' });
  };
  const downloadPDF = () => {
    const url = pdfData();
    if (!url) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = read(output, 'FileName', 'fileName') || 'formato-auditoria.pdf';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 p-6 animate-fade-in">
      <header className="flex flex-col gap-4 rounded-[22px] border border-[#dce7f5] bg-white/80 px-5 py-4 shadow-[0_12px_30px_-28px_rgba(28,70,133,.5)] sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/[.045]">
        <button type="button" onClick={() => navigate(-1)} aria-label="Regresar" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"><ArrowLeft className="size-5" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><ClipboardCheck className="size-4" /></span><h1 className="text-[24px] font-bold tracking-[-0.025em] text-foreground">Formato de auditoría</h1></div>
          <p className="mt-1 text-[12px] text-muted-foreground">Prepara el inventario agrupado por línea para realizar un conteo físico.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <div className="max-w-sm sm:text-right"><p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Filtros actuales</p><p className="mt-0.5 text-xs font-semibold text-foreground">{selectedLines.length ? `${selectedLines.length} líneas` : 'Todas las líneas'} · {selectedBrands.length ? `${selectedBrands.length} marcas` : 'Todas las marcas'} · {withStock ? 'Solo con existencias' : 'Todos los productos'}</p></div>
          <button type="button" onClick={openFilters} disabled={loadingCatalogs} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"><SlidersHorizontal className="size-4" /> Configurar filtros</button>
        </div>
      </header>

      {report ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-sm font-semibold text-foreground">{read(report, 'Sucursal', 'sucursal') || 'Sucursal actual'}</h2><p className="mt-1 text-xs text-muted-foreground">{rows.length} productos · {withStock ? 'Solo con existencias' : 'Todos los productos'}</p></div>
            <div className="flex gap-2"><button onClick={openPDF} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"><FileText className="size-4 text-primary" /> Ver PDF</button><button onClick={downloadPDF} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"><FileDown className="size-4" /> Descargar PDF</button></div>
          </div>
          {rows.length ? Object.entries(grouped).map(([line, items]) => (
            <div key={line}>
              <div className="border-y border-border bg-primary/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary">{line}</div>
              <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-2.5">Código</th><th className="px-5 py-2.5">Producto</th><th className="px-5 py-2.5">Empaque</th><th className="px-5 py-2.5 text-right">Existencia actual</th><th className="w-36 px-5 py-2.5 text-center">Conteo</th></tr></thead><tbody>{items.map((row, index) => <tr key={`${read(row, 'Codigo', 'codigo')}-${index}`} className="even:bg-muted/35"><td className="px-5 py-3 font-mono text-xs text-muted-foreground">{read(row, 'Codigo', 'codigo') || '—'}</td><td className="px-5 py-3 font-semibold text-foreground">{read(row, 'Producto', 'producto')}</td><td className="px-5 py-3 text-muted-foreground">{read(row, 'Empaque', 'empaque')}</td><td className="px-5 py-3 text-right font-bold text-foreground">{quantity(read(row, 'Existencia', 'existencia'))}</td><td className="px-5 py-3"><span className="mx-auto block h-px w-20 bg-border" /></td></tr>)}</tbody></table></div>
            </div>
          )) : <div className="grid min-h-64 place-items-center text-center"><div><PackageSearch className="mx-auto size-11 text-muted-foreground/35" /><p className="mt-3 font-semibold">Sin productos para mostrar</p><p className="mt-1 text-sm text-muted-foreground">Cambia los filtros y vuelve a generar el formato.</p></div></div>}
        </section>
      ) : <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border bg-surface/60 text-center"><div><ClipboardCheck className="mx-auto size-12 text-primary/35" /><h2 className="mt-4 font-semibold">Configura el formato</h2><p className="mt-1 text-sm text-muted-foreground">Selecciona los filtros para preparar la auditoría.</p></div></section>}

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="overflow-visible rounded-3xl p-0 sm:max-w-[760px]">
          <DialogHeader className="border-b border-border/70 px-6 py-5 text-left"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><SlidersHorizontal className="size-5" /></div><div><DialogTitle>Filtros del formato de auditoría</DialogTitle><DialogDescription>Selecciona las líneas, marcas y disponibilidad que deseas incluir.</DialogDescription></div></div></DialogHeader>
          <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
            <MultiSelect label="Líneas" icon={Layers3} options={lines} selected={draftLines} onChange={setDraftLines} valueKey="ID" labelKey="NombreLinea" />
            <MultiSelect label="Marcas" icon={Tags} options={brands} selected={draftBrands} onChange={setDraftBrands} valueKey="ID" labelKey="NombreMarca" />
            <div className="flex h-12 items-center justify-between rounded-xl border border-[#dfe7f2] bg-background px-3 md:col-span-2"><div><p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Inventario</p><p className="text-[11px] font-semibold text-foreground">Solo con existencias</p></div><Switch checked={draftWithStock} onCheckedChange={setDraftWithStock} aria-label="Mostrar solo productos con existencias" /></div>
            <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground md:col-span-2">Si no seleccionas líneas o marcas, el formato incluirá todas las opciones disponibles.</div>
          </div>
          <DialogFooter className="border-t border-border/70 bg-muted/20 px-6 py-4"><button type="button" onClick={() => setFiltersOpen(false)} className="h-10 rounded-xl border border-border bg-background px-4 text-xs font-semibold transition hover:bg-muted">Cancelar</button><button type="button" disabled={loading || loadingCatalogs} onClick={() => generate({ lines: draftLines, brands: draftBrands, withStock: draftWithStock })} className="h-10 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">Generar formato</button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={viewer.open} onOpenChange={(open) => setViewer((current) => ({ ...current, open }))}><DialogContent className="h-[92vh] max-w-5xl overflow-hidden p-0"><DialogHeader className="border-b border-border px-5 py-4"><DialogTitle>Formato de auditoría</DialogTitle></DialogHeader><PdfViewer fileUrl={viewer.url} fileName={viewer.fileName} className="h-[calc(92vh-72px)] rounded-none border-0" /></DialogContent></Dialog>
    </div>
  );
}
