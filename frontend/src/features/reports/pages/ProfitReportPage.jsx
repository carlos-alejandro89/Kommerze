import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileDown, FileText, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PdfViewer } from '@/components/common/pdf-viewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActivation } from '@/providers/ActivationProvider';
import { ReportDateFilterDialog } from '../components/ReportDateFilterDialog';
import { useReportsService } from '../useReportsService';

const read = (source, pascal, camel) => source?.[pascal] ?? source?.[camel];
const money = (value) => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const quantity = (value) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 });

function localISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initialDates() {
  const today = new Date();
  return { from: localISODate(new Date(today.getFullYear(), today.getMonth(), 1)), to: localISODate(today) };
}

function documentURL(output) {
  const base64 = read(output, 'PDFBase64', 'pdfBase64');
  if (!base64) return '';
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

export function ProfitReportPage() {
  const navigate = useNavigate();
  const defaults = useMemo(initialDates, []);
  const { store } = useActivation();
  const { generarUtilidad } = useReportsService();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewer, setViewer] = useState({ open: false, url: '', fileName: '' });
  const branchID = store?.ID ?? store?.id ?? 0;
  const report = read(output, 'Report', 'report');
  const rows = read(report, 'Productos', 'productos') || [];

  useEffect(() => () => { if (viewer.url) URL.revokeObjectURL(viewer.url); }, [viewer.url]);

  const generate = async (range = { from, to }) => {
    if (!range.from || !range.to) return toast.warning('Selecciona la fecha inicial y final.');
    if (range.to < range.from) return toast.warning('La fecha final no puede ser anterior a la fecha inicial.');
    if (!branchID) return toast.error('No fue posible identificar la sucursal de este dispositivo.');
    setLoading(true);
    try {
      setFrom(range.from);
      setTo(range.to);
      setOutput(await generarUtilidad(range.from, range.to, branchID));
      setFiltersOpen(false);
    } catch (error) {
      toast.error(error?.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  const openPDF = () => {
    const url = documentURL(output);
    if (!url) return toast.error('El reporte no contiene un documento PDF.');
    if (viewer.url) URL.revokeObjectURL(viewer.url);
    setViewer({ open: true, url, fileName: read(output, 'FileName', 'fileName') || 'utilidad.pdf' });
  };

  const downloadPDF = () => {
    const url = documentURL(output);
    if (!url) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = read(output, 'FileName', 'fileName') || 'utilidad.pdf';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 p-6 animate-fade-in">
      <header className="flex flex-col gap-4 rounded-[22px] border border-[#dce7f5] bg-white/80 px-5 py-4 shadow-[0_12px_30px_-28px_rgba(28,70,133,.5)] sm:flex-row sm:items-center dark:border-white/10 dark:bg-white/[.045]">
        <button type="button" onClick={() => navigate(-1)} aria-label="Regresar" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"><ArrowLeft className="size-5" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><TrendingUp className="size-4" /></span><h1 className="text-[24px] font-bold tracking-[-0.025em] text-foreground">Utilidad de ventas</h1></div>
          <p className="mt-1 text-[12px] text-muted-foreground">Utilidad calculada con las partidas de ventas confirmadas en el periodo.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <div className="sm:text-right"><p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Periodo</p><p className="mt-0.5 text-xs font-semibold text-foreground">{from.split('-').reverse().join('/')} — {to.split('-').reverse().join('/')}</p></div>
          <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 text-xs font-semibold text-primary transition hover:bg-primary/10"><SlidersHorizontal className="size-4" /> Configurar filtros</button>
        </div>
      </header>

      {report ? <>
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Venta neta</p><p className="mt-1 text-xl font-bold">{money(read(report, 'TotalVentas', 'totalVentas') - read(report, 'TotalDescuento', 'totalDescuento'))}</p></div>
          <div className="rounded-2xl border border-border bg-surface p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Costo</p><p className="mt-1 text-xl font-bold">{money(read(report, 'TotalCosto', 'totalCosto'))}</p></div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Utilidad</p><p className="mt-1 text-xl font-bold text-primary">{money(read(report, 'TotalUtilidad', 'totalUtilidad'))}</p></div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5"><div><h2 className="text-sm font-semibold">Detalle de utilidad</h2><p className="mt-0.5 text-[11px] text-muted-foreground">{rows.length} partidas confirmadas</p></div><div className="flex gap-2"><button onClick={openPDF} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"><FileText className="size-4 text-primary" /> Ver PDF</button><button onClick={downloadPDF} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"><FileDown className="size-4" /> Descargar PDF</button></div></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-2.5">Folio</th><th className="px-4 py-2.5">Fecha</th><th className="px-4 py-2.5">Producto</th><th className="px-4 py-2.5 text-right">Cantidad</th><th className="px-4 py-2.5 text-right">Venta</th><th className="px-4 py-2.5 text-right">Descuento</th><th className="px-4 py-2.5 text-right">Costo</th><th className="px-4 py-2.5 text-right">Utilidad</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${read(row, 'Folio', 'folio')}-${read(row, 'Codigo', 'codigo')}-${index}`} className="even:bg-muted/30"><td className="px-4 py-2.5 font-mono">{String(read(row, 'Folio', 'folio') || 0).padStart(8, '0')}</td><td className="px-4 py-2.5 text-muted-foreground">{read(row, 'Fecha', 'fecha')}</td><td className="px-4 py-2.5"><span className="font-semibold">{read(row, 'Producto', 'producto')}</span><span className="ml-2 text-muted-foreground">{read(row, 'Empaque', 'empaque')}</span></td><td className="px-4 py-2.5 text-right">{quantity(read(row, 'Cantidad', 'cantidad'))}</td><td className="px-4 py-2.5 text-right">{money(read(row, 'Venta', 'venta'))}</td><td className="px-4 py-2.5 text-right">{money(read(row, 'Descuento', 'descuento'))}</td><td className="px-4 py-2.5 text-right">{money(read(row, 'Costo', 'costo'))}</td><td className="px-4 py-2.5 text-right font-bold text-primary">{money(read(row, 'Utilidad', 'utilidad'))}</td></tr>)}</tbody></table></div>
        </section>
      </> : <section className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-surface/60 text-center"><div><TrendingUp className="mx-auto size-11 text-primary/35" /><h2 className="mt-3 font-semibold">Selecciona un periodo</h2><p className="mt-1 text-sm text-muted-foreground">Genera el reporte para consultar la utilidad de las ventas confirmadas.</p></div></section>}

      <Dialog open={viewer.open} onOpenChange={(open) => setViewer((current) => ({ ...current, open }))}><DialogContent className="h-[92vh] max-w-6xl overflow-hidden p-0"><DialogHeader className="border-b border-border px-5 py-4"><DialogTitle>Reporte de utilidad</DialogTitle></DialogHeader><PdfViewer fileUrl={viewer.url} fileName={viewer.fileName} className="h-[calc(92vh-72px)] rounded-none border-0" /></DialogContent></Dialog>
      <ReportDateFilterDialog open={filtersOpen} onOpenChange={setFiltersOpen} from={from} to={to} loading={loading} title="Filtros del reporte de utilidad" description="Selecciona el periodo de ventas confirmadas que deseas analizar." onApply={generate} />
    </div>
  );
}
