import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ClipboardCheck, FileDown, FileText, Layers3, Loader2, PackageSearch, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { PdfViewer } from '@/components/common/pdf-viewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useActivation } from '@/providers/ActivationProvider';
import { useReportsService } from '../useReportsService';

const read = (source, pascal, camel) => source?.[pascal] ?? source?.[camel];
const quantity = (value) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 });

function MultiSelect({ label, icon: Icon, options, selected, onChange, valueKey, labelKey }) {
  const summary = selected.length === 0
    ? 'Todas'
    : selected.length === 1
      ? read(options.find((item) => Number(read(item, valueKey, valueKey.toLowerCase())) === selected[0]), labelKey, labelKey[0].toLowerCase() + labelKey.slice(1))
      : `${selected.length} seleccionadas`;
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

  return (
    <details className="group relative">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none hover:border-primary/40">
        <Icon className="size-4 text-primary" />
        <span className="min-w-0 flex-1"><span className="text-xs text-muted-foreground">{label}</span><span className="ml-2 font-semibold">{summary}</span></span>
        <ChevronDown className="size-4 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="absolute z-40 mt-2 max-h-64 w-full min-w-64 overflow-auto rounded-xl border border-border bg-surface p-2 shadow-xl">
        <button type="button" onClick={() => onChange([])} className="mb-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-muted">Seleccionar todas</button>
        {options.map((item) => {
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
      </div>
    </details>
  );
}

export function AuditReportPage() {
  const { store } = useActivation();
  const { generarFormatoAuditoria } = useReportsService();
  const [lines, setLines] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [withStock, setWithStock] = useState(true);
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

  const generate = async () => {
    if (!branchID) return toast.error('No fue posible identificar la sucursal de este dispositivo.');
    setLoading(true);
    try {
      setOutput(await generarFormatoAuditoria({
        SucursalID: Number(branchID),
        LineasIDs: selectedLines,
        MarcasIDs: selectedBrands,
        ConExistencia: withStock,
      }));
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
    <div className="p-5 space-y-5 animate-fade-in">
      <header>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><ClipboardCheck className="size-4" /> Reportes de inventario</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Formato de auditoría</h1>
        <p className="mt-1 text-sm text-muted-foreground">Prepara el inventario agrupado por línea para realizar un conteo físico.</p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_260px_auto] lg:items-end">
          <MultiSelect label="Líneas" icon={Layers3} options={lines} selected={selectedLines} onChange={setSelectedLines} valueKey="ID" labelKey="NombreLinea" />
          <MultiSelect label="Marcas" icon={Tags} options={brands} selected={selectedBrands} onChange={setSelectedBrands} valueKey="ID" labelKey="NombreMarca" />
          <div className="flex h-11 items-center justify-between rounded-xl border border-border bg-background px-3">
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Existencia</p><p className="text-xs font-semibold text-foreground">{withStock ? 'Con existencia' : 'Sin existencia'}</p></div>
            <Switch checked={withStock} onCheckedChange={setWithStock} aria-label="Cambiar filtro de existencia" />
          </div>
          <button type="button" disabled={loading || loadingCatalogs} onClick={generate} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />} Generar formato
          </button>
        </div>
      </section>

      {report ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-sm font-semibold text-foreground">{read(report, 'Sucursal', 'sucursal') || 'Sucursal actual'}</h2><p className="mt-1 text-xs text-muted-foreground">{rows.length} productos · {withStock ? 'Con existencia' : 'Sin existencia'}</p></div>
            <div className="flex gap-2"><button onClick={openPDF} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"><FileText className="size-4 text-primary" /> Ver PDF</button><button onClick={downloadPDF} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"><FileDown className="size-4" /> Descargar PDF</button></div>
          </div>
          {rows.length ? Object.entries(grouped).map(([line, items]) => (
            <div key={line}>
              <div className="border-y border-border bg-primary/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary">{line}</div>
              <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-2.5">Código</th><th className="px-5 py-2.5">Producto</th><th className="px-5 py-2.5">Empaque</th><th className="px-5 py-2.5 text-right">Existencia actual</th><th className="w-36 px-5 py-2.5 text-center">Conteo</th></tr></thead><tbody className="divide-y divide-border">{items.map((row, index) => <tr key={`${read(row, 'Codigo', 'codigo')}-${index}`}><td className="px-5 py-3 font-mono text-xs text-muted-foreground">{read(row, 'Codigo', 'codigo') || '—'}</td><td className="px-5 py-3 font-semibold text-foreground">{read(row, 'Producto', 'producto')}</td><td className="px-5 py-3 text-muted-foreground">{read(row, 'Empaque', 'empaque')}</td><td className="px-5 py-3 text-right font-bold text-foreground">{quantity(read(row, 'Existencia', 'existencia'))}</td><td className="px-5 py-3"><span className="block h-8 rounded-lg border border-dashed border-border" /></td></tr>)}</tbody></table></div>
            </div>
          )) : <div className="grid min-h-64 place-items-center text-center"><div><PackageSearch className="mx-auto size-11 text-muted-foreground/35" /><p className="mt-3 font-semibold">Sin productos para mostrar</p><p className="mt-1 text-sm text-muted-foreground">Cambia los filtros y vuelve a generar el formato.</p></div></div>}
        </section>
      ) : <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border bg-surface/60 text-center"><div><ClipboardCheck className="mx-auto size-12 text-primary/35" /><h2 className="mt-4 font-semibold">Configura el formato</h2><p className="mt-1 text-sm text-muted-foreground">Selecciona los filtros para preparar la auditoría.</p></div></section>}

      <Dialog open={viewer.open} onOpenChange={(open) => setViewer((current) => ({ ...current, open }))}><DialogContent className="h-[92vh] max-w-5xl overflow-hidden p-0"><DialogHeader className="border-b border-border px-5 py-4"><DialogTitle>Formato de auditoría</DialogTitle></DialogHeader><PdfViewer fileUrl={viewer.url} fileName={viewer.fileName} className="h-[calc(92vh-72px)] rounded-none border-0" /></DialogContent></Dialog>
    </div>
  );
}
