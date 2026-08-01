import { cn } from '@/lib/utils';
import { Check, FileText, ShoppingCart } from 'lucide-react';

export function BtnTipoPedido({ tipoPedido, isActive, onClick }) {
    const Icons = {
        'Venta': ShoppingCart,
        'Cotización': FileText,
    }

    const Icono = Icons[tipoPedido.Nombre] || FileText;
    const descripcion = tipoPedido.Nombre === 'Venta'
        ? 'Registra la operación, procesa el pago y descuenta las existencias.'
        : 'Genera una propuesta de venta sin afectar las existencias.';

    return (
        <button
            type="button"
            onClick={() => onClick(tipoPedido.ID)}
            className={cn(
                'flex min-h-[96px] w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all',
                isActive
                    ? 'border-blue-500/70 bg-blue-50/65 shadow-[0_12px_30px_-25px_rgba(8,118,249,.8)] ring-1 ring-blue-500/15 dark:bg-blue-400/[.07]'
                    : 'border-border/70 bg-background/55 hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-blue-400/[.04]'
            )}
        >
            <span className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-xl',
                isActive ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
            )}>
                <Icono className="size-6" strokeWidth={1.7} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{tipoPedido.Nombre}</span>
                    {isActive && <Check className="size-4 text-blue-600 dark:text-blue-300" />}
                </span>
                <span className="mt-1 block max-w-md text-xs leading-relaxed text-muted-foreground">{descripcion}</span>
            </span>
        </button>
    )
}
