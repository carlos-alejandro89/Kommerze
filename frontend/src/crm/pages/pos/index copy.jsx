'use client';

import * as React from 'react';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    ShoppingCart,
    CreditCard,
    Smartphone,
    Monitor,
    Zap,
    LayoutGrid,
    ExternalLink,
    History,
    X,
    ChevronRight,
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

// Mock data for initial items
const initialCart = [
    {
        id: 1,
        sku: '75010321',
        name: 'Organic Whole Milk 1L',
        category: 'Dairy',
        price: 24.50,
        quantity: 2,
        discount: 10,
        image: 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg'
    },
    {
        id: 2,
        sku: '84123548',
        name: 'Whole Grain Bread 500g',
        category: 'Bakery',
        price: 38.00,
        quantity: 1,
        discount: 25,
        image: 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg'
    }
];

const services = [
    { id: 'telcel', name: 'Telcel', color: 'bg-blue-600', text: 'TEL' },
    { id: 'att', name: 'AT&T', color: 'bg-sky-400', text: 'ATT' },
    { id: 'movistar', name: 'Movistar', color: 'bg-red-600', text: 'MOV' },
    { id: 'altan', name: 'Altan', color: 'bg-orange-500', text: 'ALT' },
];

export default function POSPage() {
    const [cart, setCart] = React.useState(initialCart);
    const [searchQuery, setSearchQuery] = React.useState('');

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.16;
    const total = subtotal + tax;

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        ));
    };

    const removeItem = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const clearCart = () => {
        if (confirm('¿Está seguro de que desea limpiar la transacción actual?')) {
            setCart([]);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-zinc-950/50 relative">
            <ContentHeader className="flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">


                <div className="flex-1 max-w-xl relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors flex items-center gap-2">
                        <Search className="size-4" />

                    </div>
                    <input
                        type="text"
                        placeholder=" Buscar productos, SKU o categoría..."
                        className="w-full h-10 pl-20 pr-4 rounded-xl border-none bg-slate-100 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 transition-all shadow-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors flex items-center gap-2">

                        <ScanBarcode className="size-4 opacity-50" />
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                        <Badge variant="secondary" className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded border-none">F2</Badge>
                    </div>
                </div>


            </ContentHeader>

            <Content className="flex-1 overflow-hidden p-0">
                <div className="flex flex-col h-full w-full overflow-hidden">
                    <div className="flex flex-1 w-full overflow-hidden">
                        {/* Left Section: Cart Items */}
                        <div className="flex-1 flex flex-col p-4 overflow-hidden border-r bg-background/40">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">

                                </div>
                                <Button variant="ghost" size="sm" onClick={clearCart} className="text-xs text-destructive hover:bg-destructive/10">
                                    <Trash2 className="size-3.5 mr-2" />
                                    Borrar
                                </Button>
                            </div>

                            <Card className="flex-1 overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-none">
                                <CardContent className="p-4 h-full overflow-y-auto bg-transparent">
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
                                                                    <p className="text-sm font-bold text-foreground leading-tight tracking-tight">
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
                                        placeholder="Promo Code"
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
                                <div className="p-0">
                                    <div className="bg-gradient-to-br from-slate-200 via-slate-50 to-slate-300 p-5 space-y-4 rounded-2xl shadow-sm border border-white/50">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Resumen de Cuenta</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500 font-medium">Subtotal</span>
                                                <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500 font-medium">IVA (16%)</span>
                                                <span className="font-bold text-slate-900">${tax.toFixed(2)}</span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-900/10 flex justify-between items-baseline">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Total Neto</span>
                                                    <span className="text-2xl font-black tabular-nums tracking-tighter leading-none text-slate-950">${total.toFixed(2)}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{cart.length} Art.</span>
                                            </div>
                                        </div>


                                        <Button
                                            id="pay-button"
                                            className="w-full h-11 rounded-lg bg-slate-900 text-white hover:bg-slate-800 border-none font-black text-xs shadow-none flex items-center justify-between px-4 group relative overflow-hidden active:scale-[0.98] transition-all"
                                        >
                                            <div className="flex items-center gap-2 relative z-10 transition-transform group-hover:translate-x-1">
                                                <ExternalLink className="size-4" />
                                                <span>Procesar</span>
                                            </div>
                                            <ChevronRight className="size-4 relative z-10 opacity-70 group-hover:opacity-100 transition-opacity" />

                                            {/* Shimmer effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform pointer-events-none" />
                                        </Button>
                                    </div>
                                </div>

                                {/* 3. Services List */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="size-4 text-amber-500 fill-amber-500" />
                                        <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Recargas y Servicios</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {services.map(service => (
                                            <Button
                                                key={service.id}
                                                variant="outline"
                                                className="h-auto py-4 flex flex-col gap-2 bg-background hover:bg-muted/50 transition-all border-border/60 hover:border-primary shadow-none"
                                            >
                                                <div className={cn("size-12 rounded-xl flex items-center justify-center text-white font-black text-base shadow-none", service.color)}>
                                                    {service.text}
                                                </div>
                                                <span className="font-bold text-[11px]">{service.name}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
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
