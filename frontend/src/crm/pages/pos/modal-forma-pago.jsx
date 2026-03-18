import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog"
import { DollarSign, CreditCard, CheckCircle, MoreHorizontal, ArrowRightLeft, ChevronRight } from 'lucide-react';



import { Badge } from "@/components/ui/badge"
import { BtnFormaPago } from "./components/btn-forma-pago";

const Icons = {
    'Efectivo': DollarSign,
    'Tarjeta': CreditCard,
    'Transferencia': ArrowRightLeft,
    'Cheque': CheckCircle,
    'Otro': MoreHorizontal,
}

export function ModalFormaPago({ formaPago, isActive, onClick, handleAddPayment }) {
    const Icon = Icons[formaPago.Nombre];

    const agregarPago = () => {
        const data = {
            ID: formaPago.ID,
            Nombre: formaPago.Nombre,
            Monto: amountReceived,
            Referencia: 'Pago realizado en caja',
        }
        handleAddPayment(data);
    }

    const [amountReceived, setAmountReceived] = useState('');
    return (
        <Dialog>
            <DialogTrigger asChild>
                <BtnFormaPago formaPago={formaPago} isActive={isActive} onClick={onClick} />
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-50 dark:bg-zinc-950 border dark:border-zinc-800 shadow-2xl overflow-hidden rounded-2xl p-0">
                <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-white/50 dark:bg-zinc-900/50">
                    <DialogTitle className="flex items-center gap-2 text-base tracking-tighter text-foreground mb-1">
                        <Icon className="size-5 text-primary" />
                        {formaPago.Nombre}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-normal text-secondary-foreground">
                        Para proceder con el cobro, introduzca la cifra correspondiente a este método de pago.
                    </DialogDescription>
                </DialogHeader>

                {/* Contenido (form, inputs, etc) iría aquí, con padding interior */}
                <div className="px-6 py-1">
                    {/* Placeholder content so it's not totally empty */}
                    <div className="text-sm text-center">
                        <label className="block text-lg font-bold text-muted-foreground mb-4 tracking-tight">Monto Recibido</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">$</span>
                            <input
                                type="text"
                                value={amountReceived || ''}
                                onChange={(e) => setAmountReceived(e.target.value)}
                                className="w-full bg-slate-200 dark:bg-zinc-800/50 border-none rounded-xl py-6 pl-10 pr-6 text-4xl font-extrabold focus:ring-2 focus:ring-primary/20 dark:text-primary-foreground outline-none transition-all placeholder:text-muted-foreground/30"

                            />
                        </div>
                        <DialogClose asChild>
                        <Button 
                            onClick={agregarPago}
                            className="w-full h-11 mt-8 mb-5 rounded-lg bg-gradient-to-r from-[#002366] to-[#001233] text-white hover:from-[#001233] hover:to-[#000b1a] border-none font-black text-xs shadow-[0_4px_14px_rgba(0,35,102,0.3)] flex items-center justify-between px-4 group relative overflow-hidden active:scale-[0.98] transition-all z-10"
                        >
                            <div className="flex items-center gap-2 relative z-10 transition-transform group-hover:translate-x-1">
                                <CheckCircle className="size-4" />
                                <span className="uppercase tracking-wide">Confirmar</span>
                            </div>
                            <ChevronRight className="size-4 relative z-10 opacity-70 group-hover:opacity-100 transition-opacity" />

                            {/* Shimmer effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 z-0" />
                        </Button>
                        </DialogClose>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}