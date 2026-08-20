'use client';

import * as React from 'react';
import {
    Search,
    Trash2,
    ScanBarcode,
    PackageSearch,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Content } from '@/components/layout/content';
import { ContentHeader } from '@/components/layout/content-header';
import { cn } from '@/lib/utils';
import { Pattern as NoProducts } from './no-products';
import { ProductDetailsSheet } from './product-details-sheet';
import { Steps } from './steps';
import { ResumenCuenta } from './resumen';
import { SearchDropdown } from './components/SearchDropdown';
import { PromotionsCarousel } from './components/PromotionsCarousel';
import { useCartState } from './useCartState';
import { usePosService } from './usePosService';
import { QuantityControl } from '@/components/common/quantity-control';
import { TRANSACTION_TYPES } from './transaction-types';

// ── Constante de imagen placeholder ─────────────────────────────────────────
const PLACEHOLDER_IMG = 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg';

// ── Mapeo de ProductoDto a item del carrito ──────────────────────────────────
function mapProductoToCartItem(producto) {
    return {
        id: producto.Guid,
        sku: producto.Codigo,
        name: producto.Descripcion,
        category: producto.Categoria || '',
        price: producto.PrecioVenta,
        empaque: producto.Empaque,
        discount: producto.Descuento,
        fraccionable: producto.Fraccionable,
        productoBaseGuid: producto.ProductoBaseGuid,
        image: producto.ImgReferencia ? `${import.meta.env.VITE_CLOUD_API_URL}${producto.ImgReferencia}` : PLACEHOLDER_IMG,
        caracteristicas: producto.Caracteristicas,
        instruccionesUso: producto.InstruccionesUso,
        informacionProducto: producto.InformacionProducto,
    };
}

export default function POSPage() {
    const { cart, addItem, changeQuantity, updateQuantity, removeItem, clearCart, subtotal, descuento, total } = useCartState();
    const posService = usePosService();

    // ── Búsqueda ─────────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = React.useState('');
    const [suggestions, setSuggestions] = React.useState([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [activeSuggestion, setActiveSuggestion] = React.useState(-1);
    const searchInputRef = React.useRef(null);

    // ── Sheet de detalles ────────────────────────────────────────────────────
    const [open, setOpen] = React.useState(false);
    const [itemSelected, setItemSelected] = React.useState({});

    // ── Estado de flash por item ─────────────────────────────────────────────
    const [flashItemId, setFlashItemId] = React.useState(null);

    // ── Toast de confirmación ─────────────────────────────────────────────────
    const [toast, setToast] = React.useState(null);
    const toastTimerRef = React.useRef(null);

    const showToast = React.useCallback((message, type = 'success') => {
        clearTimeout(toastTimerRef.current);
        setToast({ message, type });
        toastTimerRef.current = setTimeout(() => setToast(null), 1800);
    }, []);

    // ── Inicialización ────────────────────────────────────────────────────────
    React.useEffect(() => {
        localStorage.removeItem('operationType');
        localStorage.setItem('operationTypeGuid', TRANSACTION_TYPES.VENTA.guid);
        // Auto-foco en el campo de búsqueda
        searchInputRef.current?.focus();
    }, []);

    // ── Agregar producto al carrito ───────────────────────────────────────────
    const addProductToCart = React.useCallback((producto) => {
        const item = mapProductoToCartItem(producto);
        const action = addItem(item);

        // Flash verde si el producto ya estaba en el carrito
        if (action === 'incremented') {
            setFlashItemId(item.id);
            setTimeout(() => setFlashItemId(null), 700);
        }

        showToast(`${item.sku || item.name} agregado`);

        // Limpiar búsqueda y recuperar foco
        setSearchQuery('');
        setSuggestions([]);
        setActiveSuggestion(-1);
        setShowSuggestions(false);
        setTimeout(() => searchInputRef.current?.focus(), 50);
    }, [addItem, showToast]);

    // ── Búsqueda con debounce 300ms → sugerencias ─────────────────────────────
    React.useEffect(() => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setSuggestions([]);
            setActiveSuggestion(-1);
            setShowSuggestions(false);
            return;
        }

        setShowSuggestions(true);
        setActiveSuggestion(-1);
        setIsSearching(true);

        const timer = setTimeout(async () => {
            try {
                const result = await posService.buscarProductos(searchQuery.toUpperCase());
                setSuggestions(result || []);
                setActiveSuggestion(-1);
            } catch {
                setSuggestions([]);
                setActiveSuggestion(-1);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ── Listener global de escáner de código de barras ────────────────────────
    // El escáner emite teclas rápidamente y termina con Enter.
    // Solo actúa cuando el campo de búsqueda NO está activo (para no interferir
    // con la escritura manual).
    React.useEffect(() => {
        let rawBarcode = '';
        let lastKeyTime = 0;
        const SCANNER_THRESHOLD_MS = 50; // El escáner teclea más rápido que un humano

        const handleGlobalKeyDown = (event) => {
            const now = Date.now();
            const isFastInput = now - lastKeyTime < SCANNER_THRESHOLD_MS;
            lastKeyTime = now;

            // Si el foco está en el input de búsqueda, deja que maneje su propio flujo
            if (document.activeElement === searchInputRef.current) return;

            if (event.key === 'Enter') {
                if (rawBarcode.length > 2) {
                    posService.buscarProductos(rawBarcode.toUpperCase())
                        .then(result => {
                            if (result && result.length > 0) {
                                addProductToCart(result[0]);
                            } else {
                                showToast(`Sin resultados para: ${rawBarcode}`, 'error');
                            }
                        })
                        .catch(() => showToast('Error al buscar producto', 'error'));
                }
                rawBarcode = '';
                return;
            }

            if (event.key.length === 1) {
                // Acumular solo si es entrada rápida (escáner) o si el buffer ya tiene algo
                if (isFastInput || rawBarcode.length > 0) {
                    rawBarcode += event.key;
                }
            }
        };

        // F2 → enfocar campo de búsqueda
        const handleShortcuts = (event) => {
            if (event.key === 'F2') {
                event.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        window.addEventListener('keydown', handleShortcuts);

        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
            window.removeEventListener('keydown', handleShortcuts);
        };
    }, [addProductToCart, showToast]);

    // ── Búsqueda manual con Enter en el input ────────────────────────────────
    const handleSearchKeyDown = async (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            setSearchQuery('');
            setSuggestions([]);
            setActiveSuggestion(-1);
            setShowSuggestions(false);
            return;
        }

        if (showSuggestions && suggestions.length > 0 && event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveSuggestion(current => current < suggestions.length - 1 ? current + 1 : 0);
            return;
        }

        if (showSuggestions && suggestions.length > 0 && event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveSuggestion(current => current > 0 ? current - 1 : suggestions.length - 1);
            return;
        }

        if (event.key === 'Enter' && searchQuery.trim().length >= 2) {
            event.preventDefault();
            // Usa el resultado seleccionado con flechas o el primero por defecto.
            if (suggestions.length > 0) {
                addProductToCart(suggestions[activeSuggestion >= 0 ? activeSuggestion : 0]);
            } else {
                setIsSearching(true);
                try {
                    const result = await posService.buscarProductos(searchQuery.toUpperCase());
                    if (result && result.length > 0) {
                        addProductToCart(result[0]);
                    } else {
                        showToast(`Sin resultados para: "${searchQuery}"`, 'error');
                        setShowSuggestions(true);
                    }
                } catch {
                    showToast('Error al buscar producto', 'error');
                } finally {
                    setIsSearching(false);
                }
            }
        }
    };

    // ── Detalles del producto ─────────────────────────────────────────────────
    const handleProductDetails = (productId) => {
        const item = cart.find(item => item.id === productId);
        if (item) {
            setItemSelected(item);
            setOpen(true);
        }
    };

    // handleAddToCart: agrega 1 unidad del producto seleccionado en el Sheet
    const handleAddToCart = ({ productId }) => {
        const item = cart.find(i => i.id === productId);
        if (item) {
            changeQuantity(item.id, 1);
            showToast(`${item.sku || item.name} +1`);
        }
        setOpen(false);
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    return (
        <div className="relative flex h-[calc(100vh-56px)] w-full flex-col overflow-hidden bg-[#f5f8fc] dark:bg-background">
            <div className="kommerze-gradient-bg pointer-events-none absolute inset-0" />
            <ContentHeader className="relative z-[var(--z-layer-base)] flex items-center justify-between bg-surface supports-[backdrop-filter]:bg-surface">
                <div className="w-full">
                    <Steps currentStep={0} />
                </div>
            </ContentHeader>

            <Content className="relative z-[var(--z-layer-base)] flex-1 overflow-hidden p-0">
                <div className="flex flex-col h-full w-full overflow-hidden">
                    <div className="flex flex-1 w-full overflow-hidden">

                        {/* ── Left: Lista de productos en el carrito ────────── */}
                        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/55 bg-white/22 dark:border-white/10 dark:bg-white/[0.025]">
                            {/* Barra de búsqueda */}
                            <div className="relative z-[var(--z-layer-dropdown)] mb-4 flex shrink-0 items-center justify-between px-4 pt-4">
                                <div className="group relative mr-2 flex flex-1 items-center rounded-2xl border border-[#dce7f6] bg-white/90 px-4 py-2 shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] backdrop-blur-xl transition-all focus-within:border-blue-300/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-white/[.065] dark:focus-within:border-blue-400/35 dark:focus-within:bg-white/[.085]">
                                    {/* Icono izquierdo */}
                                    <Search className="mr-3 size-4 shrink-0 text-[#6481ad] transition-colors group-focus-within:text-blue-600 dark:text-slate-400 dark:group-focus-within:text-blue-400" strokeWidth={2.25} />

                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        id="pos-search-input"
                                        placeholder="Buscar productos, SKU o código de barras..."
                                        className="h-7 w-full min-w-0 bg-transparent pr-20 text-sm font-medium text-[#1b3154] outline-none placeholder:text-[#7790b6] dark:text-slate-100 dark:placeholder:text-slate-500"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleSearchKeyDown}
                                        onFocus={() => {
                                            if (searchQuery.trim().length >= 2) setShowSuggestions(true);
                                        }}
                                        onBlur={() => {
                                            // Pequeño delay para permitir clic en sugerencias
                                            setTimeout(() => setShowSuggestions(false), 150);
                                        }}
                                        autoComplete="off"
                                    />

                                    {/* Iconos derecha */}
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors flex items-center gap-2">
                                        <ScanBarcode className="size-4 text-[#7890b2] dark:text-slate-500" strokeWidth={2.2} />
                                        <div className="mx-0.5 h-4 w-px bg-[#dce7f6] dark:bg-white/10" />
                                        <Badge
                                            variant="secondary"
                                            className="cursor-default rounded-lg border-0 bg-[#f4f7fc] px-2 py-1 text-[10px] font-semibold text-[#6b83a9] shadow-none dark:bg-white/10 dark:text-slate-400"
                                            title="Presiona F2 para enfocar la búsqueda"
                                        >
                                            F2
                                        </Badge>
                                    </div>

                                    {/* Dropdown de sugerencias */}
                                    {showSuggestions && (
                                        <SearchDropdown
                                            suggestions={suggestions}
                                            isLoading={isSearching}
                                            query={searchQuery}
                                            activeIndex={activeSuggestion}
                                            onActiveIndexChange={setActiveSuggestion}
                                            onSelect={(producto) => addProductToCart(producto)}
                                            onClose={() => setShowSuggestions(false)}
                                        />
                                    )}
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearCart}
                                    className="text-xs text-destructive hover:bg-destructive/10 shrink-0"
                                >
                                    <Trash2 className="size-3.5 mr-1.5" />
                                    Borrar
                                </Button>
                            </div>

                            {/* Lista del carrito */}
                            <Card className="relative z-[var(--z-layer-base)] mx-4 mb-4 flex-1 overflow-hidden border-zinc-200 shadow-none dark:border-zinc-800">
                                <CardContent className="p-4 h-full overflow-y-auto bg-transparent">
                                    <ProductDetailsSheet
                                        open={open}
                                        onOpenChange={() => setOpen(false)}
                                        itemSelected={itemSelected}
                                        addToCart={handleAddToCart}
                                    />

                                    <div className="flex flex-col gap-3">
                                        {cart.length === 0 ? (
                                            <NoProducts />
                                        ) : (
                                            cart.map((item) => (
                                                <CartItem
                                                    key={item.id}
                                                    item={item}
                                                    isFlashing={flashItemId === item.id}
                                                    onUpdateQuantity={updateQuantity}
                                                    onRemove={removeItem}
                                                    onDetails={handleProductDetails}
                                                />
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── Right Sidebar: Promociones ────────────────────── */}
                        <aside className="hidden w-[340px] shrink-0 overflow-hidden border-l border-border/40 bg-gradient-to-b from-white/55 to-blue-50/45 p-4 pb-44 dark:from-zinc-950 dark:to-blue-900/20 lg:flex">
                            <PromotionsCarousel />
                        </aside>
                    </div>
                </div>
            </Content>

            <div className="fixed bottom-6 right-4 z-[9999] w-[calc(100vw-2rem)] max-w-[308px] isolate lg:w-[308px]">
                <ResumenCuenta
                    subtotal={subtotal}
                    descuento={descuento}
                    total={total}
                    countItems={cart.length}
                    currentStep={0}
                />
            </div>

            {/* ── Toast de confirmación ──────────────────────────────────── */}
            {toast && (
                <div
                    className={cn(
                        'fixed bottom-6 left-1/2 z-[var(--z-layer-toast)] flex -translate-x-1/2 items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold border animate-in fade-in slide-in-from-bottom-2 duration-200',
                        toast.type === 'error'
                            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                            : 'bg-white dark:bg-zinc-900 border-border text-foreground'
                    )}
                >
                    {toast.type === 'error' ? (
                        <PackageSearch className="size-4 shrink-0 text-red-500" />
                    ) : (
                        <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    {toast.message}
                </div>
            )}

            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                @keyframes flashGreen {
                    0%, 100% { background-color: transparent; }
                    30%, 70% { background-color: rgba(16, 185, 129, 0.08); }
                }
                .cart-item-flash {
                    animation: flashGreen 0.7s ease;
                }
            `}</style>
        </div>
    );
}

// ── Componente CartItem extraído para mayor legibilidad ──────────────────────

function CartItem({ item, isFlashing, onUpdateQuantity, onRemove, onDetails }) {
    return (
        <Card
            className={cn(
                'group relative border-transparent hover:border-border/50 bg-white dark:bg-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md transition-all overflow-hidden rounded-2xl',
                isFlashing && 'cart-item-flash'
            )}
        >
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/50 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-3 flex flex-wrap items-center gap-4">

                {/* Imagen */}
                <div className="relative h-16 w-16 md:h-20 md:w-20 rounded-xl overflow-hidden shrink-0 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-800">
                    <img
                        src={item.image || PLACEHOLDER_IMG}
                        className="h-full w-full object-cover mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-500"
                        alt={item.name}
                        onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMG; }}
                    />
                    {item.discount > 0 && (
                        <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg z-[var(--z-layer-raised)]">
                            -{item.discount}%
                        </div>
                    )}
                </div>

                {/* Info central */}
                <div className="flex flex-col flex-1 min-w-[200px] py-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="text-[13px] font-bold font-mono truncate">
                            {item.sku}
                        </div>
                        {item.empaque && (
                            <span className="text-[9px] font-black text-white bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-700 dark:to-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase shadow-sm">
                                {item.empaque}
                            </span>
                        )}
                    </div>
                    <p
                        onClick={() => onDetails(item.id)}
                        className="text-sm text-foreground truncate cursor-pointer hover:text-primary transition-colors leading-tight"
                        title="Ver detalles del producto"
                    >
                        {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        {item.category && (
                            <Badge
                                variant="outline"
                                className="text-[9px] font-semibold px-1.5 py-0 rounded-md bg-slate-50 dark:bg-zinc-800 border-none text-slate-500 dark:text-slate-400 capitalize"
                            >
                                {item.category.toLowerCase()}
                            </Badge>
                        )}
                        <span className="text-[11px] font-semibold text-slate-400">
                            ${item.price.toFixed(2)} c/u
                        </span>
                    </div>
                </div>

                {/* Controles derecha */}
                <div className="flex flex-wrap items-center gap-4 shrink-0 md:pl-4 md:border-l border-slate-100 dark:border-zinc-800/50">

                    {/* Control de cantidad: botones +/- con input editable */}
                    <QuantityControl
                        value={item.quantity}
                        onChange={(quantity) => onUpdateQuantity(item.id, quantity)}
                    />

                    {/* Subtotal */}
                    <div className="flex flex-col items-end min-w-[80px]">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Subtotal</span>
                        <span className="text-base font-black text-foreground tabular-nums tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            ${(item.price * item.quantity).toFixed(2)}
                        </span>
                    </div>

                    {/* Eliminar */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(item.id)}
                        className="size-8 rounded-full text-slate-300 dark:text-slate-600 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar producto"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
