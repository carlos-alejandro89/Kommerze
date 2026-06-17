'use client';

import * as React from 'react';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    LayoutGrid,
    History,
    X,
    ScanBarcode,
    PackageSearch,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Content } from '@/components/layout/content';
import { cn } from '@/lib/utils';
import { Pattern as NoProducts } from './no-products';
import { ProductDetailsSheet } from './product-details-sheet';
import { Steps } from './steps';
import { ResumenCuenta } from './resumen';
import { SearchDropdown } from './components/SearchDropdown';
import { useCartState } from './useCartState';
import { usePosService } from './usePosService';

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
        image: PLACEHOLDER_IMG,
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
        // Establecer operationType = 1 (Venta) siempre al iniciar el POS
        localStorage.setItem('operationType', JSON.stringify(1));
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
        setShowSuggestions(false);
        setTimeout(() => searchInputRef.current?.focus(), 50);
    }, [addItem, showToast]);

    // ── Búsqueda con debounce 300ms → sugerencias ─────────────────────────────
    React.useEffect(() => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setShowSuggestions(true);
        setIsSearching(true);

        const timer = setTimeout(async () => {
            try {
                const result = await posService.buscarProductos(searchQuery.toUpperCase());
                setSuggestions(result || []);
            } catch {
                setSuggestions([]);
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
            setSearchQuery('');
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        if (event.key === 'Enter' && searchQuery.trim().length >= 2) {
            event.preventDefault();
            // Usar el primer resultado si ya están cargados, si no buscar
            if (suggestions.length > 0) {
                addProductToCart(suggestions[0]);
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
        <div className="flex flex-col h-[calc(100vh-56px)] w-full bg-bg-subtle relative">
            <Content className="flex-1 overflow-hidden p-0">
                <div className="flex flex-col h-full w-full overflow-hidden">
                    <div className="flex flex-1 w-full overflow-hidden">

                        {/* ── Left: Lista de productos en el carrito ────────── */}
                        <div className="flex-1 flex flex-col overflow-hidden border-r bg-background/40">
                            {/* Steps — solo en la columna izquierda */}
                            <div className="shrink-0 border-b border-border bg-surface">
                                <Steps currentStep={0} />
                            </div>

                            {/* Barra de búsqueda */}
                            <div className="flex items-center justify-between mb-4 px-4 pt-4">
                                <div className="relative flex-1 group mr-2">
                                    {/* Icono izquierdo */}
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors flex items-center gap-2 z-10">
                                        <Search className="size-4" />
                                    </div>

                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        id="pos-search-input"
                                        placeholder="Buscar productos, SKU o código de barras..."
                                        className="w-full h-10 pl-10 pr-24 rounded-xl border-none bg-slate-100 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/50 transition-all shadow-none outline-none"
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
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors flex items-center gap-2 z-10">
                                        <ScanBarcode className="size-4 opacity-40" />
                                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded border-none cursor-default"
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
                            <Card className="flex-1 overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-none mx-4 mb-4">
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
                                                    onChangeQuantity={changeQuantity}
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

                        {/* ── Right Sidebar: Resumen ────────────────────────── */}
                        <div className="w-[340px] flex flex-col bg-gradient-to-b from-white/50 to-blue-50/50 dark:from-zinc-950 dark:to-blue-900/20 shrink-0 border-l border-border/40 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <ResumenCuenta
                                    subtotal={subtotal}
                                    descuento={descuento}
                                    total={total}
                                    countItems={cart.length}
                                    currentStep={0}
                                />

                                {/* Acciones rápidas */}
                                <div className="grid grid-cols-2 gap-2">
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
                            </div>
                        </div>
                    </div>
                </div>
            </Content>

            {/* ── Toast de confirmación ──────────────────────────────────── */}
            {toast && (
                <div
                    className={cn(
                        'fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold border animate-in fade-in slide-in-from-bottom-2 duration-200',
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

function CartItem({ item, isFlashing, onChangeQuantity, onUpdateQuantity, onRemove, onDetails }) {
    const [editingQty, setEditingQty] = React.useState(false);
    const [qtyInput, setQtyInput] = React.useState(String(item.quantity));
    const qtyInputRef = React.useRef(null);

    // Sincronizar el input cuando cambia la cantidad desde afuera
    React.useEffect(() => {
        if (!editingQty) setQtyInput(String(item.quantity));
    }, [item.quantity, editingQty]);

    const commitQty = () => {
        const val = parseInt(qtyInput, 10);
        if (!isNaN(val) && val > 0) {
            onUpdateQuantity(item.id, val);
        } else {
            setQtyInput(String(item.quantity)); // revert
        }
        setEditingQty(false);
    };

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
                        <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg z-10">
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
                    <div className="flex items-center h-9 bg-slate-50 dark:bg-zinc-800/50 rounded-full border border-slate-200/60 dark:border-zinc-700/50 p-1">
                        <button
                            onClick={() => onChangeQuantity(item.id, -1)}
                            className="size-7 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-zinc-700 hover:shadow-sm text-slate-600 dark:text-slate-300 transition-all font-medium"
                        >
                            <Minus className="size-3" />
                        </button>

                        {/* Cantidad editable directamente */}
                        {editingQty ? (
                            <input
                                ref={qtyInputRef}
                                type="number"
                                min="1"
                                value={qtyInput}
                                onChange={(e) => setQtyInput(e.target.value)}
                                onBlur={commitQty}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitQty();
                                    if (e.key === 'Escape') {
                                        setQtyInput(String(item.quantity));
                                        setEditingQty(false);
                                    }
                                }}
                                className="w-10 text-center text-xs font-bold tabular-nums bg-white dark:bg-zinc-700 rounded border border-primary/30 outline-none focus:ring-1 focus:ring-primary/50 px-1 py-0.5"
                                autoFocus
                            />
                        ) : (
                            <span
                                className="w-8 flex items-center justify-center text-xs font-bold tabular-nums cursor-pointer hover:text-primary transition-colors"
                                onClick={() => {
                                    setEditingQty(true);
                                    setQtyInput(String(item.quantity));
                                    setTimeout(() => qtyInputRef.current?.select(), 20);
                                }}
                                title="Clic para editar cantidad"
                            >
                                {item.quantity}
                            </span>
                        )}

                        <button
                            onClick={() => onChangeQuantity(item.id, 1)}
                            className="size-7 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-zinc-700 hover:shadow-sm text-slate-600 dark:text-slate-300 transition-all font-medium"
                        >
                            <Plus className="size-3" />
                        </button>
                    </div>

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
