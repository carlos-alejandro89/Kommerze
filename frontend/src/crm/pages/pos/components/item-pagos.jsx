import { CreditCard, Pencil, Trash2 } from "lucide-react";
import { moneyFormat } from '@/lib/helpers';
import visa from '@/assets/visa.svg';

export function ItemPagos({ pago, handleDeletePaymentItem }) {
    const deletePayment = ()=>{
        handleDeletePaymentItem(pago.ID)
    }
    return (
        <div className="flex items-center justify-between border border-border rounded-xl gap-2 px-4 py-4 bg-slate-50 dark:bg-zinc-800/50 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800">
            <div className="flex items-center gap-3.5">
                <div className=" shrink-0 flex items-center justify-center">
                    <img alt="Visa" src={visa} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'block'; }} />
                    <CreditCard className="size-5 text-slate-800 hidden" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-mono hover:text-primary mb-px cursor-default text-foreground">
                        {pago.Nombre}
                    </span>
                    <span className="text-sm text-secondary-foreground">
                        {pago.Referencia}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-5">

                <span className="font-extrabold text-foreground text-lg cursor-default">{moneyFormat(pago.Monto)}</span>
                <div className="flex gap-0.5">
                   
                    <button 
                    onClick={deletePayment}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="size-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}