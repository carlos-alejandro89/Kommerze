import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown, ExternalLink, ChevronRight, FileCheck } from 'lucide-react';
import { ConsultarExistencias, confirmarTransaccion, validarPago } from './resumen-actions';
import { ModalDetalleInventario } from './modal-detalle-inventario';
import { DialogAlert } from '@/components/common/dialog-alert';
import { useActivation } from '@/providers/ActivationProvider';
import { usePosService } from './usePosService';
import { useTurno } from '@/providers/TurnoProvider';
import { cn } from '@/lib/utils';
import { TRANSACTION_TYPES } from './transaction-types';

export function ResumenCuenta({ subtotal, descuento, total, countItems, currentStep }) {
    const { store } = useActivation();
    const navigate = useNavigate();
    const posService = usePosService();
    const { turnoActivo, jornadaActiva } = useTurno();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [invalidItems, setInvalidItems] = useState([]);
    const [alertConfig, setAlertConfig] = useState({ open: false, title: '', description: '', type: 'warning' });
    const [nextPage, setNextPage] = useState(currentStep + 1);
    const [isExpanded, setIsExpanded] = useState(false);

    const urlLinks = {
        1: '/pos/transaction',
        2: '/pos/payment',
        3: '/pos/order-placed'
    }

    const stepValidation = {
        0: () => countItems > 0,
        1: async (operationType) => {

            const inventarioValido = (operationType === TRANSACTION_TYPES.COTIZACION.id) ? true : await ConsultarExistencias(posService.consultarExistencias, setInvalidItems)
            if (!inventarioValido) {
                setIsModalOpen(true)
                return false
            }


            if (parseInt(operationType) === TRANSACTION_TYPES.COTIZACION.id || parseInt(operationType) === TRANSACTION_TYPES.TRASPASO.id) {
                const transaccionValida = await confirmarTransaccion(posService.confirmarTransaccion, setAlertConfig, store, turnoActivo)
                setNextPage(currentStep + 2)
                return transaccionValida
            }

            return true

        },
        2: async (operationType) => {
            if (operationType === TRANSACTION_TYPES.VENTA.id) {
                const pagoValido = await validarPago(total, setAlertConfig)
                if (!pagoValido) {
                    return false
                }
            }

            const transaccionValida = await confirmarTransaccion(posService.confirmarTransaccion, setAlertConfig, store, turnoActivo)
            return transaccionValida
        }
    }

    const goToNextPage = async () => {
        // ── Validación 1: Jornada de sucursal activa ─────────────────────────────────────
        if (!jornadaActiva) {
            setAlertConfig({
                open: true,
                title: 'Sucursal Cerrada',
                description: 'La jornada de la sucursal ha sido cerrada. No es posible procesar ventas hasta que un supervisor inicie una nueva jornada.',
                type: 'error',
            });
            return;
        }

        // ── Validación 2: Turno del cajero activo ────────────────────────────────────────
        if (!turnoActivo) {
            setAlertConfig({
                open: true,
                title: 'Sin Turno Activo',
                description: 'No tienes un turno de caja abierto. Apertura tu turno antes de procesar ventas.',
                type: 'warning',
                action: () => navigate('/caja/apertura'),
                actionLabel: 'Abrir Turno',
            });
            return;
        }

        // ── Validación 3: Carrito no vacío ────────────────────────────────────────────────
        if (countItems === 0) {
            setAlertConfig({
                open: true,
                title: 'Carrito Vacío',
                description: 'Agrega al menos un producto antes de continuar.',
                type: 'warning',
            });
            return;
        }

        // ── Validación 4: Total mayor a cero ─────────────────────────────────────────────
        if (total <= 0) {
            setAlertConfig({
                open: true,
                title: 'Total Inválido',
                description: 'El total de la venta no puede ser cero o negativo.',
                type: 'warning',
            });
            return;
        }

        const rawOperationType = localStorage.getItem('operationType');
        const operationType = rawOperationType ? JSON.parse(rawOperationType) : null;

        let calcNextPage = (operationType === TRANSACTION_TYPES.VENTA.id) ? currentStep + 1 : currentStep + 2;
        setNextPage(calcNextPage);

        const validatorForCurrentStep = stepValidation[currentStep];
        if (validatorForCurrentStep) {
            const canProceed = await validatorForCurrentStep(operationType);
            if (!canProceed) return;
        }

        return navigate(urlLinks[calcNextPage] || '#');
    };


    return (
        <div className="p-0">
            <div className="bg-gradient-to-br from-[#002366] to-[#001233] p-4 space-y-4 rounded-[28px] shadow-2xl border border-white/10 text-white relative overflow-hidden transition-all duration-300">
                {/* Subtle overlay pattern/glow */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-[0.03] blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-blue-400 opacity-[0.05] blur-xl pointer-events-none" />

                <div
                    className={cn(
                        'relative z-[var(--z-layer-raised)] overflow-hidden px-2 transition-all duration-300 ease-out',
                        isExpanded ? 'max-h-36 opacity-100 mb-1' : 'max-h-0 opacity-0 mb-0'
                    )}
                >
                    <h4 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-blue-200/60">
                        Resumen de Cuenta
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                            <span className="text-blue-100/70 font-medium">Subtotal</span>
                            <span className="font-bold text-white">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-blue-100/70 font-medium">Descuento</span>
                            <span className="font-bold text-white">${descuento.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="mt-4 border-t border-white/10" />
                </div>

                <div className="space-y-4 relative z-[var(--z-layer-raised)]">
                    <button
                        type="button"
                        onClick={() => setIsExpanded(prev => !prev)}
                        className="flex w-full items-end justify-between px-2 text-left"
                        aria-expanded={isExpanded}
                    >
                        <div className="flex flex-col">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-200/60 uppercase tracking-widest leading-none mb-1.5">
                                Total Neto
                                <ChevronDown
                                    className={cn(
                                        'size-4 transition-transform duration-300',
                                        isExpanded && 'rotate-180'
                                    )}
                                    strokeWidth={2.4}
                                />
                            </span>
                            <span className="text-3xl font-black tabular-nums tracking-tighter leading-none text-white drop-shadow-sm">${total.toFixed(2)}</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-200/80 bg-white/10 px-2 py-0.5 rounded-full uppercase">{countItems} Art.</span>
                    </button>
                </div>

                <Button
                    id="pay-button"
                    onClick={() => goToNextPage()}
                    disabled={currentStep === 0 && countItems === 0}
                    title={currentStep === 0 && countItems === 0 ? 'Agrega productos al carrito para continuar' : undefined}
                    className="w-full h-11 rounded-lg bg-white text-[#002366] hover:bg-blue-50 hover:text-[#001233] border-none font-black text-xs shadow-[0_4px_14px_rgba(255,255,255,0.15)] flex items-center justify-between px-4 group relative overflow-hidden active:scale-[0.98] transition-all z-10 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
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

            <DialogAlert
                open={alertConfig.open}
                onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}
                type={alertConfig.type}
                title={alertConfig.title}
                description={alertConfig.description}
                onCancel={() => setAlertConfig(prev => ({ ...prev, open: false }))}
            />
        </div>
    );
}
