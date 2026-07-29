import {
    DollarSign, CreditCard, ArrowRightLeft, CheckCircle, MoreHorizontal, Trash2
} from 'lucide-react';
import { moneyFormat } from '@/lib/helpers';

const ICONS_BY_CLAVE = {
    '01': { Icon: DollarSign,     cls: 'text-emerald-500' },
    '02': { Icon: CheckCircle,    cls: 'text-amber-500'   },
    '03': { Icon: ArrowRightLeft, cls: 'text-violet-500'  },
    '04': { Icon: CreditCard,     cls: 'text-blue-500'    },
    '05': { Icon: CreditCard,     cls: 'text-purple-500'  },
    '06': { Icon: ArrowRightLeft, cls: 'text-cyan-500'    },
    '28': { Icon: CreditCard,     cls: 'text-sky-500'     },
    '29': { Icon: CreditCard,     cls: 'text-indigo-500'  },
};

const DEFAULT = { Icon: MoreHorizontal, cls: 'text-muted-foreground' };

const getCardBrandLogo = (brand) => {
    const normalized = String(brand ?? '').trim().toLowerCase();
    if (normalized.includes('visa')) {
        return { src: '/media/brand-logos/visa.svg', alt: 'Visa' };
    }
    if (normalized.includes('mastercard') || normalized.includes('master card')) {
        return { src: '/media/brand-logos/mastercard.svg', alt: 'Mastercard' };
    }
    return null;
};

export function ItemPagos({ pago, handleDeletePaymentItem }) {
    const { Icon, cls } = ICONS_BY_CLAVE[String(pago.Clave ?? '').trim()] ?? DEFAULT;
    const leyendaPago = pago.TipoTarjeta || pago.Referencia;
    const cardBrandLogo = getCardBrandLogo(pago.MarcaTarjeta);

    return (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background border border-border/60 hover:border-border transition-colors group">
            {/* Ícono */}
            {cardBrandLogo ? (
                <img
                    src={cardBrandLogo.src}
                    alt={cardBrandLogo.alt}
                    className="h-5 w-7 shrink-0 object-contain"
                />
            ) : (
                <Icon className={`size-4 shrink-0 ${cls}`} />
            )}

            {/* Nombre y referencia */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{pago.Nombre}</p>
                {leyendaPago && (
                    <p className="text-[11px] text-muted-foreground truncate">{leyendaPago}</p>
                )}
            </div>

            {/* Monto */}
            <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
                {moneyFormat(pago.Monto)}
            </span>

            {/* Eliminar */}
            <button
                onClick={() => handleDeletePaymentItem(pago.ID)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-all shrink-0"
                title="Eliminar"
            >
                <Trash2 className="size-3.5" />
            </button>
        </div>
    );
}
