import { useEffect, useState } from 'react';
import { Barcode, Image as ImageIcon, ShoppingBasket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { QuantityControl } from '@/components/common/quantity-control';

const money = (value) => Number(value || 0).toLocaleString('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function ProductRequestModal({ product, open, initialQuantity = 1, onOpenChange, onAdd }) {
  const [quantity, setQuantity] = useState(1);

  const stock = Number(product?.Existencia || 0);
  const step = product?.Fraccionable ? 0.01 : 1;
  const unit = product?.Empaque || 'Unidad';

  useEffect(() => {
    if (open) {
      setQuantity(Math.min(Math.max(Number(initialQuantity) || step, step), stock || step));
    }
  }, [initialQuantity, open, product?.Guid, step, stock]);

  if (!product) return null;

  const updateQuantity = (next) => {
    const normalized = Math.min(stock, Math.max(step, Number(next) || step));
    setQuantity(Number(normalized.toFixed(product.Fraccionable ? 2 : 0)));
  };

  const imageUrl = product.ImgReferencia
    ? `${import.meta.env.VITE_CLOUD_API_URL || ''}${product.ImgReferencia}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-white/70 bg-background/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-4xl dark:border-white/10">
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <DialogTitle className="text-xl font-bold tracking-[-0.025em]">Agregar producto</DialogTitle>
          <DialogDescription>Selecciona la cantidad que deseas incluir en la solicitud.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-[260px_1fr]">
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-[#e2ebf7] bg-gradient-to-br from-blue-50/80 to-white dark:border-white/10 dark:from-blue-400/[.06] dark:to-white/[.02]">
            {imageUrl ? (
              <img src={imageUrl} alt={product.Descripcion} className="h-full max-h-72 w-full object-contain p-5" />
            ) : (
              <ImageIcon className="size-16 text-blue-300/70 dark:text-blue-400/30" strokeWidth={1.4} />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-300">
                {product.Linea || 'Sin línea'}
              </span>
              <span className="rounded-full bg-slate-500/10 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {product.Marca || 'Sin marca'}
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-bold leading-tight tracking-[-0.025em] text-foreground">
              {product.Descripcion}
            </h2>
            <p className="mt-2 font-mono text-sm text-muted-foreground">{product.Codigo}</p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-border/60 py-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Precio de venta</p>
                <p className="mt-1 text-xl font-bold text-foreground">${money(product.PrecioVenta)}</p>
              </div>
              <div className="border-l border-border/60 pl-4">
                <p className="text-xs font-medium text-muted-foreground">Existencia disponible</p>
                <p className={cn('mt-1 text-xl font-bold', stock > 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {stock.toLocaleString('es-MX')}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-blue-100/80 bg-blue-50/45 p-4 sm:grid-cols-2 dark:border-blue-400/15 dark:bg-blue-400/[.045]">
              <div>
                <p className="text-[11px] text-muted-foreground">Unidad de medida</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{unit}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Código de barras</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Barcode className="size-4 text-blue-500" />
                  {product.CodigoBarra || 'Sin código'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid items-end gap-5 rounded-2xl border border-border/60 bg-background/65 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-[#334a70] dark:text-slate-300">
                  Cantidad a solicitar
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <QuantityControl
                    value={quantity}
                    min={step}
                    max={stock}
                    step={step}
                    disabled={stock <= 0}
                    onChange={updateQuantity}
                    className="h-12 px-1.5 [&>button]:size-9 [&>button:nth-child(2)]:w-14 [&>button_svg]:size-4 [&>input]:w-14 [&>input]:text-sm"
                  />
                  <div className="rounded-full bg-blue-50/80 px-4 py-2 text-xs font-semibold uppercase text-blue-600 dark:bg-blue-400/[.08] dark:text-blue-300">
                    {unit}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Disponible: {stock.toLocaleString('es-MX')} {unit}</p>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-medium text-muted-foreground">Total solicitado</p>
                <p className="mt-1 text-3xl font-bold tracking-[-0.035em] text-blue-600 dark:text-blue-400">
                  ${money(Number(product.PrecioVenta || 0) * quantity)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {quantity.toLocaleString('es-MX')} × ${money(product.PrecioVenta)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4 sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-xl border border-border/70 bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={stock <= 0 || quantity <= 0}
            onClick={() => onAdd(product, quantity)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShoppingBasket className="size-4" />
            Agregar a la solicitud
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
