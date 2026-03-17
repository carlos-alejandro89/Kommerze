import { cn } from '@/lib/utils';
import { Package, FileText, ArrowRightLeft } from 'lucide-react';

export function BtnTipoPedido({ tipoPedido, isActive, onClick }) {
    const Icons = {
        'Venta': Package,
        'Cotización': FileText,
        'Transferencia': ArrowRightLeft,
    }

    const Icono = Icons[tipoPedido.Nombre] || Package

    return (
        <button
            onClick={() => onClick(tipoPedido.ID)}
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

                </div>
                <div className="font-semibold text-sm mb-1 text-foreground">{tipoPedido.Nombre}</div>
                <div className="text-xs text-muted-foreground">
                    {tipoPedido.Descripcion}
                </div>

            </div>
        </button>
    )
}