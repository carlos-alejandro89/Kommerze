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
import { Content } from '@/components/layout/content';
import { ContentHeader } from '@/components/layout/content-header';
import { Steps } from './steps';
import { moneyFormat } from '@/lib/helpers';
import { ItemPagos } from './components/item-pagos';
import { usePosService } from './usePosService';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function CartOrderPlaced() {
    const navigate = useNavigate();
    const posService = usePosService();
    const [isPrinting, setIsPrinting] = React.useState(false);
    const [isSending, setIsSending] = React.useState(false);
    const [sendDialogOpen, setSendDialogOpen] = React.useState(false);
    const [recipientEmail, setRecipientEmail] = React.useState('');
    const [sendError, setSendError] = React.useState('');
    const pedidoGuid = React.useMemo(() => localStorage.getItem('pedidoGuid') || '', []);

    const prefixes = {
        1: 'POS',
        2: 'COT',
        3: 'TRA'
    }

    const [isPulsing, setIsPulsing] = React.useState(true);
    const [folio, setFolio] = React.useState(() => {
        try {
            const stored = localStorage.getItem('folio');
            return stored ? JSON.parse(stored) : '';
        } catch (e) {
            return '';
        }
    });

    const [operationPrefix, setOperationPrefix] = React.useState(() => {
        try {
            const stored = localStorage.getItem('operationType');
            localStorage.removeItem('operationType')
            return stored ? prefixes[JSON.parse(stored)] : '';
        } catch (e) {
            return '';
        }
    });

    React.useEffect(() => {

        const timer = setTimeout(() => {
            setIsPulsing(false);
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    const [pagosAplicados, setPagosAplicados] = React.useState(() => {
        try {
            const stored = localStorage.getItem('pagosAplicados');

            localStorage.removeItem('pagosAplicados')

            localStorage.removeItem('folio')

            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    });

    const [cart, setCart] = React.useState(() => {
        try {
            const stored = localStorage.getItem('cart');
            localStorage.removeItem('cart')
            localStorage.removeItem('validCart')
            localStorage.removeItem('sucursal')
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

    const handlePrint = async () => {
        if (!pedidoGuid) { toast.error('No se encontró el identificador de la venta'); return; }
        setIsPrinting(true);
        try {
            await posService.imprimirRecibo(pedidoGuid);
            toast.success('Recibo enviado a la miniprinter');
        } catch (error) {
            toast.error('No se pudo imprimir: ' + String(error));
        } finally { setIsPrinting(false); }
    };

    const handleOpenSend = () => {
        if (!pedidoGuid) {
            toast.error('No se encontró el identificador de la venta. Finaliza una venta nueva e intenta nuevamente.');
            return;
        }
        setSendError('');
        setSendDialogOpen(true);
    };

    const handleSend = async (event) => {
        event.preventDefault();
        const correo = recipientEmail.trim();
        if (!correo) {
            setSendError('Ingresa el correo electrónico del destinatario.');
            return;
        }
        setSendError('');
        setIsSending(true);
        try {
            await posService.enviarRecibo(pedidoGuid, correo);
            setSendDialogOpen(false);
            setRecipientEmail('');
            toast.success('Recibo PDF enviado por correo');
        } catch (error) {
            const message = String(error || 'Error desconocido');
            setSendError(message);
            toast.error('No se pudo enviar el recibo');
        } finally { setIsSending(false); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-56px)] w-full bg-bg-subtle relative">
            <ContentHeader className="flex items-center justify-between bg-surface supports-[backdrop-filter]:bg-surface">
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
                            <div className="relative w-24 h-24 bg-[#0BC33F]/10 border border-[#0BC33F]/30 rounded-full flex items-center justify-center z-[var(--z-layer-raised)] shadow-[0_0_40px_rgba(11,195,63,0.3)]">
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
                                FOLIO: #{operationPrefix}-{String(folio).padStart(6, '0')}
                            </span>
                        </div>

                        {/* Bento Grid Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-12 text-left">

                            {/* Total Amount Card using ResumenCuenta styles */}
                            <div className="bg-gradient-to-br from-[#002366] to-[#001233] p-8 space-y-4 rounded-2xl shadow-[0_8px_30px_rgba(0,35,102,0.2)] border border-[#002366]/50 text-white relative overflow-hidden flex flex-col justify-center">
                                {/* Subtle overlay pattern/glow from ResumenCuenta */}
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-[0.03] blur-2xl pointer-events-none" />
                                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-blue-400 opacity-[0.05] blur-xl pointer-events-none" />

                                <span className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest leading-none mb-1.5 relative z-[var(--z-layer-raised)]">
                                    Total de Venta
                                </span>

                                <div className="flex items-baseline gap-1 relative z-[var(--z-layer-raised)]">
                                    <span className="text-4xl font-black tabular-nums tracking-tighter leading-none text-white drop-shadow-sm">
                                        {moneyFormat(total > 0 ? total : 0)}
                                    </span>
                                </div>

                                {cambio > 0 && (
                                    <div className="pt-4 mt-2 border-t border-white/10 relative z-[var(--z-layer-raised)]">
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
                                            <ItemPagos
                                                key={index}
                                                pago={pago}
                                                handleDeletePaymentItem={() => {}}
                                            />
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
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 z-[var(--z-layer-bg)]" />
                            </Button>

                            {/* Secondary Actions */}
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                                <Button
                                    onClick={handlePrint}
                                    disabled={isPrinting}
                                    variant="outline"
                                    className="flex-1 sm:flex-none h-10 px-4 rounded-xl text-[11px] font-bold uppercase gap-2 shadow-sm border-border/80 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] text-muted-foreground hover:text-foreground bg-surface-container-lowest dark:bg-zinc-900"
                                >
                                    <Printer className="size-4" />
                                    <span className="hidden sm:inline">{isPrinting ? 'Imprimiendo…' : 'Imprimir'}</span>
                                </Button>

                                <Button
                                    type="button"
                                    onClick={handleOpenSend}
                                    disabled={isSending}
                                    variant="outline"
                                    className="flex-1 sm:flex-none h-10 px-4 rounded-xl text-[11px] font-bold uppercase gap-2 shadow-sm border-border/80 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] text-muted-foreground hover:text-foreground bg-surface-container-lowest dark:bg-zinc-900"
                                >
                                    <Mail className="size-4" />
                                    <span className="hidden sm:inline">{isSending ? 'Enviando…' : 'Enviar'}</span>
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

            <Dialog open={sendDialogOpen} onOpenChange={(open) => !isSending && setSendDialogOpen(open)}>
                <DialogContent className="sm:max-w-md rounded-2xl border-border/70 p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-[#002366] to-[#001233] px-6 py-5 text-white">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 border border-white/15 mb-4">
                            <Mail className="size-5" />
                        </div>
                        <DialogHeader className="mb-0">
                            <DialogTitle className="text-xl text-white">Enviar recibo por correo</DialogTitle>
                            <DialogDescription className="text-blue-100/80">
                                Se enviará un mensaje HTML con el recibo PDF de la venta {folio ? `#${operationPrefix}-${String(folio).padStart(6, '0')}` : ''}.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <form onSubmit={handleSend} className="p-6">
                        <label htmlFor="receipt-recipient" className="mb-2 block text-sm font-semibold text-foreground">
                            Correo del destinatario
                        </label>
                        <input
                            id="receipt-recipient"
                            type="email"
                            required
                            autoFocus
                            autoComplete="email"
                            value={recipientEmail}
                            onChange={(event) => {
                                setRecipientEmail(event.target.value);
                                if (sendError) setSendError('');
                            }}
                            disabled={isSending}
                            placeholder="cliente@correo.com"
                            className="w-full rounded-xl border border-border bg-bg-subtle px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                        />

                        {sendError && (
                            <div role="alert" className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
                                {sendError}
                            </div>
                        )}

                        <DialogFooter className="mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSending}
                                onClick={() => setSendDialogOpen(false)}
                                className="h-10 rounded-xl px-5"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSending || !recipientEmail.trim()}
                                className="h-10 rounded-xl bg-primary px-5 text-primary-foreground"
                            >
                                {isSending ? (
                                    <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Enviando…</>
                                ) : (
                                    <><Mail className="size-4" />Enviar recibo</>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
