import { useEffect, useMemo, useState } from 'react';
import {
  FileDown,
  FileText,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import { PdfViewer } from '@/components/common/pdf-viewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActivation } from '@/providers/ActivationProvider';
import { useReportsService } from '../useReportsService';
import { ReportDateRangePicker } from '../components/ReportDateRangePicker';

function localISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initialDates() {
  const today = new Date();
  return {
    from: localISODate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: localISODate(today),
  };
}

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function quantity(value) {
  return Number(value || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function valueOf(source, pascal, camel) {
  return source?.[pascal] ?? source?.[camel];
}

export function SoldProductsReportPage() {
  const defaults = useMemo(initialDates, []);
  const { store } = useActivation();
  const { generarProductosVendidos } = useReportsService();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [viewer, setViewer] = useState({ open: false, url: '', fileName: '' });

  const report = valueOf(output, 'Report', 'report');
  const rows = valueOf(report, 'Productos', 'productos') || [];
  const branchID = store?.ID ?? store?.id ?? 0;

  useEffect(
    () => () => {
      if (viewer.url) URL.revokeObjectURL(viewer.url);
    },
    [viewer.url],
  );

  const generate = async () => {
    if (!from || !to) {
      toast.warning('Selecciona la fecha inicial y final.');
      return;
    }
    if (to < from) {
      toast.warning('La fecha final no puede ser anterior a la fecha inicial.');
      return;
    }
    if (!branchID) {
      toast.error('No fue posible identificar la sucursal de este dispositivo.');
      return;
    }
    setLoading(true);
    try {
      setOutput(await generarProductosVendidos(from, to, branchID));
    } catch (error) {
      toast.error(error?.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  const openPDF = () => {
    const base64 = valueOf(output, 'PDFBase64', 'pdfBase64');
    if (!base64) return toast.error('El reporte no contiene un documento PDF.');
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    if (viewer.url) URL.revokeObjectURL(viewer.url);
    setViewer({
      open: true,
      url,
      fileName: valueOf(output, 'FileName', 'fileName') || 'productos-vendidos.pdf',
    });
  };

  const downloadPDF = () => {
    const base64 = valueOf(output, 'PDFBase64', 'pdfBase64');
    if (!base64) return;
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = valueOf(output, 'FileName', 'fileName') || 'productos-vendidos.pdf';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 p-6 animate-fade-in">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          <PackageCheck className="size-4" />
          Reportes de ventas
        </div>
        <h1 className="text-[24px] font-bold tracking-[-0.025em] text-foreground">Productos vendidos</h1>
        <p className="text-[12px] text-muted-foreground">
          Sumatoria de unidades vendidas por presentación, considerando únicamente ventas confirmadas.
        </p>
      </header>

      <section className="rounded-[18px] border border-[#e2eaf5] bg-white/80 p-4 shadow-[0_10px_26px_-24px_rgba(28,70,133,.5)] dark:border-white/10 dark:bg-white/[.045]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <ReportDateRangePicker from={from} to={to} onChange={(range) => { setFrom(range.from); setTo(range.to); }} />
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-[11px] font-semibold text-primary-foreground shadow-[0_8px_18px_-12px_hsl(var(--primary))] transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Generar reporte
          </button>
        </div>
      </section>

      {report ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-medium text-muted-foreground">Periodo consultado</p>
              <p className="mt-2 text-sm font-bold text-foreground">
                {formatDate(valueOf(report, 'FechaInicio', 'fechaInicio'))} — {formatDate(valueOf(report, 'FechaFin', 'fechaFin'))}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-medium text-muted-foreground">Presentaciones vendidas</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{valueOf(report, 'TotalProductos', 'totalProductos') || 0}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-medium text-muted-foreground">Total de unidades</p>
              <p className="mt-1 text-2xl font-bold text-primary">{quantity(valueOf(report, 'TotalUnidades', 'totalUnidades'))}</p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShoppingBag className="size-4 text-primary" /> Detalle del reporte
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {valueOf(report, 'Sucursal', 'sucursal') || store?.Nombre || store?.nombre || 'Sucursal actual'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={openPDF} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted">
                  <FileText className="size-4 text-primary" /> Ver PDF
                </button>
                <button onClick={downloadPDF} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  <FileDown className="size-4" /> Descargar PDF
                </button>
              </div>
            </div>

            {rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Código</th>
                      <th className="px-5 py-3 font-semibold">Producto</th>
                      <th className="px-5 py-3 font-semibold">Empaque</th>
                      <th className="px-5 py-3 text-right font-semibold">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, index) => (
                      <tr key={`${valueOf(row, 'Codigo', 'codigo')}-${valueOf(row, 'Empaque', 'empaque')}-${index}`} className="hover:bg-muted/30">
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{valueOf(row, 'Codigo', 'codigo') || '—'}</td>
                        <td className="px-5 py-3 font-semibold text-foreground">{valueOf(row, 'Producto', 'producto')}</td>
                        <td className="px-5 py-3 text-muted-foreground">{valueOf(row, 'Empaque', 'empaque')}</td>
                        <td className="px-5 py-3 text-right text-base font-bold text-primary">{quantity(valueOf(row, 'Cantidad', 'cantidad'))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center px-6 text-center">
                <div>
                  <PackageCheck className="mx-auto size-11 text-muted-foreground/35" />
                  <p className="mt-3 font-semibold text-foreground">Sin productos vendidos</p>
                  <p className="mt-1 text-sm text-muted-foreground">No hay ventas confirmadas dentro del periodo seleccionado.</p>
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border bg-surface/60 px-6 text-center">
          <div>
            <FileText className="mx-auto size-12 text-primary/35" />
            <h2 className="mt-4 text-base font-semibold text-foreground">Selecciona un periodo</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Genera el conteo para visualizarlo en pantalla y obtener su versión en PDF.</p>
          </div>
        </section>
      )}

      <Dialog open={viewer.open} onOpenChange={(open) => setViewer((current) => ({ ...current, open }))}>
        <DialogContent className="h-[92vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>Reporte de productos vendidos</DialogTitle>
          </DialogHeader>
          <PdfViewer fileUrl={viewer.url} fileName={viewer.fileName} className="h-[calc(92vh-72px)] rounded-none border-0" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
