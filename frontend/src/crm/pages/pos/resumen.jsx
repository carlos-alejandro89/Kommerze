import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronRight, FileCheck } from 'lucide-react';
import { ServiceConsultarExistenciaProductos } from '../../../../wailsjs/go/main/App';
import { ModalDetalleInventario } from './modal-detalle-inventario';

export function ResumenCuenta({ subtotal, descuento, total, countItems, currentStep }) {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [invalidItems, setInvalidItems] = useState([]);

    const urlLinks = {
        1: '/pos/transaction',
        2: '/pos/payment',
        3: '/pos/order-placed'
    }

    const nextPage = currentStep + 1

    const ConsultarExistencias = async () => {
        try {
            const cartItems = localStorage.getItem('cart')
            const cart = JSON.parse(cartItems)
            let comparativoExistencias = JSON.parse(cartItems)
            const productosGuids = cart.map(item => item.id)

            const productos = await ServiceConsultarExistenciaProductos(productosGuids)

            comparativoExistencias = comparativoExistencias.map(prev => {
                const productoEncontrado = productos.find(producto => producto.Guid === prev.id)
                return {
                    ...prev,

                    GuidBase: productoEncontrado.GuidBase,
                    Existencia: prev.fraccionable ? productoEncontrado.ExistenciaFraccion : productoEncontrado.Existencia,
                    CantidadBase: prev.fraccionable ? prev.quantity * productoEncontrado.Contenido : prev.quantity
                }
            })

            console.log(comparativoExistencias)
            localStorage.setItem('validCart', JSON.stringify(comparativoExistencias))

            const invalidItemsFound = []

            const isValid = productos.every(producto => {
                const productoEncontrado = cart.find(item => item.id === producto.Guid)
                const existencia = productoEncontrado.fraccionable ? producto.ExistenciaFraccion : producto.Existencia
                if (existencia < productoEncontrado.quantity) {
                    invalidItemsFound.push({
                        ...productoEncontrado,
                        Existencia: existencia
                    })
                    return false
                }
                return true
            })

            if (!isValid) {
                setInvalidItems(comparativoExistencias)
            }

            return isValid
        } catch (error) {
            console.error('Error en ConsultarExistencias:', error)
            return false
        }
    }

    const goToNextPage = async () => {

        if (currentStep === 0 && countItems === 0) {
            return
        }
        if (currentStep === 1) {
            const rawOperationType = localStorage.getItem('operationType')
            const operationType = rawOperationType ? JSON.parse(rawOperationType) : null

            if (operationType === 1 || operationType === 3) {
                const inventarioValido = await ConsultarExistencias()
                if (!inventarioValido) {
                    setIsModalOpen(true)
                    return
                }
            }
        }

        return navigate(urlLinks[nextPage] || '#')
    }


    return (
        <div className="p-0">
            <div className="bg-gradient-to-br from-[#002366] to-[#001233] p-5 space-y-4 rounded-2xl shadow-[0_8px_30px_rgba(0,35,102,0.2)] border border-[#002366]/50 text-white relative overflow-hidden">
                {/* Subtle overlay pattern/glow */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-[0.03] blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-blue-400 opacity-[0.05] blur-xl pointer-events-none" />

                <h4 className="text-[10px] font-black uppercase text-blue-200/60 tracking-tighter relative z-10">Resumen de Cuenta</h4>
                <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-xs">
                        <span className="text-blue-100/70 font-medium">Subtotal</span>
                        <span className="font-bold text-white">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-blue-100/70 font-medium">Descuento</span>
                        <span className="font-bold text-white">${descuento.toFixed(2)}</span>
                    </div>

                    <div className="pt-3 mt-1 border-t border-white/10 flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest leading-none mb-1.5">Total Neto</span>
                            <span className="text-3xl font-black tabular-nums tracking-tighter leading-none text-white drop-shadow-sm">${total.toFixed(2)}</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-200/80 bg-white/10 px-2 py-0.5 rounded-full uppercase">{countItems} Art.</span>
                    </div>
                </div>

                <Button
                    id="pay-button"
                    onClick={() => goToNextPage()}
                    className="w-full h-11 rounded-lg bg-white text-[#002366] hover:bg-blue-50 hover:text-[#001233] border-none font-black text-xs shadow-[0_4px_14px_rgba(255,255,255,0.15)] flex items-center justify-between px-4 group relative overflow-hidden active:scale-[0.98] transition-all z-10"
                >
                    <div className="flex items-center gap-2 relative z-10 transition-transform group-hover:translate-x-1">
                        {nextPage === Object.keys(urlLinks).length ? <FileCheck className="size-4" /> : <ExternalLink className="size-4" />}
                        <span className="uppercase tracking-wide">
                            {nextPage === Object.keys(urlLinks).length ? 'Procesar transacción' : 'Siguiente'}
                        </span>
                    </div>
                    <ChevronRight className="size-4 relative z-10 opacity-70 group-hover:opacity-100 transition-opacity" />

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-[#002366]/5 to-transparent skew-x-12 z-0" />
                </Button>
            </div>

            <ModalDetalleInventario
                items={invalidItems}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </div>
    );
}
