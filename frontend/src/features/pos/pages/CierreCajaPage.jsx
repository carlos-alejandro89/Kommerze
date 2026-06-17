import { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, Banknote, TrendingUp, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
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

export function CierreCajaPage() {
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(false);

  const [turnoActivo, setTurnoActivo]   = useState(null);
  const [resumen, setResumen]           = useState(null);   // ResumenCajeroDto: { NumVentas, Desglose[], TotalIngresos }
  const [loadingResumen, setLoadingResumen] = useState(false);

  // Únicos campos que el cajero captura manualmente (datos físicos)
  const [fondoCierre, setFondoCierre]   = useState('');
  const [retiros, setRetiros]           = useState('');

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
        RetirosEfectivo:   parseFloat(retiros)     || 0,
        // Los Ingreso* son ignorados por el backend — los calcula automáticamente.
        IngresoEfectivo:      0,
        IngresoTarjetas:      0,
        IngresoCheques:       0,
        IngresoTransferencia: 0,
        IngresoOtros:         0,
        Bloqueada:            false,
      });
      if (res?.success) {
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
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle p-4">
        <div className="w-full max-w-md rounded-2xl border border-success/30 bg-surface shadow-lg p-8 text-center space-y-4 animate-fade-in">
          <CheckCircle className="mx-auto size-16 text-emerald-500" />
          <h1 className="text-2xl font-bold text-foreground">Caja Cerrada</h1>
          <p className="text-sm text-muted-foreground">Tu turno ha finalizado exitosamente.</p>
        </div>
      </div>
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

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-bg-subtle animate-fade-in">
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cierre de Caja</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Caja: <span className="font-semibold text-foreground">{turnoActivo?.CajaNombre || turnoActivo?.cajaNombre}</span>
              {' · '}Apertura: <span className="font-semibold text-foreground">{fmt(turnoActivo?.FondoCajaApertura || turnoActivo?.fondoCajaApertura)}</span>
            </p>
          </div>

          <form onSubmit={handleCerrar} className="space-y-5">

            {/* ── Resumen calculado por el sistema ────────────────────────── */}
            <div className="rounded-xl border border-border bg-surface shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="size-4 text-blue-500" />
                  Ingresos por Forma de Pago
                </h2>
                <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Calculado por el sistema
                </span>
              </div>

              {loadingResumen ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <RefreshCw className="size-4 animate-spin" />
                  <span className="text-sm">Calculando ingresos del turno...</span>
                </div>
              ) : desglose.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                  <ShoppingBag className="size-8 opacity-40" />
                  <p className="text-sm">Sin ventas registradas en este turno</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {desglose.map((forma) => {
                      const visual = CLAVE_VISUAL[forma.Clave] ?? defaultVisual;
                      const Icon = visual.icon;
                      return (
                        <div key={forma.FormaID} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <div className={cn('flex size-8 items-center justify-center rounded-lg shrink-0', visual.bg)}>
                            <Icon className={cn('size-4', visual.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-foreground truncate block">{forma.FormaPago}</span>
                            <span className="text-xs text-muted-foreground font-mono">Clave SAT: {forma.Clave}</span>
                          </div>
                          <span className={cn(
                            'text-sm font-semibold tabular-nums',
                            forma.Monto > 0 ? 'text-foreground' : 'text-muted-foreground',
                          )}>
                            {fmt(forma.Monto)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ventas del turno */}
                  {numVentas > 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <ShoppingBag className="size-3.5" />
                      <span>{numVentas} venta{numVentas !== 1 ? 's' : ''} registrada{numVentas !== 1 ? 's' : ''} en este turno</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Total Ingresos</span>
                    <span className="text-lg font-bold text-primary">{fmt(totalIngresos)}</span>
                  </div>
                </>
              )}
            </div>

            {/* ── Datos físicos: solo estos los captura el cajero ─────────── */}
            <div className="rounded-xl border border-border bg-surface shadow-sm p-5 space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Banknote className="size-4 text-emerald-500" />
                Efectivo al Cierre
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Field
                  id="fondoCierre" label="Fondo al Cierre"
                  value={fondoCierre} onChange={setFondoCierre}
                  disabled={submitting}
                />
                <Field
                  id="retiros" label="Retiros de Efectivo"
                  value={retiros} onChange={setRetiros}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || loadingResumen}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all shadow-md',
                submitting || loadingResumen
                  ? 'bg-rose-400 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-500 active:scale-[0.98]',
              )}
            >
              {submitting
                ? <><RefreshCw className="size-4 animate-spin" />Cerrando caja...</>
                : <><X className="size-4" />Cerrar Caja</>
              }
            </button>

          </form>
        </div>
      </div>
    </div>
  );
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
