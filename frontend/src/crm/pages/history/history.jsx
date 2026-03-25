import { useMemo, useState } from 'react';

import { Card, CardFooter, CardHeader, CardTable, CardHeading, CardToolbar } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, CheckCircle, Target, CircleMinus, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';

import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';

import { moneyFormat } from '@/lib/helpers';

const mockData = [
    { id: 1, folio: 'FOL-001', fecha: '2026-03-24', cliente: 'Juan Perez', avatar: '/media/avatars/300-1.png', email: 'juan.perez@example.com', tipoOperacion: 'Venta', estatus: 'Completado', totalVenta: 1500.50 },
    { id: 2, folio: 'FOL-002', fecha: '2026-03-23', cliente: 'Maria Garcia', avatar: '/media/avatars/300-2.png', email: 'maria.garcia@example.com', tipoOperacion: 'Cotización', estatus: 'Pendiente', totalVenta: 2300.00 },
    { id: 3, folio: 'FOL-003', fecha: '2026-03-22', cliente: 'Carlos Lopez', avatar: '/media/avatars/300-3.png', email: 'carlos.lopez@example.com', tipoOperacion: 'Venta', estatus: 'Cancelado', totalVenta: 0.00 },
    { id: 4, folio: 'FOL-004', fecha: '2026-03-21', cliente: 'Ana Martinez', avatar: '/media/avatars/300-4.png', email: 'ana.martinez@example.com', tipoOperacion: 'Venta', estatus: 'Completado', totalVenta: 850.75 },
    { id: 5, folio: 'FOL-005', fecha: '2026-03-20', cliente: 'Luis Rodriguez', avatar: '/media/avatars/300-12.png', email: 'luis.rodriguez@example.com', tipoOperacion: 'Cotización', estatus: 'Pendiente', totalVenta: 120.00 },
];

export function HistoryList() {
    const [searchQuery, setSearchQuery] = useState('');
    const [sorting, setSorting] = useState([]);
    const [columnFilters, setColumnFilters] = useState([]);
    const [columnVisibility, setColumnVisibility] = useState({});

    const estadoConfig = {
        'Completado': { variant: 'success', icon: CheckCircle },
        'Pendiente': { variant: 'warning', icon: Target },
        'Cancelado': { variant: 'destructive', icon: CircleMinus },
    };

    const tipoOperacionConfig = {
        'Venta': {
            variant: 'outline',
            dotClass: 'text-emerald-500',
            badgeClass: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 dark:border-emerald-400/30'
        },
        'Cotización': {
            variant: 'outline',
            dotClass: 'text-amber-500',
            badgeClass: 'border-amber-500/30 text-amber-700 dark:text-amber-400 dark:border-amber-400/30'
        },
    };

    const filterHistory = useMemo(() => {
        let items = mockData;

        // Aplicar filtro por búsqueda
        if (searchQuery) {
            items = items.filter(
                (item) =>
                    item.folio.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.estatus.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.tipoOperacion.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return items;
    }, [searchQuery]);

    const columns = [
        {
            accessorKey: 'folio',
            header: 'Folio',
            size: 120,
            cell: ({ row }) => <div className="font-mono text-xs">{row.original.folio || '-'}</div>,
            enableSorting: true,
        },
        {
            accessorKey: 'fecha',
            header: 'Fecha',
            size: 120,
            cell: ({ row }) => <div className="font-mono text-xs">{row.original.fecha || '-'}</div>,
            enableSorting: true,
        },
        {
            accessorKey: 'cliente',
            header: 'Cliente',
            size: 240,
            cell: ({ row }) => (
                <div className="flex items-center gap-2.5 py-1">
                    <Avatar className="size-7 rounded-full">
                        <AvatarImage src={row.original.avatar} alt={row.original.cliente} className="rounded-full" />
                        <AvatarFallback className="rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                            {row.original.cliente.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-xs hover:text-primary cursor-pointer transition-colors leading-none mb-1">
                            {row.original.cliente}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-none">
                            {row.original.email}
                        </span>
                    </div>
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: 'tipoOperacion',
            header: 'Tipo',
            size: 105,
            cell: ({ row }) => {
                const tipo = row.original.tipoOperacion;
                const config = tipoOperacionConfig[tipo] || { variant: 'outline', dotClass: 'text-slate-500', badgeClass: 'border-slate-500/30 text-slate-700 dark:text-slate-400 dark:border-slate-400/30' };
                return (
                    <Badge variant={config.variant} className={`whitespace-nowrap px-2.5 py-0.5 gap-1.5 h-6 font-medium rounded-full ${config.badgeClass}`}>
                        <BadgeDot className={config.dotClass} />
                        {tipo}
                    </Badge>
                );
            },
            enableSorting: true,
        },
        {
            accessorKey: 'estatus',
            header: 'Estatus',
            size: 120,
            cell: ({ row }) => {
                const status = row.original.estatus;
                const config = estadoConfig[status] || { variant: 'secondary', icon: Target };
                const StatusIcon = config.icon;
                return (
                    <Badge variant={config.variant} appearance="light">
                        <StatusIcon className="size-3" />
                        {status}
                    </Badge>
                );
            },
            enableSorting: true,
        },
        {
            accessorKey: 'totalVenta',
            header: 'Total Venta',
            size: 120,
            cell: ({ row }) =>
                <div className="font-mono text-xs">
                    {moneyFormat(row.original.totalVenta)}
                </div>,
            enableSorting: true,
            meta: {
                headerClassName: "text-right rtl:text-left",
                cellClassName: "text-right rtl:text-left",
            },
        },
        {
            id: 'actions',
            header: '',
            size: 50,
            cell: ({ row }) => {
                return (
                    <Button variant="ghost" size="icon" className="size-7 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                        <ExternalLink className="size-4 text-muted-foreground" />
                    </Button>
                );
            },
            enableSorting: false,
        },
    ];

    const table = useReactTable({
        data: filterHistory,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
    });

    return (
        <DataGrid
            table={table}
            recordCount={filterHistory.length}
            tableLayout={{
                dense: true,
                columnsPinnable: true,
                columnsResizable: true,
                columnsMovable: true,
                columnsVisibility: true,
            }}
        >
            <Card className="shadow-sm border-border/60 rounded-xl overflow-hidden">
                <CardHeader className="px-5 py-3.5">
                    <CardHeading>
                        <div className="flex items-center flex-wrap gap-3 justify-between w-full">
                            <div className="flex items-center gap-3">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                                    <Input
                                        variant="sm"
                                        placeholder="Buscar..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="ps-9 w-56 rounded-lg"
                                    />

                                    {searchQuery.length > 0 && (
                                        <Button
                                            mode="icon"
                                            variant="ghost"
                                            className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => setSearchQuery('')}
                                        >
                                            <X />
                                        </Button>
                                    )}
                                </div>

                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {filterHistory.length}{' '}
                                    {filterHistory.length === 1 ? 'registro' : 'registros'}
                                </span>
                            </div>
                        </div>
                    </CardHeading>
                    <CardToolbar>
                    </CardToolbar>
                </CardHeader>

                <CardTable className="gap-4">
                    <ScrollArea>
                        <DataGridTable />
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardTable>

                <CardFooter className="px-5 py-2 border-t border-border/40">
                    <DataGridPagination className="py-1" />
                </CardFooter>
            </Card>
        </DataGrid>
    );
}