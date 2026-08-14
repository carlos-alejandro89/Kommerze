import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Check, Image as ImageIcon, Package,
  Loader2, Store, Trash2, Trash, Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuantityControl } from '@/components/common/quantity-control';
import { DialogSucursales } from '@/features/pos/components/dialog-sucursales';
import { loadProductRequestItems, saveProductRequestItems, clearProductRequestItems } from '../request-storage';
import { usePosService } from '@/features/pos/usePosService';
import { TRANSACTION_TYPES } from '@/features/pos/transaction-types';
import { useActivation } from '@/providers/ActivationProvider';

const money = (value) => Number(value || 0).toLocaleString('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const itemKey = (product) => product.Guid || product.ProductoGuid || product.Codigo;
const TYPE_GUIDS = {
  baja: TRANSACTION_TYPES.BAJA_MERCANCIA.guid,
  transferencia: TRANSACTION_TYPES.TRASPASO.guid,
};

export function ProductRequestSummaryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const posService = usePosService();
  const { store } = useActivation();
  const [requestItems, setRequestItems] = useState(
    () => location.state?.requestItems ?? loadProductRequestItems(),
  );
  const [requestType, setRequestType] = useState('baja');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    posService.obtenerSucursales()
      .then(response => setBranches(response?.data || []))
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    saveProductRequestItems(requestItems);
  }, [requestItems]);

  const items = Object.values(requestItems);
  const totalUnits = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalValue = items.reduce(
    (sum, item) => sum + Number(item.product?.PrecioVenta || 0) * Number(item.quantity || 0),
    0,
  );

  const canContinue = items.length > 0 && (requestType === 'baja' || Boolean(selectedBranch));

  const updateQuantity = (product, quantity) => {
    const key = itemKey(product);
    setRequestItems(current => ({
      ...current,
      [key]: { ...current[key], quantity },
    }));
  };

  const removeItem = (product) => {
    const key = itemKey(product);
    setRequestItems(current => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const returnToCatalog = () => {
    navigate('/products', { state: { requestItems } });
  };

  const confirmRequest = async () => {
    if (!canContinue || submitting) return;
    const originBranchID = Number(store?.ID || store?.id || 0);
    if (!originBranchID) {
      toast.error('No se pudo identificar la sucursal de origen');
      return;
    }

    setSubmitting(true);
    try {
      const response = await posService.crearSolicitudProductos({
        tipoPedidoGuid: TYPE_GUIDS[requestType],
        productos: items.map(({ product, quantity }) => ({
          nivelGuid: itemKey(product),
          cantidad: Number(quantity),
        })),
        sucursalOrigenId: originBranchID,
        sucursalDestinoId: requestType === 'transferencia'
          ? Number(selectedBranch?.ID || selectedBranch?.id || 0)
          : null,
        comentarios: comments.trim(),
      });
      if (!response?.success) {
        throw new Error(response?.message || response?.errors?.join(', ') || 'No se pudo crear la solicitud');
      }

      const confirmation = {
        ...response.data,
        requestType,
        destinationBranch: selectedBranch,
        originBranch: store,
        itemCount: items.length,
        totalUnits,
        totalValue,
      };
      clearProductRequestItems();
      navigate('/products/request-confirmation', { replace: true, state: { confirmation } });
    } catch (error) {
      toast.error(String(error).replace(/^Error:\s*/, ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-5 lg:px-6 lg:pt-6">
        <div className="mx-auto max-w-[1500px]">
          <nav className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <button type="button" onClick={() => navigate('/home')} className="transition hover:text-primary">Home</button>
            <span>/</span>
            <button type="button" onClick={returnToCatalog} className="transition hover:text-primary">Productos</button>
            <span>/</span>
            <span className="text-foreground">Resumen de la solicitud</span>
          </nav>

          <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Package className="size-6" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">Resumen de la solicitud</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">Revisa los productos y selecciona el tipo de movimiento.</p>
              </div>
            </div>
            <button type="button" onClick={returnToCatalog} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-xs font-semibold text-foreground transition hover:bg-muted">
              <ArrowLeft className="size-4" />
              Volver al catálogo
            </button>
          </header>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,.75fr)]">
          <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center justify-between border-b border-[#e5edf8]/80 px-5 py-4 dark:border-white/10">
              <div>
                <h2 className="font-semibold text-foreground">Productos en la solicitud ({items.length})</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Ajusta cantidades o elimina productos antes de continuar.</p>
              </div>
              {items.length > 0 && (
                <button type="button" onClick={() => setRequestItems({})} className="flex items-center gap-1.5 text-xs font-semibold text-red-500 transition hover:text-red-600">
                  <Trash2 className="size-4" />
                  Vaciar solicitud
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <Package className="size-12 text-blue-300/60" strokeWidth={1.4} />
                <h3 className="mt-4 font-semibold text-foreground">La solicitud está vacía</h3>
                <p className="mt-1 text-sm text-muted-foreground">Regresa al catálogo para seleccionar productos.</p>
                <button type="button" onClick={returnToCatalog} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
                  Ir al catálogo
                </button>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(260px,1fr)_150px_110px_100px_130px_44px] gap-4 border-b border-border/60 bg-blue-50/25 px-5 py-3 text-[11px] font-semibold text-muted-foreground lg:grid">
                  <span>Producto</span>
                  <span className="text-center">Cantidad</span>
                  <span>Unidad</span>
                  <span className="text-center">Existencia</span>
                  <span className="text-right">Subtotal</span>
                  <span />
                </div>
                <div className="divide-y divide-border/60">
                  {items.map(({ product, quantity }) => {
                    const stock = Number(product.Existencia || 0);
                    const step = product.Fraccionable ? 0.01 : 1;
                    const imageUrl = product.ImgReferencia
                      ? `${import.meta.env.VITE_CLOUD_API_URL || ''}${product.ImgReferencia}`
                      : '';

                    return (
                      <div key={itemKey(product)} className="grid items-center gap-4 px-5 py-4 lg:grid-cols-[minmax(260px,1fr)_150px_110px_100px_130px_44px]">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-blue-50/45 dark:bg-blue-400/[.04]">
                            {imageUrl ? (
                              <img src={imageUrl} alt={product.Descripcion} className="h-full w-full object-contain p-1.5" />
                            ) : (
                              <ImageIcon className="size-7 text-blue-300/60" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-semibold text-foreground">{product.Descripcion}</p>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">{product.Codigo}</p>
                          </div>
                        </div>

                        <div className="flex justify-start lg:justify-center">
                          <QuantityControl
                            value={quantity}
                            min={step}
                            max={stock}
                            step={step}
                            onChange={next => updateQuantity(product, next)}
                          />
                        </div>
                        <p className="text-sm font-medium text-foreground">{product.Empaque || 'Unidad'}</p>
                        <p className="text-sm font-semibold tabular-nums text-foreground lg:text-center">{stock.toLocaleString('es-MX')}</p>
                        <p className="text-sm font-bold tabular-nums text-foreground lg:text-right">
                          ${money(Number(product.PrecioVenta || 0) * quantity)}
                        </p>
                        <button type="button" onClick={() => removeItem(product)} title="Eliminar producto" className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                          <Trash className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border/60 bg-blue-50/25 p-5 dark:bg-blue-400/[.025]">
                  <h3 className="text-sm font-semibold text-foreground">Resumen de la solicitud</h3>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <SummaryValue label="Total de productos" value={items.length} />
                    <SummaryValue label="Unidades totales" value={totalUnits.toLocaleString('es-MX')} />
                    <SummaryValue label="Valor total estimado" value={`$${money(totalValue)}`} highlight />
                  </div>
                </div>
              </>
            )}
          </section>

          <aside className="h-fit overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="border-b border-[#e5edf8]/80 px-5 py-4 dark:border-white/10">
              <h2 className="font-semibold text-foreground">Detalles de la solicitud</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Selecciona el movimiento que deseas realizar.</p>
            </div>
            <div className="space-y-3 p-5">
              <RequestTypeCard
                selected={requestType === 'baja'}
                icon={Trash2}
                title="Baja de mercancía"
                description="Registra la salida definitiva de productos del inventario."
                onClick={() => {
                  setRequestType('baja');
                  setSelectedBranch(null);
                }}
              />
              <RequestTypeCard
                selected={requestType === 'transferencia'}
                icon={Truck}
                title="Transferencia a sucursal"
                description="Envía los productos seleccionados a otra sucursal."
                onClick={() => setRequestType('transferencia')}
              />

              {requestType === 'transferencia' && (
                <div className="mt-4 rounded-2xl border border-blue-200/70 bg-blue-50/45 p-4 dark:border-blue-400/20 dark:bg-blue-400/[.045]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Sucursal destino</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {selectedBranch?.NombreSucursal || 'Sin seleccionar'}
                      </p>
                    </div>
                    <DialogSucursales
                      sucursales={branches}
                      handleSelectSucursal={setSelectedBranch}
                      triggerLabel={selectedBranch ? 'Cambiar sucursal' : 'Seleccionar sucursal'}
                    />
                  </div>
                  {selectedBranch && (
                    <div className="mt-3 flex items-center gap-2 border-t border-blue-200/60 pt-3 text-xs text-muted-foreground dark:border-blue-400/15">
                      <Store className="size-4 text-blue-500" />
                      Destino confirmado para la transferencia
                    </div>
                  )}
                </div>
              )}

              <label className="mt-5 block">
                <span className="text-xs font-semibold text-[#334a70] dark:text-slate-300">Comentarios</span>
                <textarea
                  value={comments}
                  onChange={event => setComments(event.target.value.slice(0, 500))}
                  rows={4}
                  placeholder="Agrega información adicional sobre la solicitud (opcional)"
                  className="mt-2 w-full resize-none rounded-2xl border border-[#dce7f6] bg-white/90 px-4 py-3 text-sm font-medium text-[#1b3154] shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] outline-none transition-all placeholder:text-[#7790b6] focus:border-blue-300/80 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/[.065] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400/35 dark:focus:bg-white/[.085]"
                />
                <span className="mt-1 block text-right text-[11px] tabular-nums text-muted-foreground">{comments.length} / 500</span>
              </label>
            </div>
          </aside>
        </div>
      </div>

      <footer className="shrink-0 border-t border-border/70 bg-background/90 px-5 py-3 backdrop-blur-xl lg:px-6">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <button type="button" onClick={returnToCatalog} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background px-4 text-xs font-semibold text-foreground transition hover:bg-muted">
            <ArrowLeft className="size-4" />
            Volver al catálogo
          </button>
          <button
            type="button"
            disabled={!canContinue || submitting}
            onClick={confirmRequest}
            className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {submitting ? 'Confirmando…' : 'Confirmar solicitud'}
          </button>
        </div>
      </footer>
    </div>
  );
}

function RequestTypeCard({ selected, icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all',
        selected
          ? 'border-blue-500/70 bg-blue-50/65 shadow-[0_12px_30px_-25px_rgba(8,118,249,.8)] ring-1 ring-blue-500/15 dark:bg-blue-400/[.07]'
          : 'border-border/70 bg-background/55 hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-blue-400/[.04]',
      )}
    >
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl', selected ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-300')}>
        <Icon className="size-6" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {selected && <Check className="size-4 text-blue-600 dark:text-blue-300" />}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function SummaryValue({ label, value, highlight = false }) {
  if (highlight) {
    return (
      <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br from-[#002366] to-[#001233] px-5 py-4 text-center text-white shadow-xl">
        <div className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-white opacity-[0.04] blur-xl" />
        <div className="pointer-events-none absolute -bottom-7 -left-6 size-20 rounded-full bg-blue-400 opacity-[0.08] blur-xl" />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/65">{label}</p>
          <p className="mt-2 text-3xl font-black leading-none tracking-tighter tabular-nums text-white drop-shadow-sm">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
