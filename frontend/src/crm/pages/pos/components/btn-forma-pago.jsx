import { cn } from '@/lib/utils';
import { DollarSign, CreditCard, CheckCircle, MoreHorizontal, ArrowRightLeft } from 'lucide-react';

const Icons = {
    'Efectivo': DollarSign,
    'Tarjeta': CreditCard,
    'Transferencia': ArrowRightLeft,
    'Cheque': CheckCircle,
    'Otro': MoreHorizontal,
}
export function BtnFormaPago({ formaPago, isActive, onClick }) {
    const Icono = Icons[formaPago.Nombre] || MoreHorizontal

    const handleSelect = () => {
        onClick(formaPago.ID)
    }

    return (
        <button
            onClick={handleSelect}
            className={cn(
                "w-full rounded-xl border p-3 flex flex-col justify-between text-left transition-all",
                isActive
                    ? "bg-primary/5 border-primary shadow-[0_0_0_1px_rgba(var(--primary),0.2)]"
                    : "bg-background border-border hover:border-primary/50"
            )}
        >
            <div className="mb-1">
                <div className="flex items-center gap-1.5 mb-2">
                    <div className={cn(
                        "flex items-center justify-center size-6 rounded-md transition-colors",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-primary"
                    )}>
                        <Icono className="size-3.5" />
                    </div>
                    <div className="font-semibold text-sm mb-1 text-foreground">{formaPago.Nombre}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                    {formaPago.Descripcion}
                </div>
            </div>
        </button>
    )
}