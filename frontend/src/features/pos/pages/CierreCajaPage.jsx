import { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, DollarSign, CreditCard, FileText, Banknote, MoreHorizontal, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ServiceObtenerOperacionCajeroActiva,
  ServiceCerrarCaja,
} from '../../../../wailsjs/go/main/App';

const FORMA_FIELDS = [
  { key: 'IngresoEfectivo',      label: 'Efectivo',        icon: Banknote,      color: 'text-emerald-500' },
  { key: 'IngresoTarjetas',      label: 'Tarjetas',        icon: CreditCard,    color: 'text-blue-500'    },
  { key: 'IngresoCheques',       label: 'Cheques',         icon: FileText,      color: 'text-amber-500'   },
  { key: 'IngresoTransferencia', label: 'Transferencia',   icon: DollarSign,    color: 'text-violet-500'  },
  { key: 'IngresoOtros',         label: 'Otros',           icon: MoreHorizontal,color: 'text-muted-foreground' },
];

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export function CierreCajaPage() {
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);

  const [turnoActivo, setTurnoActivo] = useState(null);

  // Campos del cierre
  const [fondoCierre, setFondoCierre]       = useState('');
  const [retiros, setRetiros]               = useState('');
  const [ingresos, setIngresos]             = useState({
    IngresoEfectivo: '',      IngresoTarjetas: '',
    IngresoCheques: '',       IngresoTransferencia: '',
    IngresoOtros: '',
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userID = user?.ID || user?.id || 0;

    ServiceObtenerOperacionCajeroActiva(userID)
      .then((res) => {
        if (res?.success && res.data) {
          setTurnoActivo(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleIngreso = (key, val) =>
    setIngresos((prev) => ({ ...prev, [key]: val }));

  const handleCerrar = async (e) => {
    e.preventDefault();
    if (!turnoActivo) return;

    setSubmitting(true);
    try {
      const res = await ServiceCerrarCaja({
        OperacionCajeroID:    turnoActivo?.ID || turnoActivo?.id,
        FondoCajaCierre:      parseFloat(fondoCierre)       || 0,
        RetirosEfectivo:      parseFloat(retiros)           || 0,
        IngresoEfectivo:      parseFloat(ingresos.IngresoEfectivo)      || 0,
        IngresoTarjetas:      parseFloat(ingresos.IngresoTarjetas)      || 0,
        IngresoCheques:       parseFloat(ingresos.IngresoCheques)        || 0,
        IngresoTransferencia: parseFloat(ingresos.IngresoTransferencia) || 0,
        IngresoOtros:         parseFloat(ingresos.IngresoOtros)         || 0,
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

  const totalIngresos = FORMA_FIELDS.reduce((acc, f) => acc + (parseFloat(ingresos[f.key]) || 0), 0);

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

            {/* Fondo al cierre */}
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

            {/* Ingresos por forma de pago */}
            <div className="rounded-xl border border-border bg-surface shadow-sm p-5 space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="size-4 text-blue-500" />
                Ingresos por Forma de Pago
              </h2>

              <div className="divide-y divide-border">
                {FORMA_FIELDS.map(({ key, label, icon: Icon, color }) => (
                  <div key={key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted shrink-0">
                      <Icon className={cn('size-4', color)} />
                    </div>
                    <span className="flex-1 text-sm text-foreground">{label}</span>
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <input
                        type="number" min="0" step="0.01" placeholder="0.00"
                        value={ingresos[key]}
                        onChange={(e) => handleIngreso(key, e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-lg border border-border bg-bg-subtle pl-5 pr-2 py-2 text-sm text-right text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Total Ingresos</span>
                <span className="text-lg font-bold text-primary">{fmt(totalIngresos)}</span>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all shadow-md',
                submitting
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
