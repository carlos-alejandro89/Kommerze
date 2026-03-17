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
    ScanBarcode
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

const services = [
    { id: 'telcel', name: 'Telcel', color: 'bg-blue-600', text: 'TEL' },
    { id: 'att', name: 'AT&T', color: 'bg-sky-400', text: 'ATT' },
    { id: 'movistar', name: 'Movistar', color: 'bg-red-600', text: 'MOV' },
    { id: 'altan', name: 'Altan', color: 'bg-orange-500', text: 'ALT' },
];

export default function POSPage() {
    const [cart, setCart] = React.useState(shoppingCart);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('')
    const [open, setOpen] = React.useState(false);
    const [productId, setProductId] = React.useState(null);
    const [itemSelected, setItemSelected] = React.useState({});


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

    const updateQuantity = (id, delta) => {
        setCart(prev => {
            const next = prev.map(item =>
                item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
            );
            localStorage.setItem('cart', JSON.stringify(next));
            return next;
        });
    };

    const removeItem = (id) => {
        setCart(prev => {
            const next = prev.filter(item => item.id !== id);
            localStorage.setItem('cart', JSON.stringify(next));
            return next;
        });
    };

    const clearCart = () => {
        setCart([]);
        localStorage.setItem('cart', JSON.stringify([]));
    };

    const handleProductResult = (result) => {
        if (!result || result.length === 0) return;

        const newItem = {
            id: result[0].Guid,
            sku: result[0].Codigo,
            name: result[0].Descripcion,
            category: result[0].category,
            price: result[0].PrecioVenta,
            quantity: 1,
            empaque: result[0].Empaque,
            discount: result[0].Descuento,
            image: 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg',
            caracteristicas: result[0].Caracteristicas,
            instruccionesUso: result[0].InstruccionesUso,
            informacionProducto: result[0].InformacionProducto,
        };

        setCart(prev => {
            const existingItemIndex = prev.findIndex(item => item.id === newItem.id);
            let next;
            if (existingItemIndex >= 0) {
                next = [...prev];
                next[existingItemIndex] = { ...next[existingItemIndex], quantity: next[existingItemIndex].quantity + 1 };
            } else {
                next = [...prev, newItem];
            }
            localStorage.setItem('cart', JSON.stringify(next));
            return next;
        });
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        const result = await ServiceConsultaProductos(searchQuery.toUpperCase());
        handleProductResult(result);
        setSearchQuery('');
    };

    const handleProductDetails = (productId) => {
        const item = cart.find(item => item.id === productId);
        setItemSelected(item);
        setOpen(true);
    };

    const handleAddToCart = ({ productId }) => {
        console.log(productId);
    };

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 600);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    React.useEffect(() => {
        if (!debouncedSearch) return;

        handleSearch();
    }, [debouncedSearch]);

    React.useEffect(() => {
        let rawBarcode = '';

        const handleGlobalKeyDown = (event) => {
            // Si es Enter, significa que el escáner terminó de leer
            if (event.key === 'Enter') {
                if (rawBarcode.length > 0) {
                    console.log("Código capturado:", rawBarcode);
                    ServiceConsultaProductos(rawBarcode).then(handleProductResult);
                    rawBarcode = ''; // Limpia para la siguiente lectura
                }
                return;
            }

            // Evitar capturar teclas de control como Shift, Alt, etc.
            if (event.key.length === 1) {
                rawBarcode += event.key;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);

        // Limpieza al desmontar el componente
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    return (

        <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-zinc-950/50 relative">
            <ContentHeader className="flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="w-full">
                    <Steps currentStep={0} />
                </div>
            </ContentHeader>

            <Content className="flex-1 overflow-hidden p-0">
                <div className="flex flex-col h-full w-full overflow-hidden">
                    <div className="flex flex-1 w-full overflow-hidden">
                        {/* Left Section: Cart Items */}
                        <div className="flex-1 flex flex-col p-4 overflow-hidden border-r bg-background/40">
                            <div className="flex items-center justify-between mb-4">
                                <div className="relative flex-1 group mr-2">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors flex items-center gap-2">
                                        <Search className="size-4" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder=" Buscar productos, SKU o categoría..."
                                        className="w-full h-10 pl-10 pr-24 rounded-xl border-none bg-slate-100 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 transition-all shadow-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors flex items-center gap-2">
                                        <ScanBarcode className="size-4 opacity-50" />
                                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                                        <Badge variant="secondary" className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded border-none">F2</Badge>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={clearCart} className="text-xs text-destructive hover:bg-destructive/10">
                                    <Trash2 className="size-3.5 mr-2" />
                                    Borrar
                                </Button>
                            </div>

                            <Card className="flex-1 overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-none">
                                <CardContent className="p-4 h-full overflow-y-auto bg-transparent">
                                    <ProductDetailsSheet
                                        open={open}
                                        onOpenChange={() => setOpen(false)}
                                        productId={productId}
                                        itemSelected={itemSelected}
                                        addToCart={handleAddToCart}
                                    />
                                    <div className="flex flex-col gap-3">
                                        {cart.length === 0 ? (
                                            <NoProducts />
                                        ) : (
                                            cart.map((item) => (
                                                <Card key={item.id} className="group border-slate-200 dark:border-white/5 hover:border-primary/30 transition-all shadow-none overflow-hidden bg-white dark:bg-zinc-950/50">
                                                    <CardContent className="flex items-center flex-wrap justify-between gap-4 p-3 pe-4">
                                                        {/* Left: Image and Info */}
                                                        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                                                            <div className="flex items-center justify-center bg-accent/20 dark:bg-accent/10 h-20 w-24 rounded-xl border border-border/50 overflow-hidden shrink-0 shadow-sm relative group-hover:scale-[1.02] transition-transform">
                                                                <img
                                                                    src={item.image}
                                                                    className="h-full w-full object-cover transition-transform duration-500"
                                                                    alt={item.name}
                                                                />
                                                            </div>

                                                            <div className="flex flex-col gap-1.5 flex-1 p-1">
                                                                <div className="flex items-center gap-2 flex-wrap">


                                                                    <p onClick={() => handleProductDetails(item.id)} className="text-sm text-link cursor-pointer font-bold text-foreground leading-tight tracking-tight">
                                                                        {item.name}
                                                                    </p>
                                                                    {item.discount && (
                                                                        <Badge variant="destructive" className="text-[9px] h-4.5 px-1.5 uppercase font-black tracking-wider">
                                                                            -{item.discount}%
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                                        SKU: <span className="text-[11px] font-mono text-foreground/80">{item.sku}</span>
                                                                    </span>
                                                                    <span className="h-3 w-px bg-border/60" />
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                        {item.category}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right: Quantity, Price, and Actions */}
                                                        <div className="flex items-center gap-6">
                                                            {/* Quantity Controls */}
                                                            <div className="flex items-center gap-2.5">
                                                                <Button
                                                                    size="icon"
                                                                    variant="secondary"
                                                                    className="size-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors border-none shadow-none"
                                                                    onClick={() => updateQuantity(item.id, -1)}
                                                                >
                                                                    <Minus className="size-3.5" />
                                                                </Button>
                                                                <span className="w-6 text-center text-sm font-bold tabular-nums">
                                                                    {item.quantity}
                                                                </span>
                                                                <Button
                                                                    size="icon"
                                                                    variant="secondary"
                                                                    className="size-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors border-none shadow-none"
                                                                    onClick={() => updateQuantity(item.id, 1)}
                                                                >
                                                                    <Plus className="size-3.5" />
                                                                </Button>
                                                            </div>

                                                            {/* Price Breakdown */}
                                                            <div className="flex flex-col items-end gap-1 min-w-[100px]">
                                                                <span className="text-[10px] font-bold text-muted-foreground/80 tabular-nums">
                                                                    ${item.price.toFixed(2)} c/u
                                                                </span>
                                                                <span className="text-sm font-black text-primary tabular-nums">
                                                                    ${(item.price * item.quantity).toFixed(2)}
                                                                </span>
                                                            </div>

                                                            {/* Delete Action */}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-9 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                                                onClick={() => removeItem(item.id)}
                                                            >
                                                                <Trash2 className="size-4.5" />
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
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
                                <ResumenCuenta subtotal={subtotal} descuento={descuento} total={total} countItems={cart.length} currentStep={0} />
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
