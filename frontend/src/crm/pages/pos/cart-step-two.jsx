'use client';

import * as React from 'react';
import {
    ShoppingCart as IconShoppingCart,
    LayoutGrid,
    History,
    X,
    Info,
    Mail,
    Phone,
    Store
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Content } from '@/crm/layout/components/content';
import { ContentHeader } from '@/crm/layout/components/content-header';
import { cn } from '@/lib/utils';
import { Steps } from './steps';
import { DialogSucursales } from './components/dialog-sucursales';

import { ResumenCuenta } from './resumen';
import { BtnTipoPedido } from './components/btn-tipo-tipo-pedido';
import { ServiceObtenerTiposPedido, ServiceGetSucursales } from '../../../../wailsjs/go/main/App';
// Mock data for initial items
const shoppingCart = [

];


export function CartStepTwo() {
    const navigate = useNavigate();
    const [cart, setCart] = React.useState(shoppingCart);
    const [open, setOpen] = React.useState(false);
    const [itemSelected, setItemSelected] = React.useState({});
    const [operationType, setOperationType] = React.useState(1);
    const [tiposPedido, setTiposPedido] = React.useState([]);
    const [sucursales, setSucursales] = React.useState([]);
    const [sucursalSeleccionada, setSucursalSeleccionada] = React.useState(null);

    const ObtenerTiposPedido = async () => {
        try {
            const res = await ServiceObtenerTiposPedido();
            setTiposPedido(res || []);
        } catch (error) {
            console.error('Error al llamar a ServiceObtenerTiposPedido:', error);
        }
    }

    const ObtenerSucursales = async () => {
        try {
            const res = await ServiceGetSucursales();
            setSucursales(res.data || []);
        } catch (error) {
            console.error('Error al llamar a ServiceGetSucursales:', error);
        }
    }

    React.useEffect(() => {
        ObtenerTiposPedido();
        ObtenerSucursales();
        localStorage.setItem('operationType', JSON.stringify(operationType));
        
        const storedSucursal = localStorage.getItem('sucursal');
        if (storedSucursal) {
            try {
                setSucursalSeleccionada(JSON.parse(storedSucursal));
            } catch (e) {
                console.error("Error parsing stored sucursal", e);
            }
        }
    }, [])

    const handeSetOperationType = (operationType) => {
        setOperationType(operationType)
        localStorage.setItem('operationType', JSON.stringify(operationType))
    }

    const subtotal = cart.reduce((sum, item) => {
        const price = item.price;
        return sum + (price * item.quantity)
    }, 0);

    const descuento = cart.reduce((sum, item) => {
        const valDescuento = item.discount > 0 ? (item.price * item.discount / 100) : 0;
        return sum + (valDescuento * item.quantity)
    }, 0);


    const total = subtotal - descuento;

    React.useEffect(() => {
        const cartStorage = localStorage.getItem('cart')
        if (cartStorage) {
            setCart(JSON.parse(cartStorage))
        }
    }, [])

    const handleProductDetails = (productId) => {
        const item = cart.find(item => item.id === productId);
        setItemSelected(item);
        setOpen(true);
    };

    const handleSelectSucursal = (sucursal) => {
        setSucursalSeleccionada(sucursal);
        localStorage.setItem('sucursal', JSON.stringify(sucursal));
    }


    return (

        <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-zinc-950/50 relative">
            <ContentHeader className="flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="w-full">
                    <Steps currentStep={1} />
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
                                                Seleccione el Tipo de Operación
                                            </h2>
                                            <span className="text-xs font-normal text-secondary-foreground">
                                                Define cómo se procesará esta transacción en el sistema.
                                            </span>
                                        </div>
                                    </header>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {/* Card: PEDIDO */}
                                        {tiposPedido.map((tipoPedido) => (
                                            <BtnTipoPedido key={tipoPedido.ID} tipoPedido={tipoPedido} isActive={operationType === tipoPedido.ID} onClick={() => handeSetOperationType(tipoPedido.ID)} />
                                        ))}
                                    </div>

                                    {/* Quick Action: Público General o Sucursal Destino */}
                                    {operationType === 3 ? (
                                        <div className={cn("mt-4 w-full rounded-xl border p-4 flex flex-col md:flex-row md:items-start justify-between text-left transition-all", sucursalSeleccionada ? "bg-emerald-500/5 border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.2)] dark:bg-emerald-500/10 dark:border-emerald-500/20" : "border-dashed border-muted-foreground/30 bg-muted/10")}>
                                            <div className="flex items-start gap-4 w-full">
                                                <div className={cn("flex size-16 rounded-full mt-0.5 shrink-0 items-center justify-center shadow-sm transition-all", sucursalSeleccionada ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground border border-dashed border-muted-foreground/30")}>
                                                    <Store className="size-8 stroke-[1.5]" />
                                                </div>

                                                <div className="flex flex-col w-full">
                                                    <div className="flex items-start justify-between w-full mb-1">
                                                        <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Sucursal Destino</span>
                                                        <DialogSucursales sucursales={sucursales} handleSelectSucursal={handleSelectSucursal} />
                                                    </div>

                                                    {sucursalSeleccionada ? (
                                                        <>
                                                            <h4 className="font-semibold text-sm mb-1 text-foreground leading-none">{sucursalSeleccionada.NombreSucursal}</h4>

                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1 mb-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Mail className="size-3.5 opacity-70" />
                                                                    <span>{sucursalSeleccionada.Correo === "<nil>" || !sucursalSeleccionada.Correo ? "Sin correo" : sucursalSeleccionada.Correo}</span>
                                                                </div>
                                                                <div className="hidden sm:block w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                                <div className="flex items-center gap-1.5">
                                                                    <Phone className="size-3.5 opacity-70" />
                                                                    <span>{sucursalSeleccionada.Telefono || "Sin teléfono"}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground leading-tight">
                                                                {[
                                                                    sucursalSeleccionada.Calle, 
                                                                    sucursalSeleccionada.Exterior ? "#" + sucursalSeleccionada.Exterior : "", 
                                                                    sucursalSeleccionada.Colonia ? "Col. " + sucursalSeleccionada.Colonia : "", 
                                                                    sucursalSeleccionada.Ciudad, 
                                                                    sucursalSeleccionada.Estado
                                                                ].filter(Boolean).join(", ")}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center h-full text-sm text-emerald-600/70 dark:text-emerald-400/70 font-medium py-3">
                                                            Seleccione una sucursal destino para continuar...
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 w-full rounded-xl border p-4 flex flex-col md:flex-row md:items-start justify-between text-left transition-all bg-primary/5 border-primary shadow-[0_0_0_1px_rgba(var(--primary),0.2)] dark:bg-primary/10 dark:border-primary/20">
                                            <div className="flex items-start gap-4 w-full">
                                                <Avatar className="size-16 rounded-xl mt-0.5 shrink-0 bg-transparent">
                                                    <AvatarImage src={toAbsoluteUrl('/media/avatars/300-2.png')} alt="avatar" className="object-cover bg-transparent" />
                                                    <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-xl font-bold">CM</AvatarFallback>
                                                </Avatar>

                                                <div className="flex flex-col w-full">
                                                    <div className="flex items-start justify-between w-full mb-1">
                                                        <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Cliente Actual</span>
                                                        <Button
                                                            variant="link"
                                                            className="h-auto p-0 text-[10px] font-bold uppercase text-primary hover:text-primary/80 shrink-0"
                                                        >
                                                            Cambiar cliente
                                                        </Button>
                                                    </div>

                                                    <h4 className="font-semibold text-sm mb-1 text-foreground leading-none">CLIENTE MOSTRADOR</h4>

                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1 mb-1.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <Mail className="size-3.5 opacity-70" />
                                                            <span>no-reply@propos.com</span>
                                                        </div>
                                                        <div className="hidden sm:block w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                        <div className="flex items-center gap-1.5">
                                                            <Phone className="size-3.5 opacity-70" />
                                                            <span>+502 0000-0000</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground leading-tight">
                                                        Venta al público general sin datos fiscales específicos.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Additional Context/Notes */}
                                    <div className="mt-auto p-5 bg-gradient-to-br from-slate-200 via-slate-50 to-slate-300 rounded-2xl shadow-sm border border-white/50 flex items-start gap-3">
                                        <Info className="size-4 text-slate-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter mb-2">Nota de Sistema</p>
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                {operationType === 1 && "Las ventas reservan el inventario al instante de la venta."}
                                                {operationType === 2 && "Las cotizaciones no reservan mercancía y tienen vigencia máxima de 15 días. Al aplicar una cotización, el cliente recibe un comprobante de precios validado para la fecha."}
                                                {operationType === 3 && "Las transferencias requieren la validación de stock en la sucursal de origen antes de proceder al siguiente paso."}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Sidebar: Services & Summary */}
                        <div className="w-[340px] flex flex-col bg-gradient-to-b from-white/50 to-blue-50/50 dark:from-zinc-950 dark:to-blue-900/20 shrink-0 border-l border-border/40 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* 1. Promo Code Section */}
                                <div className="relative group">
                                    <Input
                                        type="text"
                                        placeholder="Código de Descuento"
                                        className="w-full h-10 pl-10 pr-16 rounded-xl "
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-3 text-[10px] font-bold uppercase text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        >
                                            Aplicar
                                        </Button>
                                    </div>
                                </div>

                                {/* 2. Bottom Summary Section */}
                                <ResumenCuenta subtotal={subtotal} descuento={descuento} total={total} countItems={cart.length} currentStep={1} />
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
