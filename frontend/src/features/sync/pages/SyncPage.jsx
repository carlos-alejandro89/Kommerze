'use client';

import * as React from 'react';
import {
  Database, RefreshCw, Users, Package, History,
  Search, LayoutGrid, AlertCircle, CheckCircle2, Clock,
  Info, ArrowRight, ListOrdered,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivation } from '@/providers/ActivationProvider';

import {
  SyncLineas, SyncMarcas, SyncEmpaques, SyncSatProductos,
  SyncProductos, SyncSatFormasPago, SyncSatMetodosPago,
  SyncSatUsosCfdi, SyncSatRegimenFiscal, SyncNivelesEmpaque,
  SyncEmpresas, SyncSucursales, SyncSucursalProductos,
  ServiceGetSucursalGuid,
} from "../../../../wailsjs/go/main/App";

// ── Definición de etapas ────────────────────────────────────────────────────
// El orden de etapas y de catálogos dentro de cada etapa es crítico:
// respeta las llaves foráneas de la BD para evitar errores de integridad.
const STAGES = [
  {
    stage: 1,
    label: 'Etapa 1 — Catálogos base',
    description: 'Sin dependencias. Pueden ejecutarse en cualquier orden.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    badgeBg: 'bg-blue-500/15 text-blue-600',
    catalogs: [
      { id: 8,  name: 'SAT Régimen Fiscal',    endpoint: '/catalogos/sat/regimen-fiscal/get',  icon: LayoutGrid, sync: SyncSatRegimenFiscal },
      { id: 6,  name: 'SAT Formas Pago',        endpoint: '/catalogos/sat/formas-pago/get',     icon: LayoutGrid, sync: SyncSatFormasPago },
      { id: 7,  name: 'SAT Métodos Pago',       endpoint: '/catalogos/sat/metodos-pago/get',    icon: LayoutGrid, sync: SyncSatMetodosPago },
      { id: 9,  name: 'SAT Usos CFDI',          endpoint: '/catalogos/sat/usos-cfdi/get',       icon: LayoutGrid, sync: SyncSatUsosCfdi },
      { id: 4,  name: 'SAT Claves Productos',   endpoint: '/catalogos/sat/productos/get',       icon: LayoutGrid, sync: SyncSatProductos },
      { id: 1,  name: 'Líneas',                 endpoint: '/catalogos/lineas/get',              icon: Package,    sync: SyncLineas },
      { id: 2,  name: 'Marcas',                 endpoint: '/catalogos/marcas/get',              icon: Users,      sync: SyncMarcas },
      { id: 3,  name: 'Empaques',               endpoint: '/catalogos/empaques/get',            icon: Database,   sync: SyncEmpaques },
    ],
  },
  {
    stage: 2,
    label: 'Etapa 2 — Depende de: SAT Régimen Fiscal',
    description: 'Requiere que el catálogo SAT Régimen Fiscal esté sincronizado.',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    badgeBg: 'bg-violet-500/15 text-violet-600',
    catalogs: [
      { id: 11, name: 'Empresas',               endpoint: '/catalogos/empresas/get',            icon: LayoutGrid, sync: SyncEmpresas },
    ],
  },
  {
    stage: 3,
    label: 'Etapa 3 — Depende de: Empresas + Líneas + Marcas + SAT Claves',
    description: 'Requiere que Empresas, Líneas, Marcas y SAT Claves Productos estén sincronizados.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    badgeBg: 'bg-amber-500/15 text-amber-600',
    catalogs: [
      { id: 12, name: 'Sucursales',             endpoint: '/catalogos/sucursales/get',          icon: LayoutGrid, sync: SyncSucursales },
      { id: 5,  name: 'Productos',              endpoint: '/catalogos/productos/get',            icon: Package,    sync: SyncProductos },
    ],
  },
  {
    stage: 4,
    label: 'Etapa 4 — Depende de: Productos + Empaques',
    description: 'Requiere que Productos y Empaques estén sincronizados.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    badgeBg: 'bg-orange-500/15 text-orange-600',
    catalogs: [
      { id: 10, name: 'Niveles Empaque',        endpoint: '/catalogos/niveles-empaque/get',     icon: LayoutGrid, sync: SyncNivelesEmpaque },
    ],
  },
  {
    stage: 5,
    label: 'Etapa 5 — Depende de: Niveles Empaque',
    description: 'Requiere que Niveles Empaque esté sincronizado. Usa el GUID de la sucursal activa.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    badgeBg: 'bg-emerald-500/15 text-emerald-600',
    catalogs: [
      // params se inyectan dinámicamente cuando el GUID esté disponible
      { id: 13, name: 'Listas de precios',      endpoint: '/lista-precios/get-precios/{guid}',  icon: LayoutGrid, sync: SyncSucursalProductos },
    ],
  },
];

// Lista plana en el orden secuencial correcto (para handleSyncAll)
const ALL_CATALOG_IDS_IN_ORDER = STAGES.flatMap(s => s.catalogs.map(c => c.id));

export function SyncPage() {
  const { store, license } = useActivation();
  const [sucursalGuid, setSucursalGuid] = React.useState('');
  const [showInfo, setShowInfo] = React.useState(false);

  // Leer el GUID de la sucursal desde kommerze_config.json
  React.useEffect(() => {
    ServiceGetSucursalGuid()
      .then((guid) => { if (guid) setSucursalGuid(guid); })
      .catch(() => {});
  }, []);

  // Estado plano de cada catálogo, indexado por id
  const [catalogState, setCatalogState] = React.useState(() => {
    const map = {};
    STAGES.forEach(s => s.catalogs.forEach(c => {
      map[c.id] = { lastSync: 'Nunca', status: 'Pendiente', failed: false, params: undefined };
    }));
    return map;
  });

  // Actualizar params del catálogo 13 cuando el GUID esté disponible
  React.useEffect(() => {
    const guid = sucursalGuid || store?.Guid || '';
    setCatalogState(prev => ({
      ...prev,
      13: { ...prev[13], params: { sucursalGuid: guid } },
    }));
  }, [sucursalGuid, store?.Guid]);

  const [syncingIds, setSyncingIds] = React.useState(new Set());
  const [isSyncingAll, setIsSyncingAll] = React.useState(false);
  const [syncAllProgress, setSyncAllProgress] = React.useState(null); // { current, total }
  const [search, setSearch] = React.useState('');

  // ── Sincronizar catálogo individual ────────────────────────────────────────
  const handleSync = React.useCallback(async (id) => {
    // Buscar la definición del catálogo en las etapas
    let catalogDef = null;
    for (const stage of STAGES) {
      catalogDef = stage.catalogs.find(c => c.id === id);
      if (catalogDef) break;
    }
    if (!catalogDef) return false;

    setSyncingIds(prev => new Set(prev).add(id));
    const params = catalogState[id]?.params;

    try {
      await catalogDef.sync(params);
      setCatalogState(prev => ({
        ...prev,
        [id]: { ...prev[id], status: 'Sincronizado', lastSync: 'Justo ahora', failed: false },
      }));
      return true;
    } catch {
      setCatalogState(prev => ({
        ...prev,
        [id]: { ...prev[id], status: 'Error', lastSync: 'Falló', failed: true },
      }));
      return false;
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [catalogState]);

  // ── Sincronizar Todo — SECUENCIAL respetando el orden de etapas ────────────
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    const total = ALL_CATALOG_IDS_IN_ORDER.length;

    for (let i = 0; i < ALL_CATALOG_IDS_IN_ORDER.length; i++) {
      const id = ALL_CATALOG_IDS_IN_ORDER[i];
      setSyncAllProgress({ current: i + 1, total });
      await handleSync(id);
    }

    setSyncAllProgress(null);
    setIsSyncingAll(false);
  };

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const filteredStages = React.useMemo(() => {
    if (!search.trim()) return STAGES;
    const q = search.toLowerCase();
    return STAGES.map(stage => ({
      ...stage,
      catalogs: stage.catalogs.filter(c => c.name.toLowerCase().includes(q)),
    })).filter(stage => stage.catalogs.length > 0);
  }, [search]);

  const totalVisible = filteredStages.reduce((acc, s) => acc + s.catalogs.length, 0);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in bg-bg-subtle">
      <div className="flex-1 overflow-y-auto p-5 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* ── Header ────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                Sincronización
                {license?.sucursal?.nombreSucursal && (
                  <span className="text-sm font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-lg shadow-sm">
                    {license.sucursal.nombreSucursal}
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Sincronice los catálogos con la nube central. El orden de etapas es obligatorio.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowInfo(v => !v)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-all",
                  showInfo
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border bg-surface text-foreground hover:bg-muted"
                )}
                title="Ver guía de uso"
              >
                <Info className="size-4" />
                Guía
              </button>
              <button
                onClick={handleSyncAll}
                disabled={isSyncingAll}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-sm disabled:opacity-60"
              >
                <RefreshCw className={cn("size-4", isSyncingAll && "animate-spin")} />
                {isSyncingAll
                  ? syncAllProgress
                    ? `Sincronizando ${syncAllProgress.current}/${syncAllProgress.total}...`
                    : 'Iniciando...'
                  : 'Sincronizar Todo'}
              </button>
            </div>
          </div>

          {/* ── Barra de progreso global ─────────────────────────── */}
          {isSyncingAll && syncAllProgress && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-primary flex items-center gap-2">
                  <RefreshCw className="size-3.5 animate-spin" />
                  Sincronización en progreso — secuencial por etapas
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {syncAllProgress.current} / {syncAllProgress.total}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-primary/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(syncAllProgress.current / syncAllProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Panel de guía de uso ──────────────────────────────── */}
          {showInfo && (
            <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-bg-subtle flex items-center gap-2">
                <ListOrdered className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Guía de sincronización</h3>
              </div>
              <div className="p-5 space-y-4 text-sm text-muted-foreground">
                <p>
                  Los catálogos tienen <span className="font-semibold text-foreground">relaciones de dependencia</span> entre sí.
                  Si se insertan en un orden incorrecto, la base de datos local rechazará los datos por violación de integridad referencial.
                </p>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5">
                  <p className="font-semibold text-amber-600 mb-1.5">⚠ Si sincroniza uno por uno</p>
                  <p>Debe respetar el orden de etapas de arriba hacia abajo. No sincronice un catálogo de una etapa superior antes de completar las etapas anteriores.</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-foreground">
                    <span className="rounded-md bg-blue-500/15 text-blue-600 px-2 py-0.5">Etapa 1</span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="rounded-md bg-violet-500/15 text-violet-600 px-2 py-0.5">Etapa 2</span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="rounded-md bg-amber-500/15 text-amber-600 px-2 py-0.5">Etapa 3</span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="rounded-md bg-orange-500/15 text-orange-600 px-2 py-0.5">Etapa 4</span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="rounded-md bg-emerald-500/15 text-emerald-600 px-2 py-0.5">Etapa 5</span>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                  <p className="font-semibold text-primary mb-1">✓ Usando "Sincronizar Todo"</p>
                  <p>El sistema ejecuta cada catálogo <span className="font-semibold text-foreground">de forma secuencial</span>, respetando automáticamente el orden de etapas. No necesita intervención manual.</p>
                </div>

                <p className="text-xs">
                  <span className="font-semibold text-foreground">Listas de precios</span> requiere adicionalmente
                  el GUID de la sucursal activa (se obtiene automáticamente de la configuración del dispositivo).
                </p>
              </div>
            </div>
          )}

          {/* ── Toolbar ────────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
            <div className="border-b border-border bg-bg-subtle px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-foreground">
                Catálogos ({totalVisible})
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar catálogo..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface pl-9 pr-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>
            </div>

            {/* ── Catálogos agrupados por etapa ──────────────────────── */}
            <div className="divide-y divide-border">
              {filteredStages.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Database className="size-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No se encontraron catálogos con "{search}"</p>
                </div>
              ) : (
                filteredStages.map((stage) => (
                  <div key={stage.stage}>
                    {/* Encabezado de etapa */}
                    <div className={cn(
                      "px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 border-b border-border",
                      stage.bgColor,
                    )}>
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide",
                          stage.badgeBg,
                        )}>
                          Etapa {stage.stage}
                        </span>
                        <span className={cn("text-xs font-semibold", stage.color)}>
                          {stage.label.split('—')[1]?.trim()}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground sm:ml-1">
                        {stage.description}
                      </span>
                    </div>

                    {/* Catálogos de la etapa */}
                    <div className="divide-y divide-border">
                      {stage.catalogs.map((catalogDef) => {
                        const state = catalogState[catalogDef.id] ?? {};
                        const isSyncing = syncingIds.has(catalogDef.id);

                        return (
                          <div
                            key={catalogDef.id}
                            className={cn(
                              "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 pl-8 transition-colors hover:bg-bg-subtle",
                              state.failed && "bg-danger/5 hover:bg-danger/10"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                                state.failed ? "bg-danger/10 text-danger" : `${stage.bgColor} ${stage.color}`
                              )}>
                                <catalogDef.icon className="size-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-foreground leading-tight">
                                  {catalogDef.name}
                                </h4>
                                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                  {catalogDef.endpoint}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                                  <History className="size-3" />
                                  Última sinc: {state.lastSync ?? 'Nunca'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 sm:ml-auto">
                              {/* Status */}
                              <div className="flex items-center gap-2 w-28 sm:w-auto">
                                {isSyncing ? (
                                  <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                    <RefreshCw className="size-3.5 animate-spin" />
                                    En proceso
                                  </span>
                                ) : state.failed ? (
                                  <span className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                                    <AlertCircle className="size-3.5" />
                                    {state.status}
                                  </span>
                                ) : state.status === 'Sincronizado' ? (
                                  <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                                    <CheckCircle2 className="size-3.5" />
                                    {state.status}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                    <Clock className="size-3.5" />
                                    {state.status}
                                  </span>
                                )}
                              </div>

                              {/* Botón */}
                              <button
                                onClick={() => handleSync(catalogDef.id)}
                                disabled={isSyncing || isSyncingAll}
                                className={cn(
                                  "flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 w-full sm:w-[110px]",
                                  state.failed && !isSyncing
                                    ? "border-danger text-danger hover:bg-danger/10"
                                    : "border-border bg-surface text-foreground hover:bg-muted"
                                )}
                              >
                                <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
                                {isSyncing ? 'Sincronizando' : state.failed ? 'Reintentar' : 'Sincronizar'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
