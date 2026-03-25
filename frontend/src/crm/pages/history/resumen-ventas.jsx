import React from 'react';
import { moneyFormat } from '@/lib/helpers';

export function ResumenVentas({ totalVentas, efectivo, tarjetaCredito, tarjetaDebito, spei }) {
    return (
        <div className="p-0">
            <div className="bg-gradient-to-br from-[#002366] to-[#001233] p-5 space-y-4 rounded-2xl shadow-[0_8px_30px_rgba(0,35,102,0.2)] border border-[#002366]/50 text-white relative overflow-hidden">
                {/* Subtle overlay pattern/glow */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-[0.03] blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-blue-400 opacity-[0.05] blur-xl pointer-events-none" />

                <h4 className="text-[10px] font-black uppercase text-blue-200/60 tracking-tighter relative z-10">Resumen de Ventas</h4>
                
                <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-xs">
                        <span className="text-blue-100/70 font-medium">Efectivo</span>
                        <span className="font-bold text-white">{moneyFormat(efectivo)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-blue-100/70 font-medium">Tarjeta de Crédito</span>
                        <span className="font-bold text-white">{moneyFormat(tarjetaCredito)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-blue-100/70 font-medium">Tarjeta de Débito</span>
                        <span className="font-bold text-white">{moneyFormat(tarjetaDebito)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-blue-100/70 font-medium">Transferencias SPEI</span>
                        <span className="font-bold text-white">{moneyFormat(spei)}</span>
                    </div>

                    <div className="pt-3 mt-1 border-t border-white/10 flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest leading-none mb-1.5">Total de Ventas</span>
                            <span className="text-3xl font-black tabular-nums tracking-tighter leading-none text-white drop-shadow-sm">{moneyFormat(totalVentas)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
