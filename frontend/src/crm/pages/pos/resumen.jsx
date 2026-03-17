import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronRight } from 'lucide-react';
import { ServiceConsultarExistenciaProductos } from '../../../../wailsjs/go/main/App';
import { ModalDetalleInventario } from './modal-detalle-inventario';

export function ResumenCuenta({ subtotal, descuento, total, countItems, currentStep }) {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [invalidItems, setInvalidItems] = useState([]);

    const urlLinks = {
        1: '/pos/transaction',
        2: '/pos/transaction',
        3: '/pos/payment',

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
                return { ...prev, Existencia: productoEncontrado ? productoEncontrado.Existencia : 0 }
            })
            console.log('Comparativo final:', comparativoExistencias)
            localStorage.setItem('comparativoExistencias', JSON.stringify(comparativoExistencias))

            const invalidItemsFound = []

            const isValid = productos.every(producto => {
                const productoEncontrado = cart.find(item => item.id === producto.Guid)
                if (producto.Existencia < productoEncontrado.quantity) {
                    invalidItemsFound.push({
                        ...productoEncontrado,
                        Existencia: producto.Existencia
                    })
                    return false
                }
                return true
            })

            console.log('Inventario válido:', isValid)
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
        if (currentStep === 2) {
            const rawOperationType = localStorage.getItem('operationType')
            const operationType = rawOperationType ? JSON.parse(rawOperationType) : null

            console.log('Tipo de operación (después de parsear):', operationType, 'tipo:', typeof operationType)

            if (operationType === 1 || operationType === 3) {
                console.log('Cumple la condición para validar inventario. Llamando ConsultarExistencias...')
                const inventarioValido = await ConsultarExistencias()
                console.log('Resultado de la validación:', inventarioValido)
                if (!inventarioValido) {
                    console.log('Inventario no válido, abriendo modal.')
                    setIsModalOpen(true)
                    return
                }
            } else {
                console.log('No requiere validación de inventario para esta operación.')
            }
        }

        return navigate(urlLinks[nextPage] || '#')
    }


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
                    onClick={() => goToNextPage()}
                    className="w-full h-11 rounded-lg bg-slate-900 text-white hover:bg-slate-800 border-none font-black text-xs shadow-none flex items-center justify-between px-4 group relative overflow-hidden active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-2 relative z-10 transition-transform group-hover:translate-x-1">
                        <ExternalLink className="size-4" />
                        <span>Siguiente</span>
                    </div>
                    <ChevronRight className="size-4 relative z-10 opacity-70 group-hover:opacity-100 transition-opacity" />

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 z-0" />
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
