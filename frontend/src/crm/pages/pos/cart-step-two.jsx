'use client';

import * as React from 'react';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    ShoppingCart as IconShoppingCart,
    LayoutGrid,
    History,
    X,
    ScanBarcode,
    FileText,
    ArrowRightLeft,
    Package,
    Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardHeading, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Content } from '@/crm/layout/components/content';
import { ContentHeader } from '@/crm/layout/components/content-header';
import { cn } from '@/lib/utils';
import { Pattern as NoProducts } from './no-products';
import { ProductDetailsSheet } from './product-details-sheet';
import { Steps } from './steps';

import { ResumenCuenta } from './resumen';
import { ServiceConsultaProductos } from '../../../../wailsjs/go/main/App';
// Mock data for initial items
const shoppingCart = [

];


export default function POSPage() {
    const [cart, setCart] = React.useState(shoppingCart);
    const [open, setOpen] = React.useState(false);
    const [productId, setProductId] = React.useState(null);
    const [itemSelected, setItemSelected] = React.useState({});
    const [operationType, setOperationType] = React.useState('transferencia');


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
                                    <header>
                                        <h2 className="text-3xl font-extrabold text-primary mb-2">Seleccione el Tipo de Operación</h2>
                                        <p className="text-muted-foreground">Define cómo se procesará esta transacción en el sistema.</p>
                                    </header>

                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                        {/* Card: COTIZACIÓN */}
                                        <button
                                            onClick={() => setOperationType('cotizacion')}
                                            className={cn(
                                                "group flex flex-col items-start p-6 bg-card rounded-xl border-2 transition-all shadow-sm text-left hover:shadow-md",
                                                operationType === 'cotizacion' ? "border-primary outline-none ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-14 h-14 rounded-lg flex items-center justify-center mb-6 transition-colors",
                                                operationType === 'cotizacion' ? "bg-primary text-primary-foreground" : "bg-muted text-primary group-hover:bg-primary/20"
                                            )}>
                                                <FileText className="size-7" />
                                            </div>
                                            <h3 className="text-lg font-bold text-primary mb-2">COTIZACIÓN</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                Genera un presupuesto formal sin afectar el inventario actual.
                                            </p>
                                        </button>

                                        {/* Card: TRANSFERENCIA */}
                                        <button
                                            onClick={() => setOperationType('transferencia')}
                                            className={cn(
                                                "group flex flex-col items-start p-6 bg-card rounded-xl border-2 transition-all shadow-sm text-left hover:shadow-md",
                                                operationType === 'transferencia' ? "border-primary outline-none ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-14 h-14 rounded-lg flex items-center justify-center mb-6 transition-colors",
                                                operationType === 'transferencia' ? "bg-primary text-primary-foreground" : "bg-muted text-primary group-hover:bg-primary/20"
                                            )}>
                                                <ArrowRightLeft className="size-7" />
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <h3 className="text-lg font-bold text-primary">TRANSFERENCIA</h3>
                                                <Badge className="bg-green-100/80 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400 text-[10px] uppercase font-black tracking-wider px-1.5 py-0 border-none">
                                                    Recomendado
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                Envío de mercancía entre sucursales o depósitos internos.
                                            </p>
                                        </button>

                                        {/* Card: PEDIDO */}
                                        <button
                                            onClick={() => setOperationType('pedido')}
                                            className={cn(
                                                "group flex flex-col items-start p-6 bg-card rounded-xl border-2 transition-all shadow-sm text-left hover:shadow-md",
                                                operationType === 'pedido' ? "border-primary outline-none ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-14 h-14 rounded-lg flex items-center justify-center mb-6 transition-colors",
                                                operationType === 'pedido' ? "bg-primary text-primary-foreground" : "bg-muted text-primary group-hover:bg-primary/20"
                                            )}>
                                                <Package className="size-7" />
                                            </div>
                                            <h3 className="text-lg font-bold text-primary mb-2">PEDIDO</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                Reserva de productos para entrega posterior o retiro en tienda.
                                            </p>
                                        </button>
                                    </div>

                                    {/* Additional Context/Notes */}
                                    <div className="mt-auto p-5 bg-muted/50 rounded-lg flex items-start gap-4 border-l-4 border-primary shadow-sm">
                                        <Info className="size-5 text-primary mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-primary">Nota de Sistema</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {operationType === 'cotizacion' && "Las cotizaciones no reservan mercancía y tienen vigencia máxima de 15 días. Al aplicar una cotización, el cliente recibe un comprobante de precios validado para la fecha."}
                                                {operationType === 'transferencia' && "Las transferencias requieren la validación de stock en la sucursal de origen antes de proceder al siguiente paso."}
                                                {operationType === 'pedido' && "Los pedidos reservan el inventario al instante de apartarse y pueden requerir de al menos 50% de anticipo. Por favor revisar los acuerdos con el cliente."}
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
                                <ResumenCuenta subtotal={subtotal} descuento={descuento} total={total} countItems={cart.length} />
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
                            onClick={clearCart}
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
