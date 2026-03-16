import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronRight } from 'lucide-react';

export function ResumenCuenta({ subtotal, descuento, total, countItems }) {
    return (
        <div className="p-0">
            <div className="bg-gradient-to-br from-slate-200 via-slate-50 to-slate-300 p-5 space-y-4 rounded-2xl shadow-sm border border-white/50">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Resumen de Cuenta</h4>
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">Subtotal</span>
                        <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">Descuento</span>
                        <span className="font-bold text-slate-900">${descuento.toFixed(2)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-900/10 flex justify-between items-baseline">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Total Neto</span>
                            <span className="text-2xl font-black tabular-nums tracking-tighter leading-none text-slate-950">${total.toFixed(2)}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{countItems} Art.</span>
                    </div>
                </div>


                <Button
                    id="pay-button"
                    className="w-full h-11 rounded-lg bg-slate-900 text-white hover:bg-slate-800 border-none font-black text-xs shadow-none flex items-center justify-between px-4 group relative overflow-hidden active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-2 relative z-10 transition-transform group-hover:translate-x-1">
                        <ExternalLink className="size-4" />
                        <span>Procesar</span>
                    </div>
                    <ChevronRight className="size-4 relative z-10 opacity-70 group-hover:opacity-100 transition-opacity" />

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform pointer-events-none" />
                </Button>
            </div>
        </div>
    );
}
