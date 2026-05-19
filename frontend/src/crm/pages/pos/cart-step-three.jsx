'use client';

import * as React from 'react';
import {
    X,
    Info, LayoutGrid, History, Banknote,
    ChevronDown, ChevronUp,
    DollarSign, CreditCard, ArrowRightLeft, CheckCircle, MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Content } from '@/crm/layout/components/content';
import { ContentHeader } from '@/crm/layout/components/content-header';
import { Steps } from './steps';
import { ResumenCuenta } from './resumen';
import { ModalFormaPago } from './modal-forma-pago';
import { ItemPagos } from './components/item-pagos';
import { moneyFormat } from '@/lib/helpers';
import { ServiceGetSatFormasPago } from '../../../../wailsjs/go/main/App';
const shoppingCart = [];


export function CartStepThree() {
    const navigate = useNavigate();
    const [cart, setCart] = React.useState(shoppingCart);
    const [open, setOpen] = React.useState(false);
    //const [productId, setProductId] = React.useState(null);
    const [itemSelected, setItemSelected] = React.useState({});
    const [paymentMethod, setPaymentMethod] = React.useState(null);
    const [amountReceived, setAmountReceived] = React.useState(0);
    const [pagosAplicados, setPagosAplicados] = React.useState(() => {
        try {
            const stored = localStorage.getItem('pagosAplicados');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    });

    // Cargar métodos de pago desde el backend local
    const [formaPago, setFormaPago] = React.useState([]);

    React.useEffect(() => {
        ServiceGetSatFormasPago()
            .then(res => {
                // res.data es el array de formas de pago del catálogo SAT
                const data = res?.data || [];
                if (data.length > 0) {
                    setFormaPago(data);
                } else {
                    // Fallback si el catálogo SAT no está sincronizado
                    setFormaPago([
                        { ID: 1, Nombre: 'Efectivo', Descripcion: 'Pago en efectivo' },
                        { ID: 2, Nombre: 'Tarjeta', Descripcion: 'Pago con tarjeta de crédito/débito' },
                        { ID: 3, Nombre: 'Transferencia', Descripcion: 'Pago electrónico SPEI' },
                    ]);
                }
            })
            .catch(() => {
                setFormaPago([
                    { ID: 1, Nombre: 'Efectivo', Descripcion: 'Pago en efectivo' },
                    { ID: 2, Nombre: 'Tarjeta', Descripcion: 'Pago con tarjeta de crédito/débito' },
                    { ID: 3, Nombre: 'Transferencia', Descripcion: 'Pago electrónico SPEI' },
                ]);
            });
    }, []);

    React.useEffect(() => {
        const cartStorage = localStorage.getItem('cart')
        if (cartStorage) {
            setCart(JSON.parse(cartStorage))
        }

    }, [])

    const subtotal = cart.reduce((sum, item) => {
        const price = item.price;
        return sum + (price * item.quantity)
    }, 0);

    const descuento = cart.reduce((sum, item) => {
        const valDescuento = item.discount > 0 ? (item.price * item.discount / 100) : 0;
        return sum + (valDescuento * item.quantity)
    }, 0);

    const totalPagos = pagosAplicados.reduce((suma, item) => {
        return suma + parseFloat(item.Monto)
    }, 0);

    React.useEffect(() => {
        setAmountReceived(totalPagos)
        localStorage.setItem('pagosAplicados', JSON.stringify(pagosAplicados))

    }, [pagosAplicados])

    const total = subtotal - descuento;

    const handleProductDetails = (productId) => {
        const item = cart.find(item => item.id === productId);
        setItemSelected(item);
        setOpen(true);
    };

    const handleSelectPaymentMethod = (paymentMethod) => {
        setPaymentMethod(paymentMethod);
    }

    const handleAddPayment = (paymentInfo) => {
        const pagoExists = pagosAplicados.find(pago => pago.ID == paymentInfo.ID)
        if (pagoExists) {
            const pagos = pagosAplicados.map(p => p.ID == paymentInfo.ID ? paymentInfo : p)
            setPagosAplicados(pagos)
        } else {
            setPagosAplicados([...pagosAplicados, paymentInfo])
        }

    }

    const handleDeletePaymentItem = (paymentItem) => {
        setPagosAplicados(pagos => {
            const payments = pagos.filter(p => p.ID !== paymentItem)
            return payments;
        })
    }





    return (

        <div className="flex flex-col h-[calc(100vh-56px)] w-full bg-bg-subtle relative">
            <ContentHeader className="flex items-center justify-between bg-surface supports-[backdrop-filter]:bg-surface">
                <div className="w-full">
                    <Steps currentStep={2} />
                </div>
            </ContentHeader>

            <Content className="flex-1 overflow-hidden p-0">
                <div className="flex flex-col h-full w-full overflow-hidden">
                    <div className="flex flex-1 w-full overflow-hidden">
                        {/* Left Section: Transaction */}
                        <div className="flex-1 flex flex-col p-4 overflow-hidden border-r bg-background/40">
                            <Card className="flex-1 overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-none">
                                <CardContent className="p-6 h-full overflow-y-auto bg-transparent flex flex-col gap-8">
                                    <header className="flex items-center gap-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => navigate(-1)}
                                            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={2}
                                                stroke="currentColor"
                                                className="w-5 h-5"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                            </svg>
                                        </Button>
                                        <div className="flex flex-col">
                                            <h2 className="text-md font-medium text-mono text-foreground hover:text-primary transition-colors cursor-default">
                                                Seleccione el Método de Pago
                                            </h2>
                                            <span className="text-xs font-normal text-secondary-foreground">
                                                Seleccione cómo va a procesar el pago para esta transacción.
                                            </span>
                                        </div>
                                    </header>

                                    {/* ── Métodos de pago ── */}
                                    <PaymentMethodSelector
                                        formaPago={formaPago}
                                        paymentMethod={paymentMethod}
                                        onSelect={handleSelectPaymentMethod}
                                        onAddPayment={handleAddPayment}
                                    />

                                    {/* Section Pagos aplicados */}
                                    {pagosAplicados.length === 0 ? (
                                        <div className="mt-4 flex flex-col items-center justify-center py-6 px-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-transparent text-center">
                                            <Banknote className="size-8 text-muted-foreground/30 mb-2" />
                                            <span className="text-sm font-bold text-muted-foreground cursor-default">
                                                Aún no se reciben pagos
                                            </span>
                                            <span className="text-xs font-medium text-muted-foreground/50 mt-1 cursor-default">
                                                Selecciona un método de pago y agrega el pago
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="mt-4 bg-surface-container-lowest dark:bg-zinc-900 rounded-xl border border-border p-4 shadow-sm">
                                            <label className="block text-sm font-bold text-muted-foreground mb-4 tracking-tight">Pagos Aplicados</label>

                                            <div className="space-y-2">
                                                {pagosAplicados.map(pago => (
                                                    <ItemPagos key={pago.ID} pago={pago} handleDeletePaymentItem={handleDeletePaymentItem} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Interactive Amount Input Section */}
                                    <div className="mt-4 w-full rounded-xl border p-6 bg-surface-container-lowest shadow-sm border-border">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                            <div>
                                                <label className="block text-sm font-bold text-muted-foreground mb-4 tracking-tight">Monto Recibido</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={moneyFormat(amountReceived) || ''}

                                                        className="w-full bg-slate-100 dark:bg-zinc-800/50 border-none rounded-xl py-6 pl-10 pr-6 text-4xl font-extrabold focus:ring-2 focus:ring-primary/20 dark:text-primary-foreground outline-none transition-all placeholder:text-muted-foreground/30"
                                                        placeholder={total.toFixed(2)}
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-4">
                                                    <Button variant="secondary" onClick={() => setAmountReceived(total.toFixed(2))} className="h-9 px-4 rounded-lg text-xs font-bold text-secondary-foreground">Exacto</Button>
                                                    <Button variant="secondary" onClick={() => setAmountReceived('500')} className="h-9 px-4 rounded-lg text-xs font-bold text-secondary-foreground">$500</Button>
                                                    <Button variant="secondary" onClick={() => setAmountReceived('1000')} className="h-9 px-4 rounded-lg text-xs font-bold text-secondary-foreground">$1,000</Button>
                                                    <Button variant="secondary" onClick={() => setAmountReceived('2000')} className="h-9 px-4 rounded-lg text-xs font-bold text-secondary-foreground">$2,000</Button>
                                                </div>
                                            </div>
                                            <div className="flex flex-col justify-center md:border-l border-border/60 md:pl-12 pt-6 md:pt-0 border-t md:border-t-0">
                                                <span className="text-sm font-bold text-muted-foreground mb-2 tracking-tight">
                                                    {(!amountReceived || isNaN(parseFloat(amountReceived)) || parseFloat(amountReceived) < total) ? 'Por Pagar' : 'Cambio a Entregar'}
                                                </span>
                                                <div className={`text-5xl font-extrabold tracking-tighter ${(!amountReceived || isNaN(parseFloat(amountReceived)) || parseFloat(amountReceived) < total) ? 'text-red-500 dark:text-red-500' : 'text-[#006e2a] dark:text-[#5cfd80]'}`}>
                                                    $ {amountReceived && !isNaN(parseFloat(amountReceived))
                                                        ? Math.abs(parseFloat(amountReceived) - total).toFixed(2)
                                                        : total.toFixed(2)}
                                                </div>
                                                <div className="flex items-center gap-2 mt-4 text-blue-600 dark:text-blue-400">
                                                    <Info className="size-4" />
                                                    <span className="text-xs font-medium">Cálculo basado en el total de la orden</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Context/Notes */}
                                    <div className="mt-auto p-5 bg-gradient-to-br from-slate-200 via-slate-50 to-slate-300 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 rounded-2xl shadow-sm border border-white/50 dark:border-zinc-700 flex items-start gap-3">
                                        <Info className="size-4 text-slate-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter mb-2">Nota de Sistema</p>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                {paymentMethod === 1 && "Asegúrese de verificar la autenticidad de los billetes de alta denominación antes de ingresarlos a la caja."}
                                                {paymentMethod === 2 && "Solicite al cliente que inserte o acerque su tarjeta a la terminal y espere la confirmación aprobada del banco."}
                                                {paymentMethod === 3 && "Antes de entregar la mercancía, valide en su portal bancario o mediante la referencia que los fondos fueron acreditados exitosamente."}
                                                {paymentMethod === null && "Seleccione un método de pago para continuar con el cobro de esta transacción."}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Sidebar: Services & Summary */}
                        <div className="w-[340px] flex flex-col bg-gradient-to-b from-white/50 to-blue-50/50 dark:from-zinc-950 dark:to-blue-900/20 shrink-0 border-l border-border/40 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* Resumen de cuenta */}
                                <ResumenCuenta subtotal={subtotal} descuento={descuento} total={total} countItems={cart.length} currentStep={2} />
                                {/* 3. Services List */}


                            </div>
                        </div>
                    </div>

                    {/* Full Width Secondary Actions Bar */}
                    <div className="bg-background  p-2 flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="flex-1 h-9 px-4 rounded-xl text-[11px] font-black uppercase gap-2 shadow-none border-border/60 hover:bg-muted transition-all active:scale-[0.98]"
                        >
                            <LayoutGrid className="size-4 text-primary" />
                            Abrir Cajón (F5)
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 h-9 px-4 rounded-xl text-[11px] font-black uppercase gap-2 shadow-none border-border/60 hover:bg-muted transition-all active:scale-[0.98]"
                        >
                            <History className="size-4 text-primary" />
                            Historial
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 h-9 px-4 rounded-xl text-[11px] font-black uppercase gap-2 shadow-none border-destructive/20 text-destructive hover:bg-destructive/5 transition-all active:scale-[0.98]"

                        >
                            <X className="size-4" />
                            Cancelar (ESC)
                        </Button>
                    </div>
                </div>
            </Content>

            <style jsx>{`
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
            `}</style>
        </div>
    );
}

// ── Nombres de métodos comunes para un POS (en minúsculas para comparar) ─────
const COMMON_METHOD_NAMES_LOWER = new Set([
    'efectivo',
    'transferencia electrónica de fondos',
    'tarjeta de crédito',
    'tarjeta de débito',
    'cheque nominativo',
    'tarjeta de servicios',
    // nombres cortos del fallback
    'tarjeta',
    'transferencia',
    'cheque',
]);

const isCommonMethod = (nombre) =>
    COMMON_METHOD_NAMES_LOWER.has((nombre || '').toLowerCase().trim());

const METHOD_ICONS_LOWER = {
    'efectivo':                            DollarSign,
    'tarjeta':                             CreditCard,
    'transferencia':                       ArrowRightLeft,
    'cheque':                              CheckCircle,
    'transferencia electrónica de fondos': ArrowRightLeft,
    'tarjeta de crédito':                  CreditCard,
    'tarjeta de débito':                   CreditCard,
    'cheque nominativo':                   CheckCircle,
    'tarjeta de servicios':                CreditCard,
};

const METHOD_COLORS_LOWER = {
    'efectivo':                            'from-emerald-500 to-emerald-700',
    'tarjeta':                             'from-blue-500 to-blue-700',
    'tarjeta de crédito':                  'from-blue-500 to-blue-700',
    'tarjeta de débito':                   'from-sky-500 to-sky-700',
    'transferencia':                       'from-violet-500 to-violet-700',
    'transferencia electrónica de fondos': 'from-violet-500 to-violet-700',
    'cheque':                              'from-amber-500 to-amber-700',
    'cheque nominativo':                   'from-amber-500 to-amber-700',
    'tarjeta de servicios':                'from-indigo-500 to-indigo-700',
};

const getMethodIcon   = (nombre) => METHOD_ICONS_LOWER[(nombre || '').toLowerCase().trim()]   ?? MoreHorizontal;
const getMethodColor  = (nombre) => METHOD_COLORS_LOWER[(nombre || '').toLowerCase().trim()]  ?? 'from-slate-500 to-slate-700';

/**
 * PaymentMethodSelector
 * Muestra métodos comunes de POS con tarjetas grandes y descriptivas.
 * Colapsa los métodos fiscales del SAT en un "Ver otros métodos".
 */
function PaymentMethodSelector({ formaPago, paymentMethod, onSelect, onAddPayment }) {
    const [showOthers, setShowOthers] = React.useState(false);

    const common = formaPago.filter(m => isCommonMethod(m.Nombre));
    const others  = formaPago.filter(m => !isCommonMethod(m.Nombre));

    return (
        <div className="space-y-4">
            {/* ── Métodos comunes (tarjetas grandes) ── */}
            {common.length > 0 ? (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                    {common.map(fp => (
                        <PaymentCard
                            key={fp.ID}
                            fp={fp}
                            isActive={paymentMethod === fp.ID}
                            onSelect={onSelect}
                            onAddPayment={onAddPayment}
                        />
                    ))}
                </div>
            ) : (
                // Fallback: mostrar todos si no hay coincidencias
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                    {formaPago.map(fp => (
                        <PaymentCard
                            key={fp.ID}
                            fp={fp}
                            isActive={paymentMethod === fp.ID}
                            onSelect={onSelect}
                            onAddPayment={onAddPayment}
                        />
                    ))}
                </div>
            )}

            {/* ── Otros métodos fiscales (colapsable) ── */}
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

/**
 * PaymentCard — tarjeta visual grande para métodos comunes del POS.
 * Abre el ModalFormaPago al hacer clic.
 */
function PaymentCard({ fp, isActive, onSelect, onAddPayment }) {
    const Icon     = getMethodIcon(fp.Nombre);
    const gradient = getMethodColor(fp.Nombre);

    // Nombre capitalizado para mostrar en la tarjeta
    const displayName = fp.Nombre
        ? fp.Nombre.charAt(0).toUpperCase() + fp.Nombre.slice(1).toLowerCase()
        : fp.Nombre;

    return (
        <ModalFormaPago
            formaPago={fp}
            isActive={isActive}
            onClick={onSelect}
            handleAddPayment={onAddPayment}
            renderTrigger={(triggerProps) => (
                <button
                    {...triggerProps}
                    className={`
                        relative w-full rounded-2xl p-5 text-left transition-all duration-200 overflow-hidden
                        border-2 group active:scale-[0.98]
                        ${isActive
                            ? 'border-primary shadow-lg shadow-primary/20 bg-primary/5 dark:bg-primary/10'
                            : 'border-border hover:border-primary/50 bg-white dark:bg-zinc-900 hover:shadow-md'
                        }
                    `}
                >
                    {/* Icono con gradiente */}
                    <div className={`
                        size-11 rounded-xl flex items-center justify-center mb-4
                        bg-gradient-to-br ${gradient} shadow-md
                        group-hover:scale-110 transition-transform duration-200
                    `}>
                        <Icon className="size-5 text-white" />
                    </div>

                    {/* Nombre capitalizado */}
                    <div className="font-bold text-sm text-foreground leading-tight mb-1">
                        {displayName}
                    </div>
                    <div className="text-xs text-muted-foreground leading-snug line-clamp-2">
                        {fp.Descripcion || 'Método de pago'}
                    </div>

                    {/* Punto activo */}
                    {isActive && (
                        <div className="absolute top-3 right-3 size-2.5 rounded-full bg-primary shadow-[0_0_6px_2px_rgba(var(--primary),0.4)]" />
                    )}

                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-white/5 to-transparent" />
                </button>
            )}
        />
    );
}


