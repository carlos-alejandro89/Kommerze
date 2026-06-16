import { useState, useEffect } from 'react';
import { Wallet, Lock, CheckCircle, AlertCircle, RefreshCw, Store, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import {
  ServiceObtenerOperacionSucursalActiva,
  ServiceObtenerOperacionCajeroActiva,
  ServiceAbrirCaja,
} from '../../../../wailsjs/go/main/App';
import { Alert, AlertIcon, AlertContent, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function AperturaCajaPage() {
  const { user } = useAuth();
  const { store } = useActivation();

  // SucursalID viene de store (ActivationProvider) — el Usuario no tiene ese campo.
  const responsableID = user?.ID ?? user?.id ?? null;
  const sucursalID    = store?.ID ?? store?.id ?? 0;

  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState(false);

  const [opSucursal, setOpSucursal]   = useState(null);
  const [turnoActivo, setTurnoActivo] = useState(null);

  const [cajaNombre, setCajaNombre]       = useState('');
  const [fondoApertura, setFondoApertura] = useState('');

  useEffect(() => {
    // Esperar a que ActivationProvider (store) y AuthProvider (user) estén listos
    if (!sucursalID && !responsableID) {
      setLoading(true);
      return;
    }

    const fetchEstado = async () => {
      try {
        if (sucursalID) {
          const resSuc = await ServiceObtenerOperacionSucursalActiva(sucursalID);
          setOpSucursal(resSuc?.success ? resSuc.data : null);
        }
        if (responsableID) {
          const resCaj = await ServiceObtenerOperacionCajeroActiva(responsableID);
          setTurnoActivo(resCaj?.success && resCaj.data ? resCaj.data : null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchEstado();
  }, [sucursalID, responsableID]);

  const handleAbrir = async (e) => {
    e.preventDefault();
    if (!cajaNombre.trim()) { toast.error('Ingresa el nombre o identificador de la caja'); return; }
    if (!fondoApertura || isNaN(parseFloat(fondoApertura))) { toast.error('Ingresa un fondo de apertura válido'); return; }
    if (!opSucursal?.ID && !opSucursal?.id) { toast.error('No hay jornada activa en la sucursal'); return; }
    if (!responsableID) { toast.error('No se pudo identificar al cajero'); return; }

    setSubmitting(true);
    try {
      const res = await ServiceAbrirCaja({
        OperacionSucursalID: opSucursal?.ID || opSucursal?.id,
        ResponsableCajaID:   responsableID,
        CajaNombre:          cajaNombre.trim(),
        FondoCajaApertura:   parseFloat(fondoApertura),
      });
      if (res?.success) {
        setSuccess(true);
        setTurnoActivo(res.data);
        toast.success('Caja abierta correctamente');
      } else {
        toast.error(res?.message || 'Error al abrir la caja');
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle">
        <RefreshCw className="size-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // ── Turno ya abierto ───────────────────────────────────────────────────────
  if (turnoActivo) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle p-4">
        <div className="w-full max-w-md rounded-2xl border border-success/30 bg-surface shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8 text-center">
            <CheckCircle className="mx-auto size-14 text-white mb-3" />
            <h1 className="text-2xl font-bold text-white">Caja Abierta</h1>
            <p className="text-emerald-100 text-sm mt-1">Tu turno ya está activo</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="rounded-xl bg-bg-subtle border border-border p-4 space-y-3">
              <InfoRow icon={Store}  label="Caja"          value={turnoActivo?.CajaNombre || turnoActivo?.cajaNombre || '—'} />
              <InfoRow icon={User}   label="Responsable"   value={turnoActivo?.ResponsableCaja?.Nombre || turnoActivo?.responsableCaja?.nombre || '—'} />
              <InfoRow icon={Wallet} label="Fondo Apertura" value={`$${Number(turnoActivo?.FondoCajaApertura || turnoActivo?.fondoCajaApertura || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Para cerrar tu turno, ve a <span className="font-semibold text-foreground">Cierre de Caja</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Sin jornada activa ─────────────────────────────────────────────────────
  if (!opSucursal) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle p-4">
        <Alert variant="warning" appearance="light" size="lg" className="w-full max-w-md shadow-lg">
          <AlertIcon>
            <AlertCircle />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Sin Jornada Activa</AlertTitle>
            <AlertDescription>
              No hay una jornada de sucursal activa. El supervisor debe iniciar la jornada antes de abrir cajas.
            </AlertDescription>
          </AlertContent>
        </Alert>
      </div>
    );
  }

  // ── Formulario de apertura ─────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle p-4 animate-fade-in">
      <div className="w-full max-w-md">

        {/* Header card */}
        <div className="rounded-t-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-7 text-center shadow-lg">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Wallet className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Apertura de Caja</h1>
          <p className="text-indigo-200 text-sm mt-1">Inicia tu turno de cajero</p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleAbrir}
          className="rounded-b-2xl border border-border border-t-0 bg-surface shadow-lg p-6 space-y-5"
        >
          {/* Jornada activa badge */}
          <Alert variant="success" appearance="light" size="sm" className="mb-2">
            <AlertIcon>
              <CheckCircle />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>Jornada de sucursal activa</AlertTitle>
            </AlertContent>
          </Alert>

          {/* Nombre de la caja */}
          <div className="space-y-1.5">
            <label htmlFor="cajaNombre" className="text-sm font-medium text-foreground">
              Identificador de Caja
            </label>
            <input
              id="cajaNombre"
              type="text"
              placeholder="Ej: CAJA-01, Terminal Norte"
              value={cajaNombre}
              onChange={(e) => setCajaNombre(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition disabled:opacity-50"
            />
          </div>

          {/* Fondo de apertura */}
          <div className="space-y-1.5">
            <label htmlFor="fondoApertura" className="text-sm font-medium text-foreground">
              Fondo de Apertura
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">$</span>
              <input
                id="fondoApertura"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={fondoApertura}
                onChange={(e) => setFondoApertura(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-border bg-bg-subtle pl-7 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-muted-foreground">Efectivo con el que inicias el turno</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all shadow-md',
              submitting
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]',
            )}
          >
            {submitting
              ? <><RefreshCw className="size-4 animate-spin" /> Abriendo caja...</>
              : <><Lock className="size-4" /> Abrir Caja</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}
