import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ModalFormaPago } from '../modal-forma-pago';
import { PaymentCard } from './PaymentCard';
import { isCommonMethod } from './payment-method-utils';

export function PaymentMethodSelector({ formaPago, paymentMethod, onSelect, onAddPayment, saldoPendiente }) {
    const [showOthers, setShowOthers] = React.useState(false);

    const common = formaPago.filter(m => isCommonMethod(m));
    const others = formaPago.filter(m => !isCommonMethod(m));
    const visibleMethods = common.length > 0 ? common : formaPago;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {visibleMethods.map(fp => (
                    <PaymentCard
                        key={fp.ID}
                        fp={fp}
                        isActive={paymentMethod === fp.ID}
                        onSelect={onSelect}
                        onAddPayment={onAddPayment}
                        saldoPendiente={saldoPendiente}
                    />
                ))}
            </div>

            {others.length > 0 && (
                <div>
                    <button
                        type="button"
                        onClick={() => setShowOthers(v => !v)}
                        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-1 py-1.5 group"
                    >
                        {showOthers
                            ? <ChevronUp className="size-3.5 transition-transform" />
                            : <ChevronDown className="size-3.5 transition-transform" />
                        }
                        <span>
                            {showOthers ? 'Ocultar' : 'Ver'} otros métodos fiscales
                            <span className="ml-1.5 text-[10px] font-bold bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-full">
                                {others.length}
                            </span>
                        </span>
                    </button>

                    {showOthers && (
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 mt-2 p-3 rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-zinc-900/50 animate-in fade-in slide-in-from-top-1 duration-200">
                            {others.map(fp => (
                                <ModalFormaPago
                                    key={fp.ID}
                                    formaPago={fp}
                                    isActive={paymentMethod === fp.ID}
                                    onClick={onSelect}
                                    handleAddPayment={onAddPayment}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
