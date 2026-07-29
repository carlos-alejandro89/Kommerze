import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Package,
  Percent,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { usePosService } from '@/features/pos/usePosService';

const authorizationStyles = {
  solicitada: {
    label: 'Esperando autorización',
    className: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  autorizada: {
    label: 'Descuento autorizado',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  rechazada: {
    label: 'Descuento rechazado',
    className: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400',
  },
};

function formatMXN(value) {
  return `$${Number(value || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return { date: '—', time: '' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: String(value), time: '' };
  return {
    date: parsed.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    time: parsed.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function ModalVerTransaccion({ row, onClose }) {
  const { obtenerDetalleCotizacion } = usePosService();
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setDetalle(null);

    obtenerDetalleCotizacion(row.ID)
      .then(result => {
        if (!cancelled) setDetalle(result);
      })
      .catch(err => {
        if (!cancelled) setError(err?.message || String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [row.ID]);

  const items = detalle?.Items ?? [];
  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0),
    [items],
  );
  const date = formatDate(detalle?.Fecha || row.Fecha);
  const auth = authorizationStyles[detalle?.EstatusAutorizacion];
  const typeLabel = row.TipoOperacion || 'Transacción';
  const folio = String(row.Folio ?? '').padStart(4, '0');

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="max-h-[min(880px,calc(100vh-36px))] w-[calc(100vw-36px)] max-w-[1020px] gap-0 overflow-hidden border-white/80 bg-background/95 p-0 shadow-[0_28px_90px_-35px_rgba(15,39,82,.5)] backdrop-blur-xl sm:rounded-3xl dark:border-white/10"
        showCloseButton
      >
        <DialogHeader className="relative mb-0 overflow-hidden border-b border-border/65 bg-gradient-to-br from-blue-500/[.10] via-background to-cyan-500/[.06] px-6 py-5 pr-14 text-left">
          <div className="pointer-events-none absolute -right-12 -top-20 size-52 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_-14px_rgba(15,95,230,.8)]">
              <ReceiptText className="size-6" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <DialogTitle className="text-xl font-bold tracking-[-0.025em]">
                  Detalle de {typeLabel.toLowerCase()}
                </DialogTitle>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
                  {row.Estatus || 'Registrada'}
                </span>
              </div>
              <DialogDescription className="flex flex-wrap items-center gap-x-2 text-xs">
                <span className="font-mono font-bold text-foreground">Folio #{folio}</span>
                <span aria-hidden="true">•</span>
                <span>Información y artículos registrados en la operación</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-muted/[.12] to-background p-5 sm:p-6">
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <AlertCircle className="size-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">No fue posible cargar el detalle</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          <section className="border-b border-border/65 pb-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Información general</h3>
              <span className="text-[11px] text-muted-foreground">
                {items.length} producto{items.length === 1 ? '' : 's'} · {totalUnits} unidad{totalUnits === 1 ? '' : 'es'}
              </span>
            </div>
            <dl className="grid gap-x-10 gap-y-3 text-sm sm:grid-cols-2">
              <div className="grid grid-cols-[105px_minmax(0,1fr)] items-baseline gap-3">
                <dt className="text-xs text-muted-foreground">Folio</dt>
                <dd className="font-mono text-xs font-bold text-foreground">#{folio}</dd>
              </div>
              <div className="grid grid-cols-[105px_minmax(0,1fr)] items-baseline gap-3">
                <dt className="text-xs text-muted-foreground">Fecha</dt>
                <dd className="text-xs font-medium text-foreground">{date.date}{date.time ? `, ${date.time}` : ''}</dd>
              </div>
              <div className="grid grid-cols-[105px_minmax(0,1fr)] items-baseline gap-3">
                <dt className="text-xs text-muted-foreground">Cliente</dt>
                <dd className="truncate text-xs font-semibold text-foreground">{detalle?.RazonSocial || row.RazonSocial || 'Público General'}</dd>
              </div>
              <div className="grid grid-cols-[105px_minmax(0,1fr)] items-baseline gap-3">
                <dt className="text-xs text-muted-foreground">Operación</dt>
                <dd className="text-xs font-medium text-foreground">{typeLabel}</dd>
              </div>
            </dl>
          </section>

          {auth && (
            <div className={cn('mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5', auth.className)}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4.5 shrink-0" />
                <p className="text-xs font-bold">{auth.label}</p>
              </div>
              {(detalle?.AutorizadoPor || detalle?.ObsAutorizacion) && (
                <p className="text-[11px]">
                  {detalle.AutorizadoPor && <><span className="font-semibold">Autorizó:</span> {detalle.AutorizadoPor}</>}
                  {detalle.AutorizadoPor && detalle.ObsAutorizacion && <span> · </span>}
                  {detalle.ObsAutorizacion}
                </p>
              )}
            </div>
          )}

          <section className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-4 px-0.5">
              <div>
                <h3 className="text-sm font-bold tracking-[-0.01em] text-foreground">Productos de la operación</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Detalle de cantidades, precios de venta y descuentos aplicados.</p>
              </div>
              <p className="shrink-0 text-[11px] font-medium text-muted-foreground">
                {items.length} registro{items.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/65 bg-background/75 shadow-[0_14px_35px_-30px_rgba(20,54,110,.55)]">
              {loading ? (
                <div className="flex min-h-48 items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                    <p className="mt-2 text-xs text-muted-foreground">Cargando productos…</p>
                  </div>
                </div>
              ) : (
                <div className="max-h-[330px] overflow-auto">
                  <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-border/65 bg-slate-50/95 backdrop-blur dark:bg-slate-900/95">
                      {['Producto', 'Cantidad', 'Precio de venta', 'Descuento', 'Importe'].map((label, index) => (
                        <th
                          key={label}
                          className={cn(
                            'px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground',
                            index === 0 ? 'text-left' : 'text-right',
                          )}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                          No hay productos en esta operación.
                        </td>
                      </tr>
                    )}
                    {items.map((item, index) => {
                      const requested = detalle?.DescuentosSolicitados?.find(discount => discount.nivelGuid === item.nivelGuid);
                      const authorized = detalle?.DescuentosAutorizados?.find(discount => discount.nivelGuid === item.nivelGuid);
                      const discountValue = Number(item.descuento || 0);

                      return (
                        <tr key={`${item.nivelGuid}-${index}`} className="transition-colors hover:bg-blue-50/40 dark:hover:bg-white/[.035]">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/10 bg-blue-500/[.07] text-blue-600 dark:text-blue-400">
                                <Package className="size-4.5" strokeWidth={1.7} />
                              </span>
                              <div className="min-w-0">
                                <p className="max-w-[320px] truncate text-xs font-semibold text-foreground">{item.producto || item.nivelCodigo || 'Producto'}</p>
                                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{item.nivelCodigo || 'Sin código'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right text-xs font-semibold tabular-nums">{Number(item.cantidad || 0)}</td>
                          <td className="px-4 py-3.5 text-right text-xs tabular-nums">{formatMXN(item.precioVenta)}</td>
                          <td className="px-4 py-3.5 text-right">
                            {discountValue > 0 || requested ? (
                              <div className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <Percent className="size-3" />
                                {authorized?.descuentoAutorizado ?? requested?.descuentoSolicitado ?? formatMXN(discountValue)}
                                {(authorized || requested) && '%'}
                              </div>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3.5 text-right text-xs font-bold tabular-nums text-foreground">{formatMXN(item.subtotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border/65 bg-background/95 px-6 py-4 shadow-[0_-12px_30px_-28px_rgba(15,39,82,.65)]">
          {!loading && !error ? (
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold tabular-nums text-foreground">{formatMXN(detalle?.Subtotal)}</span>
              </div>
              {Number(detalle?.TotalDescuento || 0) > 0 && (
                <div className="flex items-baseline gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Descuento</span>
                  <span className="font-semibold tabular-nums">−{formatMXN(detalle.TotalDescuento)}</span>
                </div>
              )}
              <div className="flex items-baseline gap-3 border-l border-border/70 pl-6">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Total</span>
                <span className="text-xl font-extrabold tracking-[-0.03em] text-primary tabular-nums">{formatMXN(detalle?.Total)}</span>
              </div>
            </div>
          ) : <span />}
          <DialogClose asChild>
            <button className="h-10 rounded-xl border border-border/70 bg-background px-5 text-xs font-semibold text-foreground transition hover:bg-muted">
              Cerrar
            </button>
          </DialogClose>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
