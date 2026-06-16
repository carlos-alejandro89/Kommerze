import { useState, useEffect, useCallback } from 'react';
import { Building2, RefreshCw, Play, Square, Users, DollarSign, Banknote, CreditCard, FileText, MoreHorizontal, BarChart3, Package, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import { DialogAlert } from '@/components/common/dialog-alert';
import {
  ServiceObtenerOperacionSucursalActiva,
  ServiceObtenerValorInventario,
  ServiceSucursalInicioOperacion,
  ServiceCerrarOperacionSucursal,
  ServiceObtenerOperacionesCajero,
} from '../../../../wailsjs/go/main/App';

const TABS = [
  { id: 'jornada',    label: 'Jornada',    icon: Building2 },
  { id: 'cajas',      label: 'Turnos',     icon: Users },
  { id: 'financiero', label: 'Financiero', icon: BarChart3 },
];

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const fmtDate = (d) => d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export function CortesSucursalPage() {
  const { user } = useAuth();
  const { store, isInitialized } = useActivation();

  // SucursalID viene de store (ActivationProvider) — el Usuario no tiene ese campo.
  const sucursalID = store?.ID ?? store?.id ?? 0;
  const userID     = user?.ID ?? user?.id ?? 0;

  const [activeTab, setActiveTab]     = useState('jornada');
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);

  const [opSucursal, setOpSucursal]   = useState(null);
  const [turnos, setTurnos]           = useState([]);
  const [inventario, setInventario]   = useState(0);

  const [alertAction, setAlertAction] = useState(null);

  const fetchDatos = useCallback(async () => {
    if (!sucursalID) return; // Esperar a que store esté cargado
    setLoading(true);
    try {
      const res = await ServiceObtenerOperacionSucursalActiva(sucursalID);
      const op = res?.success ? res.data : null;
      setOpSucursal(op);

      if (op?.ID || op?.id) {
        const opID = op?.ID || op?.id;
        const resTurnos = await ServiceObtenerOperacionesCajero(opID);
        setTurnos(resTurnos?.success ? (resTurnos.data || []) : []);
      } else {
        setTurnos([]);
      }
      const resInv = await ServiceObtenerValorInventario();
      setInventario(resInv?.success ? (resInv.data || 0) : 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sucursalID]);

  useEffect(() => {
    if (!isInitialized) {
      setLoading(true);
      return;
    }
    
    if (sucursalID) {
      fetchDatos();
    } else {
      setLoading(false);
    }
  }, [fetchDatos, sucursalID, isInitialized]);

  // ── Iniciar jornada ───────────────────────────────────────────────────────
  const handleIniciarJornada = async () => {
    if (!sucursalID) {
      toast.error('No se ha detectado una sucursal válida.');
      return;
    }
    setAlertAction('iniciar');
  };

  const confirmIniciarJornada = async () => {
    setAlertAction(null);
    setSubmitting(true);
    try {
      const res = await ServiceSucursalInicioOperacion({
        Sucursal:               sucursalID,
        Usuario:                userID,
        ValorInventarioInicial: inventario,
        FechaInicio:            new Date().toISOString(),
      });
      if (res?.success) {
        toast.success('Jornada iniciada correctamente');
        await fetchDatos();
      } else {
        toast.error(res?.message || 'Error al iniciar jornada');
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cerrar jornada ────────────────────────────────────────────────────────
  const handleCerrarJornada = async () => {
    if (!opSucursal) return;
    setAlertAction('cerrar');
  };

  const confirmCerrarJornada = async () => {
    setAlertAction(null);
    setSubmitting(true);
    try {
      const res = await ServiceCerrarOperacionSucursal({
        OperacionID:     opSucursal?.ID || opSucursal?.id,
        UsuarioCierreID: userID,
      });
      if (res?.success) {
        toast.success('Jornada cerrada correctamente');
        setOpSucursal(res.data);
        await fetchDatos();
      } else {
        toast.error(res?.message || 'Error al cerrar jornada');
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const jornadaActiva = opSucursal && (opSucursal?.EstatusID === 1 || opSucursal?.estatusID === 1);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle">
        <RefreshCw className="size-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-bg-subtle animate-fade-in">

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <div className="w-[200px] shrink-0 border-r border-border bg-surface p-4 hidden md:flex md:flex-col">
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="size-4 text-primary" /> Corte Sucursal
        </h2>
        <nav className="space-y-1 flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Estado jornada */}
        <div className={cn(
          'rounded-lg border px-3 py-2.5 text-center',
          jornadaActiva
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-muted border-border'
        )}>
          <div className={cn('text-xs font-bold', jornadaActiva ? 'text-emerald-600' : 'text-muted-foreground')}>
            {jornadaActiva ? '● JORNADA ACTIVA' : '○ SIN JORNADA'}
          </div>
          {jornadaActiva && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Desde {fmtDate(opSucursal?.FechaInicio || opSucursal?.fechaInicio)}
            </div>
          )}
        </div>
      </div>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        {/* ── JORNADA TAB ──────────────────────────────────────────────── */}
        {activeTab === 'jornada' && (
          <div className="max-w-xl space-y-5">
            <div>
              <h1 className="text-xl font-bold text-foreground">Estado de la Jornada</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Controla el inicio y cierre de la jornada de la sucursal.</p>
            </div>

            {/* Info jornada */}
            {opSucursal ? (
              <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
                <div className={cn(
                  'px-5 py-4 flex items-center justify-between',
                  jornadaActiva ? 'bg-emerald-600' : 'bg-muted',
                )}>
                  <div>
                    <p className={cn('text-xs font-semibold uppercase tracking-wider', jornadaActiva ? 'text-emerald-100' : 'text-muted-foreground')}>
                      {jornadaActiva ? 'Jornada Activa' : 'Jornada Cerrada'}
                    </p>
                    <p className={cn('text-lg font-bold mt-0.5', jornadaActiva ? 'text-white' : 'text-foreground')}>
                      Inicio: {fmtDate(opSucursal?.FechaInicio || opSucursal?.fechaInicio)}
                    </p>
                  </div>
                  <div className={cn(
                    'flex size-10 items-center justify-center rounded-xl',
                    jornadaActiva ? 'bg-white/20' : 'bg-muted',
                  )}>
                    <Building2 className={cn('size-5', jornadaActiva ? 'text-white' : 'text-muted-foreground')} />
                  </div>
                </div>

                <div className="p-5 grid grid-cols-2 gap-3">
                  <StatCell label="Inventario Inicial" value={fmt(opSucursal?.ValorInicialInventario || opSucursal?.valorInicialInventario)} />
                  <StatCell label="Turno Cajeros" value={turnos.length} />
                  {opSucursal?.FechaFin && (
                    <StatCell label="Fecha Cierre" value={fmtDate(opSucursal.FechaFin || opSucursal.fechaFin)} colSpan />
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-warning/30 bg-surface shadow-sm p-6 text-center space-y-3">
                <AlertCircle className="mx-auto size-10 text-warning" />
                <p className="text-sm text-muted-foreground">No hay jornada activa en esta sucursal.</p>
              </div>
            )}

            {/* Inventario actual */}
            <div className="rounded-xl border border-border bg-surface shadow-sm p-4 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10">
                <Package className="size-4 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor inventario actual</p>
                <p className="text-base font-bold text-foreground">{fmt(inventario)}</p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              {!jornadaActiva && (
                <button
                  onClick={handleIniciarJornada}
                  disabled={submitting || !!opSucursal || !sucursalID}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all shadow-md',
                    submitting || !!opSucursal
                      ? 'bg-emerald-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]',
                  )}
                >
                  {submitting ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Iniciar Jornada
                </button>
              )}
              {jornadaActiva && (
                <button
                  onClick={handleCerrarJornada}
                  disabled={submitting}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all shadow-md',
                    submitting
                      ? 'bg-rose-400 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-500 active:scale-[0.98]',
                  )}
                >
                  {submitting ? <RefreshCw className="size-4 animate-spin" /> : <Square className="size-4" />}
                  Cerrar Jornada
                </button>
              )}
              <button
                onClick={fetchDatos}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs font-medium text-muted-foreground hover:bg-muted transition"
              >
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                Actualizar
              </button>
            </div>
          </div>
        )}

        {/* ── CAJAS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'cajas' && (
          <div className="max-w-2xl space-y-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Turnos de Cajero</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{turnos.length} turno(s) en la jornada actual.</p>
            </div>

            {turnos.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface shadow-sm p-8 text-center">
                <Users className="mx-auto size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No hay turnos de cajero registrados aún.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {turnos.map((turno) => {
                  const activo = turno?.EstatusID === 1 || turno?.estatusID === 1;
                  return (
                    <div key={turno?.ID || turno?.id} className="rounded-xl border border-border bg-surface shadow-sm p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'size-2.5 rounded-full',
                            activo ? 'bg-emerald-500' : 'bg-muted-foreground',
                          )} />
                          <span className="text-sm font-semibold text-foreground">
                            {turno?.CajaNombre || turno?.cajaNombre || 'Sin nombre'}
                          </span>
                        </div>
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full',
                          activo
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-muted text-muted-foreground',
                        )}>
                          {activo ? 'ACTIVO' : 'CERRADO'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <MiniStat label="Cajero"   value={turno?.ResponsableCaja?.Nombre || turno?.responsableCaja?.nombre || '—'} />
                        <MiniStat label="Apertura" value={fmt(turno?.FondoCajaApertura || turno?.fondoCajaApertura)} />
                        <MiniStat label="Cierre"   value={turno?.FechaFin ? fmt(turno?.FondoCajaCierre || turno?.fondoCajaCierre) : '—'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FINANCIERO TAB ───────────────────────────────────────────── */}
        {activeTab === 'financiero' && (
          <div className="max-w-xl space-y-5">
            <div>
              <h1 className="text-xl font-bold text-foreground">Resumen Financiero</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Acumulados de la jornada.</p>
            </div>

            {!opSucursal ? (
              <div className="rounded-xl border border-border bg-surface shadow-sm p-8 text-center">
                <AlertCircle className="mx-auto size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No hay jornada disponible.</p>
              </div>
            ) : (
              <>
                {/* Ventas */}
                <Section title="Ventas e Inventario" icon={Package} iconColor="text-violet-500">
                  <Row label="Inventario Inicial" value={fmt(opSucursal?.ValorInicialInventario || opSucursal?.valorInicialInventario)} />
                  <Row label="Valor Ventas"        value={fmt(opSucursal?.ValorVentas || opSucursal?.valorVentas)} highlight />
                  <Row label="Descuentos"           value={fmt(opSucursal?.DescuentosAplicados || opSucursal?.descuentosAplicados)} />
                  <Row label="Inventario Final"    value={fmt(opSucursal?.ValorFinalInventario || opSucursal?.valorFinalInventario)} />
                </Section>

                {/* Ingresos */}
                <Section title="Ingresos por Forma de Pago" icon={DollarSign} iconColor="text-emerald-500">
                  {[
                    { label: 'Efectivo',      val: opSucursal?.IngresoEfectivo      || opSucursal?.ingresoEfectivo,      icon: Banknote,       color: 'text-emerald-500' },
                    { label: 'Tarjetas',      val: opSucursal?.IngresoTarjetas      || opSucursal?.ingresoTarjetas,      icon: CreditCard,     color: 'text-blue-500' },
                    { label: 'Cheques',       val: opSucursal?.IngresoCheques       || opSucursal?.ingresoCheques,       icon: FileText,       color: 'text-amber-500' },
                    { label: 'Transferencia', val: opSucursal?.IngresoTransferencia || opSucursal?.ingresoTransferencia, icon: DollarSign,     color: 'text-violet-500' },
                    { label: 'Otros',         val: opSucursal?.IngresoOtros         || opSucursal?.ingresoOtros,         icon: MoreHorizontal, color: 'text-muted-foreground' },
                  ].map(({ label, val, icon: Icon, color }) => (
                    <div key={label} className="flex items-center gap-2 py-2.5 border-b border-border last:border-0">
                      <Icon className={cn('size-3.5 shrink-0', color)} />
                      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-semibold text-foreground">{fmt(val)}</span>
                    </div>
                  ))}
                </Section>

                {/* CFDI */}
                <Section title="CFDI por Forma de Pago" icon={FileText} iconColor="text-amber-500">
                  {[
                    ['Efectivo',      'CFDIEfectivo',      'cfdiEfectivo'],
                    ['Tarjetas',      'CFDITarjetas',      'cfdiTarjetas'],
                    ['Cheques',       'CFDICheques',       'cfdiCheques'],
                    ['Transferencia', 'CFDITransferencia', 'cfdiTransferencia'],
                    ['Otros',         'CFDIOtros',         'cfdiOtros'],
                  ].map(([label, key1, key2]) => (
                    <Row key={label} label={label} value={`${opSucursal?.[key1] || opSucursal?.[key2] || 0} cfdi`} />
                  ))}
                </Section>
              </>
            )}
          </div>
        )}
      </div>

      <DialogAlert 
        open={alertAction !== null} 
        onOpenChange={(open) => !open && setAlertAction(null)}
        title={alertAction === 'iniciar' ? 'Iniciar Jornada' : 'Cerrar Jornada'}
        description={alertAction === 'iniciar' ? '¿Confirmas iniciar la jornada de esta sucursal?' : '¿Confirmas cerrar la jornada? Los acumulados se calcularán automáticamente.'}
        onConfirm={alertAction === 'iniciar' ? confirmIniciarJornada : confirmCerrarJornada}
        onCancel={() => setAlertAction(null)}
        type={alertAction === 'iniciar' ? 'success' : 'warning'}
      />
    </div>
  );
}

function StatCell({ label, value, colSpan }) {
  return (
    <div className={cn('rounded-lg bg-bg-subtle border border-border p-3', colSpan && 'col-span-2')}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}

function Section({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
      <div className="border-b border-border bg-bg-subtle px-5 py-3 flex items-center gap-2">
        <Icon className={cn('size-4', iconColor)} />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-semibold', highlight ? 'text-primary' : 'text-foreground')}>{value}</span>
    </div>
  );
}
