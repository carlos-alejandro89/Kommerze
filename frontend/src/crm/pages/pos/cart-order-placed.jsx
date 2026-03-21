'use client';

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CircleCheckBig,
    ShoppingCart,
    Printer,
    Mail,
    CreditCard,
    Banknote,
    FileText
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Content } from '@/crm/layout/components/content';
import { ContentHeader } from '@/crm/layout/components/content-header';
import { Steps } from './steps';
import { moneyFormat } from '@/lib/helpers';
import visa from '@/assets/visa.svg';

export function CartOrderPlaced() {
    const navigate = useNavigate();

    const [isPulsing, setIsPulsing] = React.useState(true);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsPulsing(false);
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    const [pagosAplicados, setPagosAplicados] = React.useState(() => {
        try {
            const stored = localStorage.getItem('pagosAplicados');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    });

    const [cart, setCart] = React.useState(() => {
        try {
            const stored = localStorage.getItem('cart');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    });

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const descuento = cart.reduce((sum, item) => {
        const valDescuento = item.discount > 0 ? (item.price * item.discount / 100) : 0;
        return sum + (valDescuento * item.quantity);
    }, 0);
    const total = subtotal - descuento;

    const totalPagos = pagosAplicados.reduce((suma, item) => suma + parseFloat(item.Monto || 0), 0);
    const cambio = Math.max(0, totalPagos - total);

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-zinc-950/50 relative">
            <ContentHeader className="flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="w-full">
                    <Steps currentStep={3} />
                </div>
            </ContentHeader>

            <Content className="flex-1 overflow-y-auto p-0">
                <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
                    {/* Success Content */}
                    <div className="flex flex-col items-center text-center">
                        <div className="relative flex items-center justify-center mb-6">
                            <div className={`absolute inset-0 bg-[#0BC33F]/25 rounded-full transition-opacity duration-500 ease-out ${isPulsing ? 'animate-ping opacity-75' : 'opacity-0'}`}></div>
                            <div className="relative w-24 h-24 bg-[#0BC33F]/10 border border-[#0BC33F]/30 rounded-full flex items-center justify-center z-10 shadow-[0_0_40px_rgba(11,195,63,0.3)]">
                                <CircleCheckBig className="size-12 text-[#0BC33F] animate-[popScale_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]" />
                            </div>
                        </div>

                        <h1 className="font-semibold text-4xl text-foreground mb-2 tracking-tight">
                            ¡Transacción Exitosa!
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg mb-8">
                            El pedido ha sido procesado y finalizado correctamente.
                        </p>

                        <div className="bg-primary px-4 py-2 rounded-full mb-10 shadow-sm border border-primary/20">
                            <span className="text-primary-foreground font-mono text-sm tracking-widest font-bold">
                                FOLIO: #POS-94232
                            </span>
                        </div>

                        {/* Bento Grid Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-12 text-left">

                            {/* Total Amount Card using ResumenCuenta styles */}
                            <div className="bg-gradient-to-br from-[#002366] to-[#001233] p-8 space-y-4 rounded-2xl shadow-[0_8px_30px_rgba(0,35,102,0.2)] border border-[#002366]/50 text-white relative overflow-hidden flex flex-col justify-center">
                                {/* Subtle overlay pattern/glow from ResumenCuenta */}
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-[0.03] blur-2xl pointer-events-none" />
                                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-blue-400 opacity-[0.05] blur-xl pointer-events-none" />

                                <span className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest leading-none mb-1.5 relative z-10">
                                    Total de Venta
                                </span>

                                <div className="flex items-baseline gap-1 relative z-10">
                                    <span className="text-4xl font-black tabular-nums tracking-tighter leading-none text-white drop-shadow-sm">
                                        {moneyFormat(total > 0 ? total : 0)}
                                    </span>
                                </div>

                                {cambio > 0 && (
                                    <div className="pt-4 mt-2 border-t border-white/10 relative z-10">
                                        <span className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest leading-none mb-1.5 block">
                                            Su Cambio
                                        </span>
                                        <span className="text-2xl font-black tabular-nums tracking-tighter leading-none text-[#0BC33F] drop-shadow-[0_0_10px_rgba(11,195,63,0.3)]">
                                            {moneyFormat(cambio)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Payment Breakdown Card using ItemPagos styles */}
                            <Card className="flex flex-col gap-4 p-6 bg-surface-container-lowest dark:bg-zinc-900 rounded-2xl shadow-sm border border-border">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest leading-none">
                                    Desglose de Pago
                                </span>
                                <div className="space-y-2">
                                    {pagosAplicados.length > 0 ? (
                                        pagosAplicados.map((pago, index) => (
                                            <div key={index} className="flex items-center justify-between border border-border rounded-xl gap-2 px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 transition-colors">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="shrink-0 flex items-center justify-center">
                                                        {pago.Nombre === 'Efectivo' || pago.MetodoPagoID === 1 ? (
                                                            <Banknote className="size-5 text-slate-800 dark:text-slate-300" />
                                                        ) : (
                                                            <>
                                                                <img alt={pago.Nombre} src={visa} className="w-8 h-auto" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'block'; }} />
                                                                <CreditCard className="size-5 text-slate-800 dark:text-slate-300 hidden" />
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-mono cursor-default text-foreground">
                                                            {pago.Nombre || 'Efectivo'}
                                                        </span>
                                                        {pago.Referencia && (
                                                            <span className="text-[10px] text-secondary-foreground font-medium">
                                                                {pago.Referencia}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-foreground text-sm cursor-default">
                                                        {moneyFormat(pago.Monto)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-4 px-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-transparent text-center">
                                            <span className="text-sm font-bold text-muted-foreground cursor-default">
                                                Sin pagos registrados
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Hierarchical Action Buttons Layout */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-3xl">
                            {/* Primary Action: Nueva Venta */}
                            <Button
                                onClick={() => navigate('/pos')}
                                className="w-full sm:flex-1 h-10 px-5 rounded-xl bg-gradient-to-r from-[#002366] to-[#001233] text-white hover:from-[#001233] hover:to-[#001233] border-none font-black text-[11px] uppercase tracking-wider shadow-[0_8px_30px_rgba(0,35,102,0.2)] flex items-center justify-center gap-2 group relative overflow-hidden active:scale-[0.98] transition-all"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <ShoppingCart className="size-4" />
                                    Nueva Venta
                                </span>
                                {/* Premium Shimmer Effect matching ResumenCuenta */}
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 z-0" />
                            </Button>

                            {/* Secondary Actions */}
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    className="flex-1 sm:flex-none h-10 px-4 rounded-xl text-[11px] font-bold uppercase gap-2 shadow-sm border-border/80 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] text-muted-foreground hover:text-foreground bg-surface-container-lowest dark:bg-zinc-900"
                                >
                                    <Printer className="size-4" />
                                    <span className="hidden sm:inline">Imprimir</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="flex-1 sm:flex-none h-10 px-4 rounded-xl text-[11px] font-bold uppercase gap-2 shadow-sm border-border/80 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] text-muted-foreground hover:text-foreground bg-surface-container-lowest dark:bg-zinc-900"
                                >
                                    <Mail className="size-4" />
                                    <span className="hidden sm:inline">Enviar</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto flex-none h-10 px-4 rounded-xl text-[11px] font-black uppercase gap-2 shadow-sm border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all active:scale-[0.98] text-primary hover:text-primary-foreground dark:hover:text-primary dark:border-primary/30"
                                >
                                    <FileText className="size-4" />
                                    Facturar Pedido
                                </Button>
                            </div>
                        </div>


                    </div>
                </div>
            </Content>

            <style jsx>{`
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
                @keyframes popScale {
                    0% { transform: scale(0.5); opacity: 0; }
                    70% { transform: scale(1.15); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}