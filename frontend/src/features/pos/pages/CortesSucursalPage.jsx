import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Building2, RefreshCw, Play, Square, Users, DollarSign, Banknote, CreditCard, FileText, MoreHorizontal, BarChart3, Package, PackageX, ShoppingCart, BadgePercent, TrendingUp, SlidersHorizontal, AlertCircle } from 'lucide-react';
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
  { id: 'financiero', label: 'Financiero', icon: BarChart3 },
  { id: 'jornada', label: 'Jornada', icon: Building2 },
  { id: 'cajas', label: 'Turnos', icon: Users },
];

const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const fmtDate = (d) => d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export function CortesSucursalPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { store, isInitialized } = useActivation();

  // SucursalID viene de store (ActivationProvider) — el Usuario no tiene ese campo.
  const sucursalID = store?.ID ?? store?.id ?? 0;
  const userID = user?.ID ?? user?.id ?? 0;

  const [activeTab, setActiveTab] = useState('financiero');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [opSucursal, setOpSucursal] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [inventario, setInventario] = useState(0);

  const [alertAction, setAlertAction] = useState(null);

  const fetchDatos = useCallback(async () => {
    if (!sucursalID) return; // Esperar a que store esté cargado
    setLoading(true);
    try {
      const res = await ServiceObtenerOperacionSucursalActiva(sucursalID);
      const op = res?.success ? res.data : null;
      console.log(res)
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
        Sucursal: sucursalID,
        Usuario: userID,
        ValorInventarioInicial: inventario,
        FechaInicio: new Date().toISOString(),
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
    const cajasAbiertas = turnos.filter(turno => {
      const estatusID = turno?.EstatusID ?? turno?.estatusID;
      const fechaFin = turno?.FechaFin ?? turno?.fechaFin;
      return Number(estatusID) === 1 && !fechaFin;
    });
    if (cajasAbiertas.length > 0) {
      setActiveTab('cajas');
      setAlertAction('cajas-abiertas');
      return;
    }
    setAlertAction('cerrar');
  };

  const confirmCerrarJornada = async () => {
    setAlertAction(null);
    setSubmitting(true);
    try {
      const res = await ServiceCerrarOperacionSucursal({
        OperacionID: opSucursal?.ID || opSucursal?.id,
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

  const estatusJornadaID = opSucursal?.EstatusID ?? opSucursal?.estatusID;
  const jornadaActiva = Boolean(opSucursal && Number(estatusJornadaID) === 1);
  const tituloJornada = jornadaActiva ? 'Cierre de jornada' : 'Iniciar jornada';
  const turnosActivos = turnos.filter((turno) => {
    const estatusID = turno?.EstatusID ?? turno?.estatusID;
    const fechaFin = turno?.FechaFin ?? turno?.fechaFin;
    return Number(estatusID) === 1 && !fechaFin;
  });
  const turnosCerrados = turnos.length - turnosActivos.length;
  const ingresosFormaPago = [
    { label: 'Efectivo', value: opSucursal?.IngresoEfectivo || opSucursal?.ingresoEfectivo, icon: Banknote, tone: 'emerald' },
    { label: 'Tarjetas', value: opSucursal?.IngresoTarjetas || opSucursal?.ingresoTarjetas, icon: CreditCard, tone: 'blue' },
    { label: 'Cheques', value: opSucursal?.IngresoCheques || opSucursal?.ingresoCheques, icon: FileText, tone: 'amber' },
    { label: 'Transferencia', value: opSucursal?.IngresoTransferencia || opSucursal?.ingresoTransferencia, icon: ArrowDownLeft, tone: 'violet' },
    { label: 'Otros', value: opSucursal?.IngresoOtros || opSucursal?.ingresoOtros, icon: MoreHorizontal, tone: 'cyan' },
  ];
  const cfdiFormaPago = [
    { label: 'Efectivo', value: opSucursal?.CFDIEfectivo || opSucursal?.cfdiEfectivo, icon: Banknote, tone: 'emerald' },
    { label: 'Tarjetas', value: opSucursal?.CFDITarjetas || opSucursal?.cfdiTarjetas, icon: CreditCard, tone: 'blue' },
    { label: 'Cheques', value: opSucursal?.CFDICheques || opSucursal?.cfdiCheques, icon: FileText, tone: 'amber' },
    { label: 'Transferencia', value: opSucursal?.CFDITransferencia || opSucursal?.cfdiTransferencia, icon: ArrowDownLeft, tone: 'violet' },
    { label: 'Otros', value: opSucursal?.CFDIOtros || opSucursal?.cfdiOtros, icon: MoreHorizontal, tone: 'cyan' },
  ];
  const totalIngresos = ingresosFormaPago.reduce((total, item) => total + Number(item.value || 0), 0);
  const totalCFDI = cfdiFormaPago.reduce((total, item) => total + Number(item.value || 0), 0);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle">
        <RefreshCw className="size-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden animate-fade-in">

      {/* ── Page Header + Tabs ──────────────────────────────────────────── */}
      <div className="shrink-0 px-5 pt-5 lg:px-6 lg:pt-6">
        <div className="mx-auto max-w-[1320px]">
          <nav className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <button type="button" onClick={() => navigate('/home')} className="transition hover:text-primary">Home</button>
            <span>/</span>
            <span className="text-foreground">{tituloJornada}</span>
          </nav>

          {/* Título + badge estado */}
          <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Building2 className="size-6" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">{tituloJornada}</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {jornadaActiva
                    ? 'Control y seguimiento de la operación diaria de la sucursal.'
                    : 'Inicia la operación diaria para habilitar las cajas de la sucursal.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn('hidden items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold sm:flex', jornadaActiva ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-border bg-muted text-muted-foreground')}>
                <span className={cn('size-1.5 rounded-full', jornadaActiva ? 'bg-emerald-500' : 'bg-muted-foreground')} />
                {jornadaActiva ? 'Jornada activa' : 'Sin jornada activa'}
              </div>
              <button type="button" onClick={() => navigate('/home')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-xs font-semibold text-foreground transition hover:bg-muted">
                <ArrowLeft className="size-4" /> Volver al inicio
              </button>
            </div>
          </header>

          {/* Tabs */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex h-[58px] items-center gap-7 overflow-x-auto border-b border-border/70 px-5" role="tablist">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'relative flex h-full shrink-0 items-center gap-1.5 px-1 text-xs font-semibold transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors',
                      isActive
                        ? 'text-primary after:bg-primary'
                        : 'text-muted-foreground after:bg-transparent hover:text-foreground',
                    )}
                  >
                    <tab.icon className="size-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="mx-auto max-w-[1320px]">

          {/* ── JORNADA ───────────────────────────────────────────────────── */}
          {activeTab === 'jornada' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.015em] text-foreground">Estado de la jornada</h2>
                <p className="mt-1 text-xs text-muted-foreground">Consulta el periodo operativo, el inventario y los turnos asociados.</p>
              </div>

              {jornadaActiva ? (
                <>
                  <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                    <div className="flex flex-col justify-between gap-5 border-b border-[#e5edf8]/80 bg-gradient-to-r from-blue-500/[.075] via-blue-500/[.025] to-transparent px-5 py-5 dark:border-white/10 dark:from-blue-400/[.09] sm:flex-row sm:items-center">
                      <div className="flex items-center gap-4">
                        <div className={cn('flex size-11 items-center justify-center rounded-xl', jornadaActiva ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground')}>
                          <Building2 className="size-5" strokeWidth={1.8} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">Operación de sucursal</h3>
                            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', jornadaActiva ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-border bg-muted text-muted-foreground')}>
                              {jornadaActiva ? 'Activa' : 'Cerrada'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">Inició el {fmtDate(opSucursal?.FechaInicio || opSucursal?.fechaInicio)}</p>
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Finalización</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{jornadaActiva ? 'Operación en curso' : fmtDate(opSucursal?.FechaFin || opSucursal?.fechaFin)}</p>
                      </div>
                    </div>
                    <div className="grid gap-px bg-border/50 sm:grid-cols-2 xl:grid-cols-4">
                      <JornadaMetric icon={Package} label="Inventario inicial" value={fmt(opSucursal?.ValorInicialInventario || opSucursal?.valorInicialInventario)} tone="violet" />
                      <JornadaMetric icon={DollarSign} label="Inventario actual" value={fmt(inventario)} tone="blue" />
                      <JornadaMetric icon={Users} label="Turnos registrados" value={turnos.length} tone="cyan" />
                      <JornadaMetric icon={AlertCircle} label="Turnos abiertos" value={turnosActivos.length} tone={turnosActivos.length ? 'amber' : 'emerald'} />
                    </div>
                  </section>

                  {turnosActivos.length > 0 && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-300/45 bg-amber-50/55 px-4 py-3 text-amber-900 dark:border-amber-400/15 dark:bg-amber-400/[.055] dark:text-amber-200">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-xs font-semibold">Hay {turnosActivos.length} {turnosActivos.length === 1 ? 'caja abierta' : 'cajas abiertas'}</p>
                        <p className="mt-0.5 text-[11px] opacity-75">Todos los turnos deben cerrarse antes de finalizar la jornada.</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-amber-300/45 bg-amber-50/45 px-6 py-10 text-center shadow-[0_16px_36px_-30px_rgba(217,119,6,.6)] backdrop-blur-xl dark:border-amber-400/15 dark:bg-amber-400/[.045]">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Building2 className="size-6" strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">La sucursal no tiene una jornada activa</h3>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">Inicia una jornada para habilitar la apertura de cajas y registrar la operación del día.</p>
                </div>
              )}
            </div>
          )}

          {/* ── TURNOS ────────────────────────────────────────────────────── */}
          {activeTab === 'cajas' && (
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.015em] text-foreground">Turnos de caja</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Seguimiento de responsables, horarios y fondos durante la jornada.</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">{turnosActivos.length} abiertos</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{turnosCerrados} cerrados</span>
                </div>
              </div>

              <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                <div className="flex items-center gap-3 border-b border-[#e5edf8]/80 bg-gradient-to-r from-blue-500/[.065] via-blue-500/[.02] to-transparent px-5 py-4 dark:border-white/10 dark:from-blue-400/[.08]">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Registro de turnos</h3>
                    <p className="text-[11px] text-muted-foreground">{turnos.length} {turnos.length === 1 ? 'turno registrado' : 'turnos registrados'}</p>
                  </div>
                </div>

                {turnos.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground"><Users className="size-5" /></div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">Aún no hay turnos registrados</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Los turnos aparecerán aquí cuando una caja inicie operación.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left">
                      <thead className="border-b border-border/60 bg-muted/20 text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
                        <tr>
                          <th className="px-5 py-3">Caja</th>
                          <th className="px-4 py-3">Responsable</th>
                          <th className="px-4 py-3">Inicio</th>
                          <th className="px-4 py-3 text-right">Fondo apertura</th>
                          <th className="px-4 py-3">Cierre</th>
                          <th className="px-5 py-3 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/55">
                        {turnos.map((turno) => {
                          const fechaFin = turno?.FechaFin ?? turno?.fechaFin;
                          const activo = Number(turno?.EstatusID ?? turno?.estatusID) === 1 && !fechaFin;
                          return (
                            <tr key={turno?.ID || turno?.id} className="transition-colors hover:bg-blue-500/[.025]">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <span className={cn('size-2 rounded-full', activo ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.1)]' : 'bg-slate-300 dark:bg-slate-600')} />
                                  <span className="text-xs font-semibold text-foreground">{turno?.CajaNombre || turno?.cajaNombre || 'Caja sin nombre'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-xs text-foreground">{turno?.ResponsableCaja?.Nombre || turno?.responsableCaja?.nombre || '—'}</td>
                              <td className="px-4 py-4 text-xs text-muted-foreground">{fmtDate(turno?.FechaInicio || turno?.fechaInicio)}</td>
                              <td className="px-4 py-4 text-right text-xs font-semibold text-foreground">{fmt(turno?.FondoCajaApertura || turno?.fondoCajaApertura)}</td>
                              <td className="px-4 py-4">
                                {fechaFin ? (
                                  <div><p className="text-xs text-muted-foreground">{fmtDate(fechaFin)}</p><p className="mt-0.5 text-[11px] font-semibold text-foreground">{fmt(turno?.FondoCajaCierre || turno?.fondoCajaCierre)}</p></div>
                                ) : <span className="text-xs text-muted-foreground">Pendiente</span>}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold', activo ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-border bg-muted/60 text-muted-foreground')}>
                                  {activo ? 'Abierto' : 'Cerrado'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ── FINANCIERO ────────────────────────────────────────────────── */}
          {activeTab === 'financiero' && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">Acumulados financieros de la jornada.</p>

              {!opSucursal ? (
                <div className="rounded-2xl border border-white/70 bg-white/65 p-8 text-center shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                  <AlertCircle className="mx-auto size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No hay jornada disponible.</p>
                </div>
              ) : (
                <>
                  <Section title="Ventas e Inventario" icon={Package} iconColor="text-violet-500" contentClassName="p-0">
                    <div className="grid gap-px bg-border/60 md:grid-cols-2">
                      <FinancialMetric icon={Package} tone="violet" label="Valor inventario inicial" value={fmt(opSucursal?.ValorInicialInventario || opSucursal?.valorInicialInventario)} />
                      <FinancialMetric icon={CreditCard} tone="amber" label="Ventas a crédito" value={fmt(opSucursal?.Creditos || opSucursal?.creditos)} />
                      <FinancialMetric icon={ShoppingCart} tone="blue" label="Valor de las compras" value={fmt(opSucursal?.ValorCompras || opSucursal?.valorCompras)} />
                      <FinancialMetric icon={ArrowDownLeft} tone="emerald" label="Transferencias entrantes" value={fmt(opSucursal?.TransferenciasEntrantes || opSucursal?.transferenciasEntrantes)} />
                      <FinancialMetric icon={BarChart3} tone="blue" label="Valor bruto de las ventas" value={fmt(opSucursal?.ValorBrutoVentas || opSucursal?.valorBrutoVentas)} />
                      <FinancialMetric icon={ArrowUpRight} tone="amber" label="Transferencias de salida" value={fmt(opSucursal?.TransferenciasSalientes || opSucursal?.transferenciasSalientes)} />
                      <FinancialMetric icon={BadgePercent} tone="amber" label="Descuentos aplicados" value={fmt(opSucursal?.DescuentosAplicados || opSucursal?.descuentosAplicados)} />
                      <FinancialMetric icon={PackageX} tone="rose" label="Bajas de mercancía" value={fmt(opSucursal?.BajasMercancia || opSucursal?.bajasMercancia)} />
                      <FinancialMetric icon={TrendingUp} tone="emerald" label="Valor real de las ventas" value={fmt(opSucursal?.ValorVentas || opSucursal?.valorVentas)} highlight />
                      <FinancialMetric icon={SlidersHorizontal} tone="cyan" label="Ajuste de inventario" value={fmt(opSucursal?.AjusteInventario || opSucursal?.ajusteInventario)} />
                      <div className="hidden bg-white/75 dark:bg-white/[.025] md:block" aria-hidden="true" />
                      <FinancialMetric icon={DollarSign} tone="blue" label="Valor final inventario" value={fmt(opSucursal?.ValorFinalInventario || opSucursal?.valorFinalInventario)} highlight />
                    </div>
                  </Section>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-2" aria-hidden="true">
                      <span className="h-px flex-1 bg-border/80" />
                      <span className="size-1.5 rounded-full bg-border" />
                      <span className="h-px flex-1 bg-border/80" />
                    </div>
                    <div className="grid gap-px overflow-hidden rounded-2xl border border-white/70 bg-border/60 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 md:grid-cols-2">
                      <FinancialColumn title="Ingresos por forma de pago" icon={DollarSign} iconColor="text-emerald-500">
                        {ingresosFormaPago.map(item => (
                          <FinancialMetric key={item.label} icon={item.icon} tone={item.tone} label={item.label} value={fmt(item.value)} />
                        ))}
                        <FinancialMetric icon={DollarSign} tone="emerald" label="Total ingresos" value={fmt(totalIngresos)} highlight />
                      </FinancialColumn>
                      <FinancialColumn title="CFDI por forma de pago" icon={FileText} iconColor="text-amber-500">
                      {cfdiFormaPago.map(item => (
                        <FinancialMetric key={item.label} icon={item.icon} tone={item.tone} label={item.label} value={fmt(item.value)} />
                      ))}
                      <FinancialMetric icon={FileText} tone="amber" label="Total facturado" value={fmt(totalCFDI)} highlight />
                      </FinancialColumn>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {(activeTab === 'jornada' || activeTab === 'financiero') && (
        <footer className="shrink-0 border-t border-white/70 bg-white/78 px-5 py-3.5 shadow-[0_-14px_38px_-32px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-background/85 lg:px-6">
          <div className="mx-auto flex max-w-[1320px] items-center justify-end gap-3">
            <button onClick={fetchDatos} disabled={loading} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/75 px-4 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50">
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> Actualizar
            </button>
            {!jornadaActiva && (
              <button onClick={handleIniciarJornada} disabled={submitting || !sucursalID} className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white shadow-[0_10px_24px_-14px_rgba(5,150,105,.8)] transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />} Iniciar jornada
              </button>
            )}
            {jornadaActiva && (
              <button onClick={handleCerrarJornada} disabled={submitting} className="flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-xs font-semibold text-white shadow-[0_10px_24px_-14px_rgba(225,29,72,.75)] transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? <RefreshCw className="size-4 animate-spin" /> : <Square className="size-4" />} Cerrar jornada
              </button>
            )}
          </div>
        </footer>
      )}

      <DialogAlert
        open={alertAction !== null}
        onOpenChange={(open) => !open && setAlertAction(null)}
        title={alertAction === 'iniciar' ? 'Iniciar Jornada' : alertAction === 'cajas-abiertas' ? 'Hay cajas abiertas' : 'Cerrar Jornada'}
        description={alertAction === 'iniciar'
          ? '¿Confirmas iniciar la jornada de esta sucursal?'
          : alertAction === 'cajas-abiertas'
            ? 'Debes cerrar todos los turnos de caja antes de cerrar la jornada de la sucursal.'
            : '¿Confirmas cerrar la jornada? Los acumulados se calcularán automáticamente.'}
        onConfirm={alertAction === 'iniciar' ? confirmIniciarJornada : alertAction === 'cerrar' ? confirmCerrarJornada : undefined}
        onCancel={() => setAlertAction(null)}
        type={alertAction === 'iniciar' ? 'success' : 'warning'}
      />
    </div>
  );
}

function JornadaMetric({ icon: Icon, label, value, tone }) {
  const tones = {
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  };
  return (
    <div className="flex items-center gap-3 bg-white/75 px-5 py-5 dark:bg-white/[.025]">
      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', tones[tone] || tones.blue)}>
        <Icon className="size-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[.08em] text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, iconColor, contentClassName, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
      <div className="flex items-center gap-2 border-b border-[#e5edf8]/80 bg-gradient-to-r from-blue-500/[.065] via-blue-500/[.025] to-transparent px-5 py-3.5 dark:border-white/10 dark:from-blue-400/[.09] dark:via-blue-400/[.025]">
        <Icon className={cn('size-4', iconColor)} />
        <h2 className="text-[11px] font-semibold uppercase tracking-[.08em] text-foreground">{title}</h2>
      </div>
      <div className={cn('px-5 py-1', contentClassName)}>{children}</div>
    </div>
  );
}

function FinancialColumn({ title, icon: Icon, iconColor, children }) {
  return (
    <section className="grid content-start gap-px bg-border/60">
      <div className="flex items-center gap-2 border-b border-[#e5edf8]/80 bg-gradient-to-r from-blue-500/[.065] via-blue-500/[.025] to-transparent px-5 py-3.5 dark:border-white/10 dark:from-blue-400/[.09] dark:via-blue-400/[.025]">
        <Icon className={cn('size-4', iconColor)} strokeWidth={1.8} />
        <h2 className="text-[11px] font-semibold uppercase tracking-[.08em] text-foreground">{title}</h2>
      </div>
      <div className="grid gap-px bg-border/60">{children}</div>
    </section>
  );
}

function FinancialMetric({ icon: Icon, tone, label, value, highlight }) {
  const tones = {
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  };

  return (
    <div className="flex min-h-[76px] items-center gap-3 bg-white/75 px-4 py-3 dark:bg-white/[.025]">
      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tones[tone] || tones.blue)}>
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-semibold uppercase tracking-[.09em] text-muted-foreground">{label}</p>
        <p className={cn('mt-0.5 text-base font-semibold tracking-[-0.015em]', highlight ? 'text-primary' : 'text-foreground')}>{value}</p>
      </div>
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
