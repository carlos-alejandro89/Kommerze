import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Calendar, User, CheckCircle2, Receipt, CreditCard, Printer, FileText, ArrowRightLeft, XCircle, ChevronRight, FileCheck, Info, Banknote, Mail, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { moneyFormat } from '@/lib/helpers';
import visa from '@/assets/visa.svg';

export function ModalDetalleTransaccion({ open, onOpenChange, transaction }) {
    const mockItems = [
        { id: 1, sku: 'MBP-14-M2', category: 'Electrónica', TipoUnidad: 'PZA', empaque: 'CJA', Articulo: 'MacBook Pro 14"', quantity: 1, price: 3500.00, discount: 5, image: '' },
        { id: 2, sku: 'MMS-2-WHT', category: 'Accesorios', TipoUnidad: 'PZA', empaque: 'PZA', Articulo: 'Magic Mouse', quantity: 1, price: 450.00, discount: 0, image: '' },
        { id: 3, sku: 'USB-C-8IN1', category: 'Accesorios', TipoUnidad: 'PZA', empaque: 'PZA', Articulo: 'USB-C Hub 8-in-1', quantity: 2, price: 150.00, discount: 10, image: '' }
    ];

    const mockPagos = [
        { ID: 1, Nombre: 'Efectivo', Referencia: 'Pago en caja', Monto: 4000.00 },
        { ID: 2, Nombre: 'Tarjeta de Crédito', Referencia: 'Terminación 4567', Monto: 250.00 }
    ];

    // Provide some default dummy data for development if transaction is not passed
    const trx = transaction || {
        id: '#POS-48922',
        fecha: '24 Oct 2023',
        cajero: 'Marcos V.',
        estado: 'COMPLETADO',
        subtotal: 4250.00,
        descuento: 0.00,
        total: 4250.00
    };

    const displayItems = trx.items || mockItems;
    const displayPagos = trx.pagos || mockPagos;

    const countItems = displayItems.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-800 shadow-2xl overflow-hidden rounded-2xl p-0 [&>button]:right-6 [&>button]:top-5 [&>button]:opacity-50 hover:[&>button]:opacity-100 [&>button]:z-10">
                <DialogHeader className="sr-only">
                    <DialogTitle>Detalle de Transacción {trx.id}</DialogTitle>
                    <DialogDescription>Detalle completo de la transacción y desglose de pagos.</DialogDescription>
                </DialogHeader>

                {/* Modal Header */}
                <div className="p-6 pb-5 border-b border-border/50 bg-white/50 dark:bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-foreground tracking-tight mb-2 flex items-center gap-2">
                            <Receipt className="size-5 text-primary" />
                            Detalle de Transacción <span className="text-muted-foreground font-mono">{trx.id}</span>
                        </h2>
                        <div className="flex items-center gap-5 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="size-3.5" />
                                <span className="text-xs font-medium">{trx.fecha}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="text-xs font-medium">Cajero:</span>
                                <div className="group cursor-default flex items-center gap-1 px-1 border border-border rounded-full bg-accent/50">
                                    <Avatar className="size-4 my-1">
                                        <AvatarImage src="/media/avatars/300-2.png" alt={trx.cajero || 'Usuario'} />
                                        <AvatarFallback className="border-0 text-[11px] font-semibold bg-green-500 text-white">
                                            {(trx.cajero || 'U').charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="border-r border-border h-[14px]"></div>
                                    <span className="truncate max-w-[100px] text-xs pr-1">
                                        {trx.cajero || 'Usuario'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-md font-bold text-[10px] uppercase tracking-wider">
                                <CheckCircle2 className="size-3" />
                                {trx.estado}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Content (Scrollable) */}
                <div className="p-6 flex-1 overflow-y-auto space-y-8 no-scrollbar max-h-[50vh] min-h-[300px]">

                    {/* Información del Cliente */}
                    <div className="group border border-slate-200 dark:border-white/5 hover:border-primary/30 transition-all shadow-none overflow-hidden rounded-xl bg-white dark:bg-zinc-950/50">
                        <div className="flex items-center gap-3 w-full p-2.5 relative">
                            <Avatar className="size-10 rounded-xl shrink-0 bg-transparent border border-slate-200 dark:border-white/5 shadow-none hidden sm:flex">
                                <AvatarImage src='/media/avatars/300-2.png' alt="avatar" className="object-cover bg-transparent" />
                                <AvatarFallback className="rounded-xl bg-slate-100 dark:bg-zinc-800 text-muted-foreground text-xs font-bold">PG</AvatarFallback>
                            </Avatar>

                            <div className="flex flex-col w-full justify-center">
                                <h4 className="font-bold text-[13px] text-foreground leading-none mb-1">{trx.cliente || 'PÚBLICO GENERAL'}</h4>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Mail className="size-3 opacity-70" />
                                        <span>{trx.correo || 'no-reply@propos.com'}</span>
                                    </div>
                                    <div className="hidden sm:block w-1 h-1 rounded-full bg-muted-foreground/30" />
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="size-3 opacity-70" />
                                        <span>{trx.telefono || '+502 0000-0000'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Itemized List (Finer style mapping modal-detalle-inventario) */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-foreground tracking-tight ml-1">Artículos Vendidos</h3>
                        <div className="flex flex-col gap-2">
                            {displayItems.map((item, index) => (
                                <div key={item.id || index} className="group border border-slate-200 dark:border-white/5 hover:border-primary/30 transition-all shadow-none overflow-hidden rounded-xl bg-white dark:bg-zinc-950/50">
                                    <div className="flex items-center flex-wrap justify-between gap-3 p-2 pe-3 relative">
                                        {/* Left: Image */}
                                        <div className="relative h-12 w-12 md:h-12 md:w-12 rounded-lg overflow-hidden shrink-0 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-800 flex items-center justify-center">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    className="h-full w-full object-cover mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-500"
                                                    alt={item.Articulo || item.name}
                                                />
                                            ) : (
                                                <span className="text-[9px] uppercase font-bold text-slate-400 group-hover:scale-110 transition-transform">
                                                    SIN IMG
                                                </span>
                                            )}
                                            {item.discount > 0 && (
                                                <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-[8px] font-black px-1 py-[1px] rounded-bl-md z-10">
                                                    -{item.discount}%
                                                </div>
                                            )}
                                        </div>

                                        {/* Center: Info */}
                                        <div className="flex flex-1 items-center justify-between min-w-[200px] gap-3">
                                            {/* Product Info */}
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <div className="text-[11px] font-bold font-mono truncate text-slate-500">
                                                        {item.sku || 'N/A'}
                                                    </div>
                                                    <span className="text-[8px] font-black text-white bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-700 dark:to-slate-600 px-1.5 py-[1px] rounded-full shrink-0 shadow-sm">
                                                        {item.empaque || item.TipoUnidad || 'PZA'}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-foreground truncate cursor-default leading-tight">
                                                    {item.Articulo || item.name}
                                                </p>
                                            </div>

                                            {/* Category & Price */}
                                            <div className="flex flex-col items-end justify-center shrink-0 border-l border-slate-200/60 dark:border-white/5 pl-3 space-y-1">
                                                {item.category && (
                                                    <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0 rounded bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 capitalize">
                                                        {item.category.toLowerCase()}
                                                    </Badge>
                                                )}
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                    {moneyFormat(item.price)} c/u
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right: Quantity & Price */}
                                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-border/40 shrink-0">
                                            <div className="flex flex-col items-end gap-0.5 min-w-[30px]">
                                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none">Cant.</span>
                                                <span className="text-xs font-black text-foreground tabular-nums leading-none">
                                                    {item.quantity}
                                                </span>
                                            </div>
                                            <div className="h-5 w-px bg-border/80"></div>
                                            <div className="flex flex-col items-end gap-0.5 min-w-[60px]">
                                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none">Subt.</span>
                                                <span className="text-xs font-black text-primary tabular-nums leading-none">
                                                    {moneyFormat(item.price * item.quantity)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Fixed Bottom Section */}
                <div className="shrink-0 flex flex-col dark:bg-zinc-900/30 w-full z-10 relative">
                    <div className="p-4 sm:px-6 sm:py-4 border-b border-border/40 w-full">
                        {/* Payment Breakdown & Totals */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left">
                            {/* Breakdown - Finer Style */}
                            <div className="bg-white dark:bg-zinc-950/50 p-4 rounded-xl border border-border/50 shadow-sm flex flex-col justify-start">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest leading-none mb-3">
                                    Pagos Aplicados
                                </span>
                                <div className="space-y-1.5">
                                    {displayPagos.map((pago, idx) => (
                                        <div key={idx} className="flex items-center justify-between border border-border rounded-lg gap-2 px-3 py-2 bg-slate-50 dark:bg-zinc-900/50 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800">
                                            <div className="flex items-center gap-3">
                                                <div className="shrink-0 flex items-center justify-center">
                                                    {(pago.Nombre === 'Efectivo' || pago.MetodoPagoID === 1) ? (
                                                        <Banknote className="size-4 text-slate-800 dark:text-slate-300" />
                                                    ) : (
                                                        <>
                                                            <img alt={pago.Nombre} src={visa} className="w-6 h-auto" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'block'; }} />
                                                            <CreditCard className="size-4 text-slate-800 dark:text-slate-300 hidden" />
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-mono cursor-default text-foreground leading-none mb-0.5">
                                                        {pago.Nombre || 'Efectivo'}
                                                    </span>
                                                    {pago.Referencia && (
                                                        <span className="text-[9px] text-secondary-foreground font-medium leading-none">
                                                            {pago.Referencia}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-extrabold text-foreground text-[11px] cursor-default">
                                                    {moneyFormat(pago.Monto)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Component Style (Shrunk) */}
                            <div className="flex flex-col h-full items-stretch relative">
                                <div className="bg-gradient-to-br from-[#002366] to-[#001233] p-4 h-full rounded-xl shadow-[0_4px_20px_rgba(0,35,102,0.15)] border border-[#002366]/50 text-white relative overflow-hidden flex flex-col justify-between">
                                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-white opacity-[0.03] blur-xl pointer-events-none" />
                                    <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-20 h-20 rounded-full bg-blue-400 opacity-[0.05] blur-lg pointer-events-none" />

                                    <div>
                                        <h4 className="text-[10px] font-black uppercase text-blue-200/60 tracking-tighter relative z-10 mb-2">Resumen de Cuenta</h4>
                                        <div className="space-y-1 relative z-10">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-blue-100/70 font-medium tracking-wide">Subtotal</span>
                                                <span className="font-bold text-white tabular-nums">{moneyFormat(trx.subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-blue-100/70 font-medium tracking-wide">Descuento</span>
                                                <span className="font-bold text-white tabular-nums">{moneyFormat(trx.descuento)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2 mt-3 border-t border-white/10 flex justify-between items-end relative z-10">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-blue-200/60 uppercase tracking-widest leading-none mb-1">Total Neto</span>
                                            <span className="text-2xl font-black tabular-nums tracking-tighter leading-none text-white drop-shadow-sm">{moneyFormat(trx.total)}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-blue-200/80 bg-white/10 px-2 py-0.5 rounded-full uppercase">{countItems} Art.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer (Actions refined like cart-order-placed) */}
                    <div className="p-4 sm:px-6 bg-white dark:bg-zinc-950/80 flex flex-col sm:flex-row items-center gap-3 justify-between w-full">
                        {/* Primary/Secondary document actions */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-7 px-3 text-xs gap-1.5 shadow-sm border-border/80 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] text-muted-foreground hover:text-foreground bg-surface-container-lowest dark:bg-zinc-900">
                                <Printer className="size-3.5" />
                                <span className="hidden sm:inline">Imprimir</span>
                            </Button>

                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-7 px-3 text-xs gap-1.5 shadow-sm border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all active:scale-[0.98] text-primary hover:text-primary-foreground dark:hover:text-primary dark:border-primary/30">
                                <FileText className="size-3.5" />
                                Facturar Venta
                            </Button>
                        </div>

                        {/* Operational Actions */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-7 px-3 text-xs gap-1.5 shadow-sm border-border/80 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] text-foreground bg-white dark:bg-zinc-900">
                                Convertir a Pedido
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-7 px-3 text-xs gap-1.5 shadow-sm border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 bg-white dark:bg-zinc-900 transition-all active:scale-[0.98]">
                                <XCircle className="size-3.5" />
                                Cancelar Venta
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}