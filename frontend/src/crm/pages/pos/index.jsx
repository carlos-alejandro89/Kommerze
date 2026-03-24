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

        const operationType = localStorage.getItem('operationType')
        if (operationType) {
            localStorage.setItem('operationType', 1)
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
            fraccionable: result[0].Fraccionable,
            productoBaseGuid: result[0].ProductoBaseGuid,
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
                                                <Card key={item.id} className="group relative border-transparent hover:border-border/50 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md transition-all overflow-hidden rounded-2xl">
                                                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/50 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <CardContent className="p-3 flex flex-wrap items-center gap-4">
                                                        {/* Left: Image */}
                                                        <div className="relative h-16 w-16 md:h-20 md:w-20 rounded-xl overflow-hidden shrink-0 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-800">
                                                            <img
                                                                src={item.image}
                                                                className="h-full w-full object-cover mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-500"
                                                                alt={item.name}
                                                            />
                                                            {item.discount && (
                                                                <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg z-10">
                                                                    -{item.discount}%
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Center: Info */}
                                                        <div className="flex flex-col flex-1 min-w-[200px] py-1">
                                                            <div className="flex items-center gap-2 mb-1">

                                                                <div className="text-[13px] font-bold font-mono truncate">
                                                                    {item.sku}
                                                                </div>
                                                                <span className="text-[9px] font-black text-white bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-700 dark:to-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase shadow-sm">
                                                                    {item.empaque || 'PZA'}
                                                                </span>
                                                            </div>
                                                            <p
                                                                onClick={() => handleProductDetails(item.id)}
                                                                className="text-sm  text-foreground truncate cursor-pointer hover:text-primary transition-colors leading-tight"
                                                            >
                                                                {item.name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-2">

                                                                <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 rounded-md bg-slate-50 dark:bg-zinc-800 border-none text-slate-500 dark:text-slate-400 capitalize">
                                                                    {item.category?.toLowerCase()} Lijas
                                                                </Badge>
                                                                <span className="text-[11px] font-semibold text-slate-400">
                                                                    ${item.price.toFixed(2)} c/u
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Right: Controls & Price */}
                                                        <div className="flex flex-wrap items-center gap-4 shrink-0 md:pl-4 md:border-l border-slate-100 dark:border-zinc-800/50">
                                                            {/* Pill shaped quantity control */}
                                                            <div className="flex items-center h-9 bg-slate-50 dark:bg-zinc-800/50 rounded-full border border-slate-200/60 dark:border-zinc-700/50 p-1">
                                                                <button
                                                                    onClick={() => updateQuantity(item.id, -1)}
                                                                    className="size-7 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-zinc-700 hover:shadow-sm text-slate-600 dark:text-slate-300 transition-all font-medium"
                                                                >
                                                                    <Minus className="size-3" />
                                                                </button>
                                                                <span className="w-8 flex items-center justify-center text-xs font-bold tabular-nums">
                                                                    {item.quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => updateQuantity(item.id, 1)}
                                                                    className="size-7 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-zinc-700 hover:shadow-sm text-slate-600 dark:text-slate-300 transition-all font-medium"
                                                                >
                                                                    <Plus className="size-3" />
                                                                </button>
                                                            </div>

                                                            {/* Total Price */}
                                                            <div className="flex flex-col items-end min-w-[80px]">
                                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Subtotal</span>
                                                                <span className="text-base font-black text-foreground tabular-nums tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                                                                    ${(item.price * item.quantity).toFixed(2)}
                                                                </span>
                                                            </div>

                                                            {/* Delete button */}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeItem(item.id)}
                                                                className="size-8 rounded-full text-slate-300 dark:text-slate-600 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="size-4" />
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

                                {/* 3. POS Actions (Relocated) */}
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        className="h-10 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-zinc-900 border-slate-200 shadow-sm hover:shadow hover:text-primary transition-all flex items-center justify-center gap-2 w-full active:scale-95"
                                    >
                                        <LayoutGrid className="size-3.5" />
                                        <span>Abrir Cajón</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-10 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-zinc-900 border-slate-200 shadow-sm hover:shadow hover:text-primary transition-all flex items-center justify-center gap-2 w-full active:scale-95"
                                    >
                                        <History className="size-3.5" />
                                        <span>Historial</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="col-span-2 h-10 rounded-xl text-[11px] font-bold text-destructive bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border-transparent transition-all flex items-center justify-center gap-2 w-full active:scale-95"
                                        onClick={clearCart}
                                    >
                                        <X className="size-3.5" />
                                        <span>Cancelar Orden</span>
                                    </Button>
                                </div>

                                {/* 4. Services List */}
                            </div>
                        </div>
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
