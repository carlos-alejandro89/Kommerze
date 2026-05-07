'use client';

import * as React from 'react';
import {
  Database, RefreshCw, Users, Package, History,
  Search, LayoutGrid, AlertCircle, CheckCircle2, Clock
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

export function SyncPage() {
  const { store } = useActivation();
  const [sucursalGuid, setSucursalGuid] = React.useState('');

  // Leer el GUID de la sucursal desde kommerze_config.json
  React.useEffect(() => {
    ServiceGetSucursalGuid()
      .then((guid) => { if (guid) setSucursalGuid(guid); })
      .catch(() => {});
  }, []);

  const catalogsData = React.useMemo(() => [
    { id: 1, name: 'Líneas', endpoint: '/catalogos/lineas/get', icon: Package, sync: SyncLineas },
    { id: 2, name: 'Marcas', endpoint: '/catalogos/marcas/get', icon: Users, sync: SyncMarcas },
    { id: 3, name: 'Empaques', endpoint: '/catalogos/empaques/get', icon: Database, sync: SyncEmpaques },
    { id: 4, name: 'SAT Claves Productos', endpoint: '/catalogos/sat/productos/get', icon: LayoutGrid, sync: SyncSatProductos },
    { id: 5, name: 'Productos', endpoint: '/catalogos/productos/get', icon: Package, sync: SyncProductos },
    { id: 10, name: 'Niveles Empaque', endpoint: '/catalogos/niveles-empaque/get', icon: LayoutGrid, sync: SyncNivelesEmpaque },
    { id: 6, name: 'SAT Formas Pago', endpoint: '/catalogos/sat/formas-pago/get', icon: LayoutGrid, sync: SyncSatFormasPago },
    { id: 7, name: 'SAT Métodos Pago', endpoint: '/catalogos/sat/metodos-pago/get', icon: LayoutGrid, sync: SyncSatMetodosPago },
    { id: 8, name: 'SAT Régimen Fiscal', endpoint: '/catalogos/sat/regimen-fiscal/get', icon: LayoutGrid, sync: SyncSatRegimenFiscal },
    { id: 9, name: 'SAT Usos CFDI', endpoint: '/catalogos/sat/usos-cfdi/get', icon: LayoutGrid, sync: SyncSatUsosCfdi },
    { id: 11, name: 'Empresas', endpoint: '/catalogos/empresas/get', icon: LayoutGrid, sync: SyncEmpresas },
    { id: 12, name: 'Sucursales', endpoint: '/catalogos/sucursales/get', icon: LayoutGrid, sync: SyncSucursales },
    {
      id: 13, name: 'Listas de precios', endpoint: '/lista-precios/get-precios/', icon: LayoutGrid,
      sync: SyncSucursalProductos,
      // Usar el GUID del config; si aún no cargó, diferir hasta que esté disponible
      params: { sucursalGuid: sucursalGuid || store?.Guid || '' },
    }
  ].map(c => ({
    ...c,
    lastSync: 'Nunca',
    status: 'Pendiente',
    failed: false,
  })), [sucursalGuid, store?.Guid]);

  const [catalogs, setCatalogs] = React.useState(catalogsData);
  const [syncingIds, setSyncingIds] = React.useState(new Set());
  const [isSyncingAll, setIsSyncingAll] = React.useState(false);
  const [search, setSearch] = React.useState('');

  // Actualizar params de "Listas de precios" cuando el GUID esté disponible
  React.useEffect(() => {
    setCatalogs(prev => prev.map(c =>
      c.id === 13 ? { ...c, params: { sucursalGuid: sucursalGuid || store?.Guid || '' } } : c
    ));
  }, [sucursalGuid, store?.Guid]);

  const handleSync = async (id) => {
    setSyncingIds((prev) => new Set(prev).add(id));
    const catalog = catalogs.find(c => c.id === id);

    try {
      await catalog.sync(catalog.params);
      setCatalogs((prev) => prev.map((c) =>
        c.id === id ? { ...c, status: 'Sincronizado', lastSync: 'Justo ahora', failed: false } : c
      ));
      return true;
    } catch (error) {
      setCatalogs((prev) => prev.map((c) =>
        c.id === id ? { ...c, status: 'Error', lastSync: 'Falló justo ahora', failed: true } : c
      ));
      return false;
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    const allIds = catalogs.map(c => c.id);
    setSyncingIds(new Set(allIds));
    await Promise.all(allIds.map(id => handleSync(id)));
    setIsSyncingAll(false);
  };

  const filteredCatalogs = catalogs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in bg-bg-subtle">
      <div className="flex-1 overflow-y-auto p-5 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* ── Header ────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sincronización</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Administre y sincronice los catálogos del sistema con la nube central.
              </p>
            </div>
            <button
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={cn("size-4", isSyncingAll && "animate-spin")} />
              {isSyncingAll ? 'Sincronizando Todo...' : 'Sincronizar Todo'}
            </button>
          </div>

          {/* ── Main Panel ──────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">

            {/* Toolbar */}
            <div className="border-b border-border bg-bg-subtle px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-foreground">Catálogos Disponibles ({filteredCatalogs.length})</h3>
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

            {/* List */}
            <div className="divide-y divide-border">
              {filteredCatalogs.map((catalog) => {
                const isSyncing = syncingIds.has(catalog.id);

                return (
                  <div
                    key={catalog.id}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 transition-colors hover:bg-bg-subtle",
                      catalog.failed && "bg-danger/5 hover:bg-danger/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        catalog.failed ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
                      )}>
                        <catalog.icon className="size-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground leading-tight">
                          {catalog.name}
                        </h4>
                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          {catalog.endpoint}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                          <History className="size-3" />
                          Última sinc: {catalog.lastSync}
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
                        ) : catalog.failed ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                            <AlertCircle className="size-3.5" />
                            {catalog.status}
                          </span>
                        ) : catalog.status === 'Sincronizado' ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                            <CheckCircle2 className="size-3.5" />
                            {catalog.status}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Clock className="size-3.5" />
                            {catalog.status}
                          </span>
                        )}
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => handleSync(catalog.id)}
                        disabled={isSyncing}
                        className={cn(
                          "flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 w-full sm:w-[110px]",
                          catalog.failed && !isSyncing
                            ? "border-danger text-danger hover:bg-danger/10"
                            : "border-border bg-surface text-foreground hover:bg-muted"
                        )}
                      >
                        <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
                        {isSyncing ? 'Sincronizando' : catalog.failed ? 'Reintentar' : 'Sincronizar'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredCatalogs.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Database className="size-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No se encontraron catálogos con "{search}"</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
