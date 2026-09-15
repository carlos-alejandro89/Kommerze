import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, RefreshCw, CheckCircle, AlertCircle, Banknote, TrendingUp, ShoppingBag, Calculator, CircleDollarSign, Store, ReceiptText, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ServiceObtenerOperacionCajeroActiva,
  ServiceObtenerResumenCajero,
  ServiceCerrarCaja,
} from '../../../../wailsjs/go/main/App';

// ── Mapa de íconos y colores por clave SAT ────────────────────────────────────
// Se usa para enriquecer visualmente el desglose dinámico.
import {
  DollarSign, CreditCard, FileText, ArrowLeftRight, MoreHorizontal,
  Wallet, Smartphone, Building2,
} from 'lucide-react';

const CLAVE_VISUAL = {
  '01': { icon: Banknote,      color: 'text-emerald-500', bg: 'bg-emerald-500/10' }, // Efectivo
  '02': { icon: FileText,      color: 'text-amber-500',   bg: 'bg-amber-500/10'   }, // Cheque nominativo
  '03': { icon: ArrowLeftRight,color: 'text-violet-500',  bg: 'bg-violet-500/10'  }, // Transferencia
  '04': { icon: CreditCard,    color: 'text-blue-500',    bg: 'bg-blue-500/10'    }, // Tarjeta de crédito
  '28': { icon: CreditCard,    color: 'text-sky-500',     bg: 'bg-sky-500/10'     }, // Tarjeta de débito
  '29': { icon: Wallet,        color: 'text-indigo-500',  bg: 'bg-indigo-500/10'  }, // Tarjeta de servicios
  '05': { icon: DollarSign,    color: 'text-teal-500',    bg: 'bg-teal-500/10'    }, // Monedero electrónico
  '06': { icon: Smartphone,    color: 'text-cyan-500',    bg: 'bg-cyan-500/10'    }, // Dinero electrónico
  '08': { icon: Building2,     color: 'text-orange-500',  bg: 'bg-orange-500/10'  }, // Vales de despensa
};

const defaultVisual = { icon: MoreHorizontal, color: 'text-muted-foreground', bg: 'bg-muted/30' };

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const fmtDate = (value) => value
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Sin fecha registrada';

export function CierreCajaPage() {
  const navigate = useNavigate();
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(false);
  const [closingDocument, setClosingDocument] = useState(null);

  const [turnoActivo, setTurnoActivo]   = useState(null);
  const [resumen, setResumen]           = useState(null);   // ResumenCajeroDto: { NumVentas, Desglose[], TotalIngresos }
  const [loadingResumen, setLoadingResumen] = useState(false);

  // Únicos campos que el cajero captura manualmente (datos físicos)
  const [fondoCierre, setFondoCierre]   = useState('');

  const { user } = useAuth();
  const userID = user?.ID ?? user?.id ?? 0;

  // 1️⃣ Cargar turno activo
  useEffect(() => {
    if (!userID) {
      setLoading(false);
      return;
    }
    ServiceObtenerOperacionCajeroActiva(userID)
      .then((res) => {
        if (res?.success && res.data) {
          setTurnoActivo(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userID]);

  // 2️⃣ Cargar resumen calculado en cuanto tengamos el turno
  useEffect(() => {
    const cajaID = turnoActivo?.ID || turnoActivo?.id;
    if (!cajaID) return;

    setLoadingResumen(true);
    ServiceObtenerResumenCajero(cajaID)
      .then((res) => {
        if (res?.success && res.data) {
          setResumen(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingResumen(false));
  }, [turnoActivo]);

  const handleCerrar = async (e) => {
    e.preventDefault();
    if (!turnoActivo) return;

    setSubmitting(true);
    try {
      const res = await ServiceCerrarCaja({
        OperacionCajeroID: turnoActivo?.ID || turnoActivo?.id,
        FondoCajaCierre:   parseFloat(fondoCierre) || 0,
        RetirosEfectivo:   0,
        // Los Ingreso* son ignorados por el backend — los calcula automáticamente.
        IngresoEfectivo:      0,
        IngresoTarjetas:      0,
        IngresoCheques:       0,
        IngresoTransferencia: 0,
        IngresoOtros:         0,
        Bloqueada:            false,
      });
      if (res?.success) {
        const pdfBase64 = res?.data?.pdfBase64;
        if (pdfBase64) {
          const contenido = String(pdfBase64).replace(/^data:application\/pdf;base64,/, '').replace(/\s/g, '');
          const binario = atob(contenido);
          const bytes = new Uint8Array(binario.length);
          for (let index = 0; index < binario.length; index += 1) bytes[index] = binario.charCodeAt(index);
          setClosingDocument({
            fileUrl: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })),
            fileName: res?.data?.pdfFileName || 'cierre-caja.pdf',
          });
        } else if (res?.errors?.length) {
          toast.warning(res.message || 'La caja cerró, pero el reporte no pudo generarse');
        }
        setSuccess(true);
        toast.success('Caja cerrada correctamente');
      } else {
        toast.error(res?.message || 'Error al cerrar la caja');
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const closeClosingDocument = () => {
    if (closingDocument?.fileUrl) URL.revokeObjectURL(closingDocument.fileUrl);
    setClosingDocument(null);
  };

  // ── Loading / estados vacíos ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle">
        <RefreshCw className="size-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <>
        <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle p-4">
          <div className="w-full max-w-md rounded-2xl border border-success/30 bg-surface shadow-lg p-8 text-center space-y-4 animate-fade-in">
            <CheckCircle className="mx-auto size-16 text-emerald-500" />
            <h1 className="text-2xl font-bold text-foreground">Caja cerrada</h1>
            <p className="text-sm text-muted-foreground">Tu turno ha finalizado correctamente.</p>
          </div>
        </div>
        <Dialog open={Boolean(closingDocument)} onOpenChange={(open) => !open && closeClosingDocument()}>
          <DialogContent className="h-[92vh] w-[min(1180px,96vw)] max-w-none overflow-hidden p-0">
            <DialogHeader className="border-b border-border px-6 py-4 text-left">
              <DialogTitle>Reporte de cierre de caja</DialogTitle>
              <DialogDescription>{closingDocument?.fileName}</DialogDescription>
            </DialogHeader>
            <iframe src={closingDocument?.fileUrl || ''} title={closingDocument?.fileName || 'Reporte de cierre de caja'} className="h-[calc(92vh-82px)] w-full border-0 bg-muted/30" />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (!turnoActivo) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle p-4">
        <div className="w-full max-w-md rounded-2xl border border-warning/30 bg-surface shadow-lg p-8 text-center space-y-4">
          <AlertCircle className="mx-auto size-12 text-warning" />
          <h1 className="text-xl font-bold text-foreground">Sin Turno Activo</h1>
          <p className="text-sm text-muted-foreground">No tienes un turno de caja abierto actualmente.</p>
        </div>
      </div>
    );
  }

  // Desglose dinámico de la respuesta Go: resumen.Desglose = [{ FormaID, FormaPago, Clave, Monto }]
  const desglose = resumen?.Desglose ?? [];
  const totalIngresos = resumen?.TotalIngresos ?? 0;
  const numVentas = resumen?.NumVentas ?? 0;
  const ventasCanceladas = resumen?.VentasCanceladas ?? 0;
  const fondoApertura = Number(turnoActivo?.FondoCajaApertura || turnoActivo?.fondoCajaApertura || 0);
  const ingresoEfectivo = Number(desglose.find((forma) => forma.Clave === '01')?.Monto || 0);
  const efectivoEsperado = fondoApertura + ingresoEfectivo;
  const responsable = turnoActivo?.ResponsableCaja?.Nombre
    || turnoActivo?.responsableCaja?.Nombre
    || user?.Nombre
    || user?.name
    || 'Usuario actual';
  const cajaNombre = turnoActivo?.CajaNombre || turnoActivo?.cajaNombre || 'Caja actual';
  const fechaInicio = turnoActivo?.FechaInicio || turnoActivo?.fechaInicio;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(219,234,254,.7),transparent_42%),hsl(var(--bg-subtle))] animate-fade-in">
      <form onSubmit={handleCerrar} className="flex min-h-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-6 lg:px-8">
          <div className="mx-auto max-w-[1320px] space-y-5">
            <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex items-start gap-4">
                <button type="button" onClick={() => navigate(-1)} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background px-3.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted">
                  <ArrowLeft className="size-4 text-primary" /> Volver
                </button>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Turno actual</p>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Cierre de caja</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Revisa los ingresos registrados en este turno y confirma el efectivo al cierre.</p>
                </div>
              </div>
              <div className="flex min-w-[360px] items-center gap-4 rounded-2xl border border-white/80 bg-background/90 p-4 shadow-[0_18px_45px_-35px_rgba(24,65,130,.7)] dark:border-white/10">
                <span className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600"><Store className="size-6" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">Caja: {cajaNombre}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Apertura: <strong className="text-foreground">{fmt(fondoApertura)}</strong></p>
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">{responsable} · {fmtDate(fechaInicio)}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-600"><span className="size-2 rounded-full bg-emerald-500" />Caja abierta</span>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard icon={ShoppingBag} tone="blue" label="Ventas registradas" value={numVentas} detail="Movimientos del turno" />
              <SummaryCard icon={CircleDollarSign} tone="emerald" label="Total ingresos" value={fmt(totalIngresos)} detail="Acumulado por pagos" />
              <SummaryCard icon={X} tone="rose" label="Ventas canceladas" value={ventasCanceladas} detail="Cancelaciones del turno" />
              <SummaryCard icon={Calculator} tone="violet" label="Efectivo esperado" value={fmt(efectivoEsperado)} detail="Apertura más efectivo" />
            </section>

            <section className="overflow-hidden rounded-2xl border border-white/80 bg-background/90 shadow-[0_22px_55px_-42px_rgba(24,65,130,.7)] dark:border-white/10">
              <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground"><TrendingUp className="size-5 text-blue-600" />Ingresos por forma de pago</h2>
                <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1.5 text-[10px] font-semibold text-blue-600"><Calculator className="size-3.5" />Calculado por el sistema</span>
              </header>
              {loadingResumen ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><RefreshCw className="size-4 animate-spin" />Calculando ingresos del turno…</div>
              ) : desglose.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground"><ShoppingBag className="size-8 opacity-40" /><p className="text-sm">Sin ventas registradas en este turno</p></div>
              ) : (
                <>
                  <div className="grid grid-cols-[minmax(0,1fr)_120px_160px] border-b border-border/60 bg-muted/25 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                    <span>Forma de pago</span><span>Clave SAT</span><span className="text-right">Importe</span>
                  </div>
                  <div className="divide-y divide-border/60">
                    {desglose.map((forma) => {
                      const visual = CLAVE_VISUAL[forma.Clave] ?? defaultVisual;
                      const Icon = visual.icon;
                      return (
                        <div key={forma.FormaID} className="grid grid-cols-[minmax(0,1fr)_120px_160px] items-center px-5 py-3">
                          <div className="flex min-w-0 items-center gap-3"><span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', visual.bg)}><Icon className={cn('size-4', visual.color)} /></span><span className="truncate text-xs font-semibold uppercase text-foreground">{forma.FormaPago}</span></div>
                          <span className="font-mono text-xs text-muted-foreground">{forma.Clave}</span>
                          <span className={cn('text-right text-sm font-bold tabular-nums', Number(forma.Monto) > 0 ? 'text-foreground' : 'text-muted-foreground')}>{fmt(forma.Monto)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="m-4 flex items-center justify-between rounded-xl border border-blue-500/15 bg-blue-500/[.045] px-4 py-3"><span className="text-sm font-bold text-foreground">Total ingresos</span><span className="text-xl font-bold text-blue-600">{fmt(totalIngresos)}</span></div>
                </>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.25fr_.9fr]">
              <div className="rounded-2xl border border-white/80 bg-background/90 p-5 shadow-[0_22px_55px_-42px_rgba(24,65,130,.7)] dark:border-white/10">
                <div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><Banknote className="size-5" /></span><div><h2 className="text-base font-bold text-foreground">Efectivo al cierre</h2><p className="mt-0.5 text-xs text-muted-foreground">Registra el efectivo físico contado al finalizar el turno.</p></div></div>
                <div className="mt-5"><Field id="fondoCierre" label="Fondo al cierre" value={fondoCierre} onChange={setFondoCierre} disabled={submitting} /></div>
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-500/10 bg-blue-500/[.045] px-3.5 py-3 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300"><Info className="mt-0.5 size-4 shrink-0" />Captura el total de efectivo que permanece físicamente en la caja al momento del cierre.</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-background/90 p-5 shadow-[0_22px_55px_-42px_rgba(24,65,130,.7)] dark:border-white/10">
                <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600"><ReceiptText className="size-5" /></span><h2 className="text-base font-bold text-foreground">Resumen del turno</h2></div>
                <div className="mt-5 space-y-3 text-xs"><SummaryRow label="Apertura de caja" value={fmt(fondoApertura)} /><SummaryRow label="Ingresos en efectivo" value={fmt(ingresoEfectivo)} /><SummaryRow label="Total de ingresos" value={fmt(totalIngresos)} /></div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-500/[.06] px-4 py-3"><span className="text-xs font-bold text-foreground">Efectivo esperado en caja</span><span className="text-lg font-bold text-blue-600">{fmt(efectivoEsperado)}</span></div>
              </div>
            </section>
          </div>
        </main>
        <footer className="shrink-0 border-t border-border/60 bg-background/90 px-5 py-3.5 shadow-[0_-14px_35px_-30px_rgba(20,54,110,.65)] backdrop-blur-xl lg:px-8">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between">
            <button type="button" onClick={() => navigate(-1)} className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-foreground transition hover:bg-muted"><ArrowLeft className="size-4" />Cancelar</button>
            <button type="submit" disabled={submitting || loadingResumen} className={cn('flex h-10 min-w-52 items-center justify-center gap-2 rounded-xl px-6 text-xs font-semibold text-white shadow-lg transition', submitting || loadingResumen ? 'cursor-not-allowed bg-rose-400' : 'bg-rose-600 hover:bg-rose-500')}>
              {submitting ? <><RefreshCw className="size-4 animate-spin" />Cerrando caja…</> : <><X className="size-4" />Cerrar caja</>}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

const SUMMARY_TONES = {
  blue: 'bg-blue-500/10 text-blue-600',
  emerald: 'bg-emerald-500/10 text-emerald-600',
  amber: 'bg-amber-500/10 text-amber-600',
  rose: 'bg-rose-500/10 text-rose-600',
  violet: 'bg-violet-500/10 text-violet-600',
};

function SummaryCard({ icon: Icon, tone, label, value, detail }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-background/90 p-4 shadow-[0_18px_45px_-38px_rgba(24,65,130,.65)] dark:border-white/10"><span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', SUMMARY_TONES[tone])}><Icon className="size-5" /></span><div className="min-w-0"><p className="text-[10px] font-medium text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-xl font-bold tabular-nums text-foreground">{value}</p><p className="mt-0.5 truncate text-[9px] text-muted-foreground">{detail}</p></div></div>;
}

function SummaryRow({ label, value }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{label}</span><strong className="tabular-nums text-foreground">{value}</strong></div>;
}

function Field({ id, label, value, onChange, disabled }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
        <input
          id={id} type="number" min="0" step="0.01" placeholder="0.00"
          value={value} onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-border bg-bg-subtle pl-6 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50"
        />
      </div>
    </div>
  );
}
