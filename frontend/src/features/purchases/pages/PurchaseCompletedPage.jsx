import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleCheckBig, FileText, Home, Loader2, Plus, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePosService } from '@/features/pos/usePosService';

const money = value => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export function PurchaseCompletedPage() {
  const navigate = useNavigate();
  const posService = usePosService();
  const completion = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('purchaseCompletion') || 'null'); } catch { return null; }
  }, []);
  const [loadingReport, setLoadingReport] = useState(false);
  const [viewer, setViewer] = useState({ open: false, url: '', fileName: '' });

  useEffect(() => () => { if (viewer.url) URL.revokeObjectURL(viewer.url); }, [viewer.url]);

  const openReport = async () => {
    if (!completion?.pedidoGuid) { toast.error('No se encontró el identificador de la compra'); return; }
    setLoadingReport(true);
    try {
      const result = await posService.generarReporteCompra(completion.pedidoGuid);
      if (!result?.dataBase64) throw new Error('El reporte no contiene información');
      const bytes = Uint8Array.from(atob(result.dataBase64), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      setViewer(current => { if (current.url) URL.revokeObjectURL(current.url); return { open: true, url, fileName: result.fileName || 'reporte-compra.pdf' }; });
      toast.success('Reporte de compra generado');
    } catch (error) { toast.error('No se pudo generar el reporte: ' + String(error)); }
    finally { setLoadingReport(false); }
  };

  if (!completion) return <div className="flex h-[calc(100vh-56px)] items-center justify-center"><button onClick={() => navigate('/purchases')} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Iniciar una compra</button></div>;

  return <div className="relative h-[calc(100vh-56px)] overflow-y-auto bg-[#f5f8fc] p-6 dark:bg-background">
    <div className="kommerze-gradient-bg pointer-events-none absolute inset-0" />
    <main className="relative z-[var(--z-layer-base)] mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center py-8 text-center">
      <div className="relative mb-5 flex size-24 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,.22)]"><div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/15" /><CircleCheckBig className="relative size-12 text-emerald-500" /></div>
      <h1 className="text-3xl font-bold tracking-tight">¡Compra registrada correctamente!</h1>
      <p className="mt-2 text-sm text-muted-foreground">La mercancía y los datos del proveedor fueron registrados en el sistema.</p>
      <span className="mt-5 rounded-full bg-primary px-4 py-2 font-mono text-xs font-bold tracking-widest text-primary-foreground">FOLIO: CP-{String(completion.folio || 0).padStart(6, '0')}</span>

      <div className="mt-8 grid w-full gap-4 text-left md:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl border border-border/70 bg-background/80 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-full bg-blue-500/10 text-blue-600"><Store className="size-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Proveedor</p><h2 className="text-base font-semibold">{completion.supplier?.razonSocial || 'Proveedor'}</h2><p className="text-xs text-muted-foreground">RFC: {completion.supplier?.rfc || '—'}</p></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-5"><Summary label="Origen" value={completion.origenCaptura} /><Summary label="Folio factura" value={completion.folioFactura || '—'} /><Summary label="Artículos" value={completion.itemCount} /><Summary label="Unidades" value={completion.unitCount} /></div>
        </section>
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#002366] to-[#001233] p-6 text-left text-white shadow-xl"><div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/[.04] blur-2xl" /><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-200/60">Total de compra</p><p className="mt-2 text-4xl font-black tracking-tight tabular-nums">{money(completion.totalCompra)}</p><div className="mt-6 border-t border-white/10 pt-4"><p className="text-[10px] text-blue-100/60">El reporte incluye el valor estimado de venta de los artículos.</p></div></section>
      </div>

      <div className="mt-7 flex w-full flex-wrap justify-center gap-3"><button onClick={() => navigate('/home')} className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-xs font-semibold hover:bg-muted"><Home className="size-4" />Ir al inicio</button><button onClick={() => { localStorage.removeItem('purchaseCompletion'); navigate('/purchases'); }} className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-xs font-semibold hover:bg-muted"><Plus className="size-4" />Nueva compra</button><button onClick={openReport} disabled={loadingReport} className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-xs font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-60">{loadingReport ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}Visualizar reporte</button></div>
    </main>
    <Dialog open={viewer.open} onOpenChange={open => setViewer(current => ({ ...current, open }))}><DialogContent className="flex h-[94vh] w-[min(1280px,97vw)] max-w-none flex-col overflow-hidden rounded-2xl p-0"><DialogHeader className="border-b border-border px-6 py-4 text-left"><DialogTitle>Reporte de compra CP-{String(completion.folio || 0).padStart(6, '0')}</DialogTitle><DialogDescription>Documento generado con la información registrada en la compra.</DialogDescription></DialogHeader>{viewer.url && <iframe title={viewer.fileName} src={viewer.url} className="min-h-0 w-full flex-1 bg-zinc-100" />}</DialogContent></Dialog>
  </div>;
}

function Summary({ label, value }) { return <div className="rounded-xl bg-muted/40 px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-semibold">{value ?? '—'}</p></div>; }
