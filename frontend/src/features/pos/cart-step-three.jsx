'use client';

import * as React from 'react';
import { Info, Banknote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Content } from '@/components/layout/content';
import { ContentHeader } from '@/components/layout/content-header';
import { Steps } from './steps';
import { ResumenCuenta } from './resumen';
import { ItemPagos } from './components/item-pagos';
import { PaymentMethodSelector } from './components/PaymentMethodSelector';
import { PinpadWaitingDialog } from './components/PinpadWaitingDialog';
import { PromotionsCarousel } from './components/PromotionsCarousel';
import { moneyFormat } from '@/lib/helpers';
import { usePosService } from './usePosService';
import { useActivation } from '@/providers/ActivationProvider';
import { toast } from 'sonner';
import { isCardPayment, pinpadConfigurada } from './components/payment-method-utils';
import { EventsOn } from '../../../wailsjs/runtime/runtime';
const shoppingCart = [];

const netPaySaleTransaction = (payload) => {
    const service = window?.go?.main?.App?.NetPaySaleTransaction;
    if (typeof service !== 'function') {
        throw new Error('El servicio de NetPay no está disponible. Ejecuta wails dev para regenerar bindings.');
    }
    return service(payload);
};

const getNetPayCardPaymentType = (data) => {
    const cardType = String(
        data?.cardType ??
        data?.CardType ??
        data?.raw?.card_type ??
        data?.raw?.cardType ??
        data?.raw?.CardType ??
        data?.Raw?.card_type ??
        data?.Raw?.cardType ??
        data?.Raw?.CardType ??
        ''
    ).trim().toUpperCase();

    if (cardType === 'C') {
        return { Clave: '04', Nombre: 'Tarjeta de crédito' };
    }

    if (cardType === 'D') {
        return { Clave: '28', Nombre: 'Tarjeta de débito' };
    }

    return {};
};

const getNetPayCardBrand = (data) => String(
    data?.cardTypeName ??
    data?.CardTypeName ??
    data?.raw?.cardTypeName ??
    data?.raw?.card_type_name ??
    data?.raw?.CardTypeName ??
    data?.Raw?.cardTypeName ??
    data?.Raw?.card_type_name ??
    data?.Raw?.CardTypeName ??
    ''
).trim();


export function CartStepThree() {
    const navigate = useNavigate();
    const posService = usePosService();
    const { store } = useActivation();
    const idUnicoRef = React.useRef(crypto.randomUUID());
    const pinpadPaymentRef = React.useRef(null);
    const pinpadCloseTimeoutRef = React.useRef(null);
    const [cart, setCart] = React.useState(shoppingCart);
    const [open, setOpen] = React.useState(false);
    //const [productId, setProductId] = React.useState(null);
    const [itemSelected, setItemSelected] = React.useState({});
    const [paymentMethod, setPaymentMethod] = React.useState(null);
    const [amountReceived, setAmountReceived] = React.useState(0);
    const [pinpadDialog, setPinpadDialog] = React.useState({
        open: false,
        amount: 0,
        status: 'waiting',
        message: '',
    });
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
        posService.obtenerFormasPago()
            .then(res => {
                // res.data es el array de formas de pago del catálogo SAT
                const data = res?.data || [];
                if (data.length > 0) {
                    setFormaPago(data);
                } else {
                    setFormaPago([]);
                    toast.warning('No hay formas de pago sincronizadas. Ejecuta la sincronización de catálogos.');
                }
            })
            .catch(() => {
                setFormaPago([]);
                toast.error('No se pudieron cargar las formas de pago sincronizadas.');
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
    const saldoPendiente = Math.max(total - totalPagos, 0);

    const handleProductDetails = (productId) => {
        const item = cart.find(item => item.id === productId);
        setItemSelected(item);
        setOpen(true);
    };

    const handleSelectPaymentMethod = (paymentMethod) => {
        setPaymentMethod(paymentMethod);
    }

    React.useEffect(() => {
        const unsub = EventsOn('netpay_payment_response', (data) => {
            const pendingPayment = pinpadPaymentRef.current;
            if (!pendingPayment) return;

            const paymentGuid = data?.paymentGuid ?? data?.PaymentGuid ?? data?.raw?.paymentGuid ?? data?.Raw?.paymentGuid;
            if (paymentGuid && paymentGuid !== idUnicoRef.current) return;

            const responseCode = String(data?.responseCode ?? data?.ResponseCode ?? '');
            const message = data?.message ?? data?.Message ?? 'Pago aprobado correctamente';
            const isApproved = responseCode === '00';

            pinpadPaymentRef.current = null;

            setPinpadDialog(current => ({
                ...current,
                open: true,
                status: isApproved ? 'success' : 'error',
                message: message || (isApproved ? 'Pago aprobado correctamente' : 'No fue posible aprobar el pago'),
            }));

            if (pinpadCloseTimeoutRef.current) {
                clearTimeout(pinpadCloseTimeoutRef.current);
            }

            pinpadCloseTimeoutRef.current = setTimeout(() => {
                setPinpadDialog(current => ({
                    ...current,
                    open: false,
                    status: 'waiting',
                    message: '',
                }));
                pinpadCloseTimeoutRef.current = null;
            }, isApproved ? 2200 : 3200);

            if (!isApproved) {
                idUnicoRef.current = crypto.randomUUID();
                return;
            }

            const cardPaymentType = getNetPayCardPaymentType(data);
            const cardBrand = getNetPayCardBrand(data);
            const pagoAutorizado = {
                ...pendingPayment,
                ...cardPaymentType,
                TipoTarjeta: cardPaymentType.Nombre || pendingPayment.Nombre,
                MarcaTarjeta: cardBrand,
                Referencia: cardPaymentType.Nombre || pendingPayment.Nombre,
                NetPay: data?.raw ?? data?.Raw ?? data,
            };

            setPagosAplicados(prev => {
                const pagoExists = prev.find(pago => pago.ID == pagoAutorizado.ID);
                if (pagoExists) {
                    return prev.map(pago => pago.ID == pagoAutorizado.ID ? pagoAutorizado : pago);
                }
                return [...prev, pagoAutorizado];
            });

            idUnicoRef.current = crypto.randomUUID();
        });

        return () => {
            if (typeof unsub === 'function') {
                unsub();
            }
            if (pinpadCloseTimeoutRef.current) {
                clearTimeout(pinpadCloseTimeoutRef.current);
            }
        };
    }, []);

    const buildNetPayPayload = (paymentInfo) => {
        const amount = Number(paymentInfo.Monto || 0);

        return {
            serialNumber: '',
            amount: amount.toFixed(2),
            storeId: '',
            folioNumber: String(localStorage.getItem('folio') || Date.now()),
            msi: '00',
            traceability: {
                paymentGuid: idUnicoRef.current,
                idSucursal: String(store?.ID || store?.Guid || store?.guid || 'N/A'),
            },
        };
    };

    const handleAddPayment = async (paymentInfo) => {
        if (pinpadConfigurada && isCardPayment(paymentInfo)) {
            try {
                const porPagar = total - totalPagos
                paymentInfo.Monto = Number(porPagar)
                if (!Number(porPagar || 0)) {
                    throw new Error('Ingresa un monto válido para procesar la tarjeta');
                }
                const result = await netPaySaleTransaction(buildNetPayPayload(paymentInfo));
                if (!result?.success) {
                    throw new Error(result?.message || result?.errors?.[0] || 'No fue posible procesar el pago con tarjeta');
                }
                pinpadPaymentRef.current = {
                    ...paymentInfo,
                    Referencia: 'Pago con tarjeta',
                    NetPaySolicitud: result.data,
                };
                setPinpadDialog({
                    open: true,
                    amount: porPagar,
                    status: 'waiting',
                    message: '',
                });
                toast.success('Comunicación establecida con la pinpad');
                return;
            } catch (error) {
                pinpadPaymentRef.current = null;
                setPinpadDialog(current => ({
                    ...current,
                    open: false,
                    status: 'waiting',
                    message: '',
                }));
                toast.error(error?.message || 'No fue posible procesar el pago con tarjeta');
                return;
            }
        }

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

        <div className="relative flex h-[calc(100vh-56px)] w-full flex-col overflow-hidden bg-[#f5f8fc] dark:bg-background">
            <div className="kommerze-gradient-bg pointer-events-none absolute inset-0" />
            <ContentHeader className="relative z-[var(--z-layer-base)] flex items-center justify-between bg-surface supports-[backdrop-filter]:bg-surface">
                <div className="w-full">
                    <Steps currentStep={2} />
                </div>
            </ContentHeader>

            <Content className="relative z-[var(--z-layer-base)] flex-1 overflow-hidden p-0">
                <div className="flex flex-col h-full w-full overflow-hidden">
                    <div className="flex flex-1 w-full overflow-hidden">
                        {/* Left Section: Transaction */}
                        <div className="flex-1 flex flex-col p-4 overflow-hidden border-r border-white/55 bg-white/22 dark:border-white/10 dark:bg-white/[0.025]">
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
                                        saldoPendiente={saldoPendiente}
                                    />

                                    {/* ── Pagos Aplicados + Monto Recibido en fila ── */}
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* COL IZQ: Monto Recibido */}
                                        <div className="rounded-xl border border-border bg-surface-container-lowest dark:bg-zinc-900 p-5 space-y-4">
                                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                Monto Recibido
                                            </label>

                                            {/* Input */}
                                            <input
                                                type="text"
                                                value={moneyFormat(amountReceived) || ''}
                                                onChange={e => setAmountReceived(e.target.value.replace(/[^0-9.]/g, ''))}
                                                className="w-full bg-slate-100 dark:bg-zinc-800/60 border-none rounded-xl py-4 px-4 text-3xl font-extrabold focus:ring-2 focus:ring-primary/20 dark:text-primary-foreground outline-none transition-all placeholder:text-muted-foreground/30"
                                                placeholder={total.toFixed(2)}
                                            />

                                            {/* Accesos rápidos */}
                                            <div className="flex flex-wrap gap-2">
                                                <Button variant="secondary" onClick={() => setAmountReceived(total.toFixed(2))} className="h-8 px-3 rounded-lg text-xs font-bold">Exacto</Button>
                                                <Button variant="secondary" onClick={() => setAmountReceived('500')} className="h-8 px-3 rounded-lg text-xs font-bold">$500</Button>
                                                <Button variant="secondary" onClick={() => setAmountReceived('1000')} className="h-8 px-3 rounded-lg text-xs font-bold">$1,000</Button>
                                                <Button variant="secondary" onClick={() => setAmountReceived('2000')} className="h-8 px-3 rounded-lg text-xs font-bold">$2,000</Button>
                                            </div>

                                            {/* Cambio / Por pagar */}
                                            <div className="pt-3 border-t border-border/60">
                                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                                    {(!amountReceived || isNaN(parseFloat(amountReceived)) || parseFloat(amountReceived) < total)
                                                        ? 'Por pagar'
                                                        : 'Cambio a entregar'}
                                                </p>
                                                <p className={`text-4xl font-extrabold tracking-tighter ${(!amountReceived || isNaN(parseFloat(amountReceived)) || parseFloat(amountReceived) < total)
                                                    ? 'text-red-500'
                                                    : 'text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                    ${amountReceived && !isNaN(parseFloat(amountReceived))
                                                        ? Math.abs(parseFloat(amountReceived) - total).toFixed(2)
                                                        : total.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* COL DER: Pagos Aplicados */}
                                        <div className="rounded-xl border border-border bg-surface-container-lowest dark:bg-zinc-900 p-5">
                                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                                Pagos Aplicados
                                            </label>

                                            {pagosAplicados.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-32 border border-dashed border-border rounded-lg text-center gap-1">
                                                    <Banknote className="size-6 text-muted-foreground/30" />
                                                    <span className="text-xs font-medium text-muted-foreground/60">Sin pagos aún</span>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {pagosAplicados.map(pago => (
                                                        <ItemPagos key={pago.ID} pago={pago} handleDeletePaymentItem={handleDeletePaymentItem} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Nota de Sistema */}
                                    {paymentMethod !== null && (
                                        <div className="mt-3 p-4 bg-slate-100/60 dark:bg-zinc-900/60 rounded-xl border border-border/50 flex items-start gap-2.5">
                                            <Info className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {paymentMethod === 1 && "Asegúrese de verificar la autenticidad de los billetes de alta denominación antes de ingresarlos a la caja."}
                                                {paymentMethod === 2 && "Solicite al cliente que inserte o acerque su tarjeta a la terminal y espere la confirmación aprobada del banco."}
                                                {paymentMethod === 3 && "Antes de entregar la mercancía, valide en su portal bancario que los fondos fueron acreditados exitosamente."}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                        </div>

                        {/* Right Sidebar: Promociones */}
                        <aside className="hidden w-[340px] shrink-0 overflow-hidden border-l border-border/40 bg-gradient-to-b from-white/55 to-blue-50/45 p-4 pb-44 dark:from-zinc-950 dark:to-blue-900/20 lg:flex">
                            <PromotionsCarousel />
                        </aside>
                    </div>
                </div>
            </Content>

            <div className="fixed bottom-6 right-4 z-[9999] w-[calc(100vw-2rem)] max-w-[308px] isolate lg:w-[308px]">
                <ResumenCuenta subtotal={subtotal} descuento={descuento} total={total} countItems={cart.length} currentStep={2} />
            </div>

            <PinpadWaitingDialog
                open={pinpadDialog.open}
                amount={pinpadDialog.amount}
                status={pinpadDialog.status}
                message={pinpadDialog.message}
                onOpenChange={(open) => setPinpadDialog(current => ({
                    ...current,
                    open,
                    status: open ? current.status : 'waiting',
                    message: open ? current.message : '',
                }))}
            />

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
