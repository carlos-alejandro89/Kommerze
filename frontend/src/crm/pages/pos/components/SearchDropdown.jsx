import { Loader2, PackageSearch, Package } from 'lucide-react';
import { moneyFormat } from '@/lib/helpers';
import { cn } from '@/lib/utils';

const PLACEHOLDER_IMG = 'https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg';

/**
 * Devuelve clases de color de semáforo según la existencia disponible.
 *  🔴 Sin stock  (0)
 *  🟡 Poco stock (1–5)
 *  🟢 Disponible (> 5)
 */
function stockColor(existencia) {
    const qty = parseFloat(existencia) || 0;
    if (qty <= 0) return 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
    if (qty <= 5) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
    return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
}

function stockLabel(existencia) {
    const qty = parseFloat(existencia) || 0;
    if (qty <= 0) return 'Sin stock';
    return qty % 1 === 0 ? String(qty) : qty.toFixed(2);
}

/**
 * SearchDropdown — lista de sugerencias de productos debajo del campo de
 * búsqueda. Muestra imagen, SKU, descripción, precio, descuento y existencia.
 *
 * Props:
 *  - suggestions : ProductoDto[]
 *  - isLoading   : boolean
 *  - query       : string (texto buscado, para highlight)
 *  - onSelect    : (producto) => void
 *  - onClose     : () => void
 */
export function SearchDropdown({ suggestions, isLoading, query, onSelect, onClose }) {
    if (!query || query.trim().length < 2) return null;

    return (
        <div
            className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
            onMouseDown={(e) => e.preventDefault()} // evita pérdida de foco al hacer clic
        >
            {isLoading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin shrink-0" />
                    <span>Buscando productos...</span>
                </div>

            ) : suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 px-4 py-5 text-center">
                    <PackageSearch className="size-7 text-muted-foreground/40 mb-1" />
                    <span className="text-sm font-medium text-muted-foreground">Sin resultados</span>
                    <span className="text-xs text-muted-foreground/60">
                        No se encontró "{query}"
                    </span>
                </div>

            ) : (
                <ul className="max-h-[360px] overflow-y-auto divide-y divide-border/50 py-1">
                    {suggestions.map((product, index) => {
                        const sinStock = (parseFloat(product.Existencia) || 0) <= 0;

                        return (
                            <li key={product.Guid}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(product)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left group',
                                        sinStock
                                            ? 'hover:bg-red-50/50 dark:hover:bg-red-950/20 opacity-75'
                                            : 'hover:bg-slate-50 dark:hover:bg-zinc-800'
                                    )}
                                >
                                    {/* ── Imagen ── */}
                                    <div className="size-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-zinc-800 border border-border/40">
                                        <img
                                            src={PLACEHOLDER_IMG}
                                            alt={product.Descripcion}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.style.opacity = 0; }}
                                        />
                                    </div>

                                    {/* ── Info central ── */}
                                    <div className="flex flex-col flex-1 min-w-0">
                                        {/* Fila superior: SKU + badges */}
                                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                            <span className="text-[11px] font-mono font-bold text-muted-foreground">
                                                {product.Codigo}
                                            </span>
                                            {product.Empaque && (
                                                <span className="text-[9px] font-black bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400 px-1 py-0.5 rounded uppercase">
                                                    {product.Empaque}
                                                </span>
                                            )}
                                            {product.Fraccionable && (
                                                <span className="text-[9px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded uppercase">
                                                    Frac.
                                                </span>
                                            )}
                                        </div>
                                        {/* Descripción con highlight */}
                                        <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                            {highlightMatch(product.Descripcion, query)}
                                        </span>
                                    </div>

                                    {/* ── Columna derecha: precio + existencia ── */}
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        {/* Precio */}
                                        <span className="text-sm font-black text-foreground tabular-nums leading-none">
                                            {moneyFormat(product.PrecioVenta)}
                                        </span>
                                        {product.Descuento > 0 && (
                                            <span className="text-[9px] font-bold text-destructive leading-none">
                                                -{product.Descuento}% desc.
                                            </span>
                                        )}

                                        {/* Existencia — semáforo */}
                                        <span
                                            className={cn(
                                                'flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border leading-none mt-0.5',
                                                stockColor(product.Existencia)
                                            )}
                                            title={`Existencia: ${stockLabel(product.Existencia)} ${product.Empaque || ''}`}
                                        >
                                            <Package className="size-2.5 shrink-0" />
                                            {stockLabel(product.Existencia)}
                                        </span>
                                    </div>

                                    {/* Indicador "primer resultado = Enter" */}
                                    {index === 0 && (
                                        <span className="shrink-0 self-center text-[9px] font-black uppercase text-muted-foreground/50 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-border/50">
                                            Enter
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resalta la parte del texto que coincide con la búsqueda.
 */
function highlightMatch(text, query) {
    if (!text || !query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part)
            ? <mark key={i} className="bg-primary/15 text-primary font-bold rounded-sm px-0.5 not-italic">{part}</mark>
            : part
    );
}
