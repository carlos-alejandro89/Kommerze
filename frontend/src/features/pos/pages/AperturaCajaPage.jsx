import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Wallet, Lock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import {
  ServiceObtenerOperacionSucursalActiva,
  ServiceObtenerOperacionCajeroActiva,
  ServiceObtenerCajaConfigurada,
  ServiceAbrirCaja,
} from '../../../../wailsjs/go/main/App';
import { Alert, AlertIcon, AlertContent, AlertTitle } from '@/components/ui/alert';
import { TurnoBlockScreen } from '@/components/TurnoGuard';

export function AperturaCajaPage() {
  const { user } = useAuth();
  const { store } = useActivation();

  // SucursalID viene de store (ActivationProvider) — el Usuario no tiene ese campo.
  const responsableID = user?.ID ?? user?.id ?? null;
  const sucursalID    = store?.ID ?? store?.id ?? 0;

  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
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
        try {
          const caja = await ServiceObtenerCajaConfigurada();
          setCajaNombre(caja?.Nombre || caja?.nombre || '');
        } catch (cajaError) {
          console.error('No se pudo obtener la caja configurada', cajaError);
          setCajaNombre('');
        }
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
    if (!cajaNombre.trim()) { toast.error('No se encontró el nombre configurado para esta caja'); return; }
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
    return <Navigate to="/caja/cierre" replace />;
  }

  // ── Sin jornada activa ─────────────────────────────────────────────────────
  if (!opSucursal) {
    return (
      <TurnoBlockScreen
        variant="warning"
        icon={AlertTriangle}
        title="Sin Jornada Activa"
        subtitle="No hay una jornada de sucursal activa."
        description="El supervisor debe iniciar la jornada antes de que se puedan abrir turnos de caja."
      />
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
              placeholder="Caja no configurada"
              value={cajaNombre}
              readOnly
              aria-readonly="true"
              className="w-full cursor-default rounded-lg border border-border bg-muted/55 px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
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
