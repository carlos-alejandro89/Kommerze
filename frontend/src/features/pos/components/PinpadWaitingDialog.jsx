import { CheckCircle2, CreditCard, Radio, Smartphone, Wifi, XCircle } from 'lucide-react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
});

export function PinpadWaitingDialog({ open, amount, status = 'waiting', message, onOpenChange }) {
    const formattedAmount = currencyFormatter.format(Number(amount || 0));
    const isSuccess = status === 'success';
    const isError = status === 'error';
    const isWaiting = status === 'waiting';
    const statusColor = isSuccess ? 'emerald' : isError ? 'red' : 'primary';
    const title = isSuccess
        ? 'Pago aprobado'
        : isError
            ? 'Pago no aprobado'
            : 'Esperando respuesta de la terminal...';
    const description = isWaiting
        ? <>Por favor, <span className="font-bold text-primary">inserte, deslice o acerque</span> la tarjeta para continuar.</>
        : message || (isSuccess ? 'Transacción aprobada correctamente.' : 'La transacción no pudo ser aprobada.');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="w-[min(92vw,520px)] overflow-hidden border-white/40 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95"
            >
                <div className="flex flex-col items-center px-10 py-9 text-center">
                    <div className="relative mb-8 flex h-48 w-full max-w-[320px] items-center justify-center">
                        <div className={`absolute inset-x-6 bottom-3 h-12 rounded-full blur-2xl ${isError ? 'bg-red-500/10' : isSuccess ? 'bg-emerald-500/10' : 'bg-primary/10'}`} />

                        <div className="relative flex w-full items-center justify-center gap-5">
                            <div className="relative flex h-36 w-28 flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-100 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.14)] dark:border-white/10 dark:from-zinc-900 dark:to-zinc-950">
                                <div className="mb-3 rounded-xl border border-slate-200 bg-slate-950 p-2 dark:border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                        <span className="text-[7px] font-semibold text-slate-400">ONLINE</span>
                                    </div>
                                    <div className="mt-3 h-2 w-14 rounded-full bg-primary/70" />
                                    <div className="mt-1.5 h-1.5 w-10 rounded-full bg-slate-600" />
                                </div>

                                <div className="grid grid-cols-3 gap-1.5">
                                    {Array.from({ length: 9 }).map((_, index) => (
                                        <div key={index} className="h-3 rounded bg-slate-200 dark:bg-zinc-700" />
                                    ))}
                                </div>

                                <div className="mt-auto h-1.5 rounded-full bg-emerald-400/80" />
                            </div>

                            <div className="flex flex-col items-center gap-3">
                                {isWaiting ? (
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 animate-[pinpad-pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
                                        <span className="h-1.5 w-1.5 animate-[pinpad-pulse_1.4s_ease-in-out_0.18s_infinite] rounded-full bg-primary/70" />
                                        <span className="h-1.5 w-1.5 animate-[pinpad-pulse_1.4s_ease-in-out_0.36s_infinite] rounded-full bg-primary/40" />
                                    </div>
                                ) : (
                                    <div className={`flex size-14 animate-[pinpad-result_0.45s_ease-out] items-center justify-center rounded-full ${isSuccess ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                        {isSuccess ? <CheckCircle2 className="size-8" /> : <XCircle className="size-8" />}
                                    </div>
                                )}
                                <div className={`h-px w-16 bg-gradient-to-r from-transparent to-transparent ${isError ? 'via-red-500/45' : isSuccess ? 'via-emerald-500/45' : 'via-primary/45'}`} />
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${isError ? 'border-red-500/15 bg-red-500/5 text-red-600' : isSuccess ? 'border-emerald-500/15 bg-emerald-500/5 text-emerald-600' : 'border-primary/15 bg-primary/5 text-primary'}`}>
                                    {isError ? 'Declinado' : isSuccess ? 'Aprobado' : 'Esperando'}
                                </span>
                            </div>

                            <div className="relative flex h-24 w-36 flex-col justify-between rounded-xl bg-gradient-to-br from-[#002366] to-[#001233] p-4 shadow-[0_18px_40px_rgba(0,35,102,0.22)]">
                                <div className="flex items-center justify-between">
                                    <CreditCard className="size-5 text-white/80" />
                                    <Radio className="size-4 text-emerald-300" />
                                </div>
                                <div>
                                    <div className="h-2 w-10 rounded-full bg-amber-300/90" />
                                    <div className="mt-3 h-1.5 w-24 rounded-full bg-white/35" />
                                    <div className="mt-1.5 h-1.5 w-16 rounded-full bg-white/20" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogHeader className="mb-0 items-center text-center">
                        <div className="mb-2">
                            <p className="text-4xl font-bold tracking-tight text-primary">{formattedAmount}</p>
                            <p className="mt-1 text-[11px] font-bold uppercase text-muted-foreground">Monto a cobrar</p>
                        </div>
                        <DialogTitle className={`text-2xl font-semibold ${isError ? 'text-red-600' : isSuccess ? 'text-emerald-600' : 'text-foreground'}`}>
                            {title}
                        </DialogTitle>
                        <DialogDescription className="max-w-sm text-base leading-relaxed text-muted-foreground">
                            {description}
                        </DialogDescription>
                    </DialogHeader>

                    <div className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${isError ? 'border-red-500/15 bg-red-500/5 text-red-700 dark:text-red-300' : isSuccess ? 'border-emerald-500/15 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300' : 'border-emerald-500/15 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isError ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        {isWaiting ? 'Comunicación establecida con Pinpad' : message}
                    </div>

                    <div className="mt-8 flex w-full flex-col items-center gap-6 border-t border-border/70 pt-7">
                        <div className="flex items-center gap-3 text-primary">
                            <CheckCircle2 className="size-5 text-emerald-500" />
                            <Radio className="size-5" />
                            <CreditCard className="size-5" />
                            <Smartphone className="size-5" />
                            <div className="mx-1 h-4 w-px bg-border" />
                            <span className="text-xs font-semibold text-muted-foreground">VISA / MASTERCARD / AMEX</span>
                        </div>

                        {isWaiting && (
                            <DialogClose className="w-full rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground transition-all hover:bg-muted active:scale-[0.98]">
                                Cancelar operación
                            </DialogClose>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 bg-muted/70 px-8 py-4 text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-2">
                        <Wifi className={`size-4 ${isError ? 'text-red-500' : isSuccess ? 'text-emerald-500' : 'text-primary'}`} />
                        {isWaiting ? `Esperando operación por ${formattedAmount} en Pinpad` : message}
                    </span>
                    <span className={`h-2 w-2 rounded-full ${isError ? 'bg-red-500' : isSuccess ? 'bg-emerald-500' : 'bg-emerald-500 animate-pulse'}`} />
                </div>

                <style>{`
                    @keyframes pinpad-pulse {
                        0%, 100% {
                            opacity: 0.35;
                            transform: translateY(0) scale(0.92);
                        }
                        50% {
                            opacity: 1;
                            transform: translateY(-2px) scale(1);
                        }
                    }

                    @keyframes pinpad-result {
                        0% {
                            opacity: 0;
                            transform: scale(0.72);
                        }
                        70% {
                            opacity: 1;
                            transform: scale(1.08);
                        }
                        100% {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    );
}
