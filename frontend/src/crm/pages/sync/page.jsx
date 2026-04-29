'use client';

import * as React from 'react';
import {
    Database,
    RefreshCw,
    Users,
    Package,
    History,
    Search,
    LayoutGrid
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardHeading, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Content } from '@/crm/layout/components/content';
import { ContentHeader } from '@/crm/layout/components/content-header';
import { cn } from '@/lib/utils';

import { useActivation } from '@/providers/activation-provider';

import {
    SyncLineas,
    SyncMarcas,
    SyncEmpaques,
    SyncSatProductos,
    SyncProductos,
    SyncSatFormasPago,
    SyncSatMetodosPago,
    SyncSatUsosCfdi,
    SyncSatRegimenFiscal,
    SyncNivelesEmpaque,
    SyncEmpresas,
    SyncSucursales,
    SyncSucursalProductos
} from "../../../../wailsjs/go/main/App";


const gradientButtonStyle = "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-600 hover:text-white border-0 shadow-sm transition-all duration-200";

export function SyncPage() {

    const { store } = useActivation();

    const catalogsData = [
        {
            id: 1,
            name: 'Lineas',
            endpoint: '/catalogos/lineas/get',
            lastSync: '2m ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: Package,
            iconBg: 'bg-blue-50 dark:bg-blue-900/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
            sync: SyncLineas,
            params: null
        },
        {
            id: 2,
            name: 'Marcas',
            endpoint: '/catalogos/marcas/get',
            lastSync: '14m ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: Users,
            iconBg: 'bg-purple-50 dark:bg-purple-900/20',
            iconColor: 'text-purple-600 dark:text-purple-400',
            sync: SyncMarcas,
            params: null
        },
        {
            id: 3,
            name: 'Empaques',
            endpoint: '/catalogos/empaques/get',
            lastSync: 'Failed 1h ago',
            status: 'Pendiente',
            statusVariant: 'warning',
            icon: Database,
            iconBg: 'bg-amber-50 dark:bg-amber-900/20',
            iconColor: 'text-amber-600 dark:text-amber-400',
            failed: true,
            sync: SyncEmpaques,
            params: null
        },
        {
            id: 4,
            name: 'SAT Claves Productos',
            endpoint: '/catalogos/sat/productos/get',
            lastSync: '3h ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: LayoutGrid,
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            sync: SyncSatProductos,
            params: null
        },
        {
            id: 5,
            name: 'Productos',
            endpoint: '/catalogos/productos/get',
            lastSync: '3h ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: LayoutGrid,
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            sync: SyncProductos,
            params: null
        },

        {
            id: 10,
            name: 'Niveles Empaque',
            endpoint: '/catalogos/niveles-empaque/get',
            lastSync: '3h ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: LayoutGrid,
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            sync: SyncNivelesEmpaque,
            params: null
        },
        {
            id: 6,
            name: 'SAT Formas Pago',
            endpoint: '/catalogos/sat/formas-pago/get',
            lastSync: '3h ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: LayoutGrid,
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            sync: SyncSatFormasPago,
            params: null
        },
        {
            id: 7,
            name: 'SAT Metodos Pago',
            endpoint: '/catalogos/sat/metodos-pago/get',
            lastSync: '3h ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: LayoutGrid,
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            sync: SyncSatMetodosPago,
            params: null
        },
        {
            id: 8,
            name: 'SAT Regimen Fiscal',
            endpoint: '/catalogos/sat/regimen-fiscal/get',
            lastSync: '3h ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: LayoutGrid,
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            sync: SyncSatRegimenFiscal,
            params: null
        },
        {
            id: 9,
            name: 'SAT Usos CFDI',
            endpoint: '/catalogos/sat/usos-cfdi/get',
            lastSync: '3h ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: LayoutGrid,
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            sync: SyncSatUsosCfdi,
            params: null
        },

        {
            id: 11,
            name: 'Empresas',
            endpoint: '/catalogos/empresas/get',
            lastSync: '3h ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: LayoutGrid,
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            sync: SyncEmpresas,
            params: null
        },
        {
            id: 12,
            name: 'Sucursales',
            endpoint: '/catalogos/sucursales/get',
            lastSync: '3h ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: LayoutGrid,
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            sync: SyncSucursales,
            params: null
        },
        {
            id: 13,
            name: 'Listas de precios',
            endpoint: '/lista-precios/get-precios/',
            lastSync: '3h ago',
            status: 'Sincronizado',
            statusVariant: 'success',
            icon: LayoutGrid,
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            sync: SyncSucursalProductos,
            params: {
                sucursalGuid: store?.Guid || 'bf531b30-e4bd-4725-b5f2-24458f1ac67a'
            }
        }
    ];
    const [catalogs, setCatalogs] = React.useState(catalogsData);
    const [syncingIds, setSyncingIds] = React.useState(new Set());
    const [isSyncingAll, setIsSyncingAll] = React.useState(false);


    const sync = async (id) => {
        const catalogo = catalogsData.find((catalog) => catalog.id === id);

        const info = await catalogo.sync(catalogo.params);
        return info
    }

    const handleSync = async (id) => {
        setSyncingIds((prev) => new Set(prev).add(id));

        try {
            const res = await sync(id);
            setCatalogs((prev) =>
                prev.map((catalog) =>
                    catalog.id === id
                        ? { ...catalog, status: res, statusVariant: 'success', lastSync: 'Just now', failed: false, }
                        : catalog
                )
            );
            return true
        } catch (error) {

            setCatalogs((prev) =>
                prev.map((catalog) =>
                    catalog.id === id
                        ? {
                            ...catalog,
                            status: 'Error',
                            statusVariant: 'warning',
                            lastSync: 'Failed just now',
                            iconBg: 'bg-amber-50 dark:bg-amber-900/20',
                            iconColor: 'text-amber-600 dark:text-amber-400',
                            failed: true,
                        }
                        : catalog
                )
            );
            return false
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
        const allIds = catalogsData.map(c => c.id);

        setSyncingIds(new Set(allIds));

        await Promise.all(
            allIds.map(id => handleSync(id))
        );
        // Simulate sync all process
        setSyncingIds(new Set());
        setIsSyncingAll(false);
        /*setTimeout(() => {
            
        }, 4000);*/
    };

    return (
        <>
            <ContentHeader>
                <h1 className="inline-flex items-center gap-2.5 text-sm font-semibold">
                    <RefreshCw className="size-4 text-primary" /> Sincronización
                </h1>
                <div className="flex items-center gap-2.5">

                </div>
            </ContentHeader>

            <div className="container-fluid flex justify-center">
                <Content className="block space-y-6 py-5 w-full max-w-2xl">
                    <div className="flex justify-end mb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn("gap-2", gradientButtonStyle)}
                            onClick={handleSyncAll}
                            disabled={isSyncingAll}
                        >
                            <RefreshCw className={cn("size-4", isSyncingAll && "animate-spin")} />
                            {isSyncingAll ? 'Sincronizando...' : 'Sincronizar Todo'}
                        </Button>
                    </div>

                    <Card className="rounded-xl border bg-background shadow-xs">
                        <CardHeader className="p-3">
                            <CardHeading>
                                <CardTitle className="text-sm font-semibold">Catalogos del sistema</CardTitle>
                                <CardDescription className="text-xs">Administre y sincronice los catalogos del sistema</CardDescription>
                            </CardHeading>
                            <CardToolbar>
                                <div className="relative hidden sm:block">
                                    <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search catalogs..."
                                        className="h-8 w-40 rounded-md border border-input bg-background pl-8 pr-3 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                            </CardToolbar>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {catalogs.map((catalog) => {

                                    const isSyncing = syncingIds.has(catalog.id);
                                    return (
                                        <div
                                            key={catalog.id}
                                            className={cn(
                                                "group flex flex-wrap items-center justify-between gap-4 p-2.5 transition-colors hover:bg-muted/50",
                                                catalog.failed && "bg-amber-50/20 dark:bg-amber-900/5 hover:bg-amber-50/40 dark:hover:bg-amber-900/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-[180px]">
                                                <div className={cn("flex size-8 items-center justify-center rounded-lg shrink-0", catalog.iconBg, catalog.iconColor)}>
                                                    <catalog.icon className="size-4" />
                                                </div>
                                                <div className="space-y-0 text-left">
                                                    <h4 className="text-sm font-semibold text-foreground leading-tight">{catalog.name}</h4>
                                                    <p className="text-[11px] font-mono text-primary/70">{catalog.endpoint}</p>
                                                    <div className={cn(
                                                        "flex items-center gap-1 text-[11px]",
                                                        catalog.failed ? "text-amber-600 font-medium italic" : "text-muted-foreground"
                                                    )}>
                                                        <History className="size-3" />
                                                        {catalog.lastSync}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">Status</p>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={isSyncing ? 'info' : catalog.statusVariant}
                                                        appearance="light"
                                                        size="xs"
                                                        className="gap-1 px-1.5 h-5 font-semibold"
                                                    >
                                                        <span className={cn(
                                                            "size-1 rounded-full",
                                                            isSyncing ? "bg-blue-500" : (catalog.statusVariant === 'success' ? "bg-emerald-500" : "bg-amber-500")
                                                        )} />
                                                        {isSyncing ? 'Sincronizando...' : catalog.status}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                                                    Logs
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn(
                                                        "h-7 text-xs px-3 gap-1 min-w-[85px]",
                                                        gradientButtonStyle,
                                                        catalog.failed && !isSyncing && "from-amber-600 to-amber-500 hover:from-amber-600"
                                                    )}
                                                    onClick={() => handleSync(catalog.id)}
                                                    disabled={isSyncing}
                                                >
                                                    <RefreshCw className={cn("size-3", isSyncing && "animate-spin")} />
                                                    {isSyncing ? 'Sincronizando' : (catalog.failed ? 'Retry' : 'Sync')}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>


                </Content>
            </div>
        </>
    );
}
