import { toast } from 'sonner';
import { ModalFormaPago } from '../modal-forma-pago';
import {
    getMethodColor,
    getMethodIcon,
    isCardPayment,
    pinpadConfigurada,
} from './payment-method-utils';

export function PaymentCard({ fp, isActive, onSelect, onAddPayment, saldoPendiente }) {
    const Icon = getMethodIcon(fp);
    const gradient = getMethodColor(fp);

    const displayName = fp.Nombre
        ? fp.Nombre.charAt(0).toUpperCase() + fp.Nombre.slice(1).toLowerCase()
        : fp.Nombre;

    const cardButtonClassName = `
        relative w-full rounded-2xl p-5 text-left transition-all duration-200 overflow-hidden
        border-2 group active:scale-[0.98]
        ${isActive
            ? 'border-primary shadow-lg shadow-primary/20 bg-primary/5 dark:bg-primary/10'
            : 'border-border hover:border-primary/50 bg-white dark:bg-zinc-900 hover:shadow-md'
        }
    `;

    const cardContent = (
        <>
            <div className={`
                size-11 rounded-xl flex items-center justify-center mb-4
                bg-gradient-to-br ${gradient} shadow-md
                group-hover:scale-110 transition-transform duration-200
            `}>
                <Icon className="size-5 text-white" />
            </div>

            <div className="font-bold text-sm text-foreground leading-tight mb-1">
                {displayName}
            </div>
            <div className="text-xs text-muted-foreground leading-snug line-clamp-2">
                {fp.Descripcion || 'Método de pago'}
            </div>

            {isActive && (
                <div className="absolute top-3 right-3 size-2.5 rounded-full bg-primary shadow-[0_0_6px_2px_rgba(var(--primary),0.4)]" />
            )}

            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-white/5 to-transparent" />
        </>
    );

    if (pinpadConfigurada && isCardPayment(fp)) {
        const handleCardPayment = () => {
            onSelect(fp.ID);

            if (saldoPendiente <= 0) {
                toast.info('El pedido ya está cubierto');
                return;
            }

            onAddPayment({
                ID: fp.ID,
                Clave: fp.Clave,
                Nombre: fp.Nombre,
                Monto: saldoPendiente.toFixed(2),
                Referencia: 'Pago con tarjeta',
            });
        };

        return (
            <button
                type="button"
                onClick={handleCardPayment}
                className={cardButtonClassName}
            >
                {cardContent}
            </button>
        );
    }

    return (
        <ModalFormaPago
            formaPago={fp}
            isActive={isActive}
            onClick={onSelect}
            handleAddPayment={onAddPayment}
            renderTrigger={(triggerProps) => (
                <button
                    {...triggerProps}
                    className={cardButtonClassName}
                >
                    {cardContent}
                </button>
            )}
        />
    );
}
