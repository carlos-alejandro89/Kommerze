import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, AlertCircle, Loader2, Calendar, User, Hash, CheckCircle2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosService } from '../../../crm/pages/pos/usePosService';

/**
 * ModalVerTransaccion
 * Sheet lateral para visualizar los detalles completos de una transacción (Venta, Cotización, etc.).
 */
export function ModalVerTransaccion({ row, onClose }) {
  const { obtenerDetalleCotizacion } = usePosService();

  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  /* ── Cargar detalle al montar ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    obtenerDetalleCotizacion(row.ID)
      .then(d => { if (!cancelled) setDetalle(d); })
      .catch(e => { if (!cancelled) setError(e?.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [row.ID]);

  const formatMXN = (n) => `$${(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const getAuthBadgeInfo = (status) => {
    switch (status) {
      case 'solicitada':
        return { label: 'Esperando Autorización', className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400' };
      case 'autorizada':
        return { label: 'Descuento Autorizado', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' };
      case 'rechazada':
        return { label: 'Descuento Rechazado', className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400' };
      default:
        return null;
    }
  };

  const authBadge = getAuthBadgeInfo(detalle?.EstatusAutorizacion);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 flex h-full w-full max-w-[480px] flex-col bg-background border-l border-border shadow-2xl animate-slide-in-right">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="size-4 text-primary" />
              </div>
              <h2 className="text-base font-bold text-foreground">Detalle de Transacción</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-10">
              Folio #{String(row.Folio).padStart(4, '0')} — {row.TipoOperacion}
            </p>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <AlertCircle className="size-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Información General */}
          <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="size-3.5 shrink-0" />
              <span className="font-semibold text-foreground">Fecha:</span>
              <span className="ml-auto">{detalle?.Fecha ? new Date(detalle.Fecha).toLocaleString('es-MX') : '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="size-3.5 shrink-0" />
              <span className="font-semibold text-foreground">Cliente:</span>
              <span className="ml-auto truncate max-w-[200px]">{detalle?.RazonSocial || 'Público General'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash className="size-3.5 shrink-0" />
              <span className="font-semibold text-foreground">Pedido GUID:</span>
              <span className="ml-auto font-mono text-[10px] opacity-75">{detalle?.PedidoGuid || '—'}</span>
            </div>
          </div>

          {/* Autorización de Descuento Especial */}
          {authBadge && (
            <div className={cn("rounded-xl border p-4 space-y-3", 
              detalle.EstatusAutorizacion === 'autorizada' ? 'border-emerald-500/20 bg-emerald-500/5' :
              detalle.EstatusAutorizacion === 'solicitada' ? 'border-indigo-500/20 bg-indigo-500/5' :
              'border-red-500/20 bg-red-500/5'
            )}>
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn("size-4", 
                  detalle.EstatusAutorizacion === 'autorizada' ? 'text-emerald-500' :
                  detalle.EstatusAutorizacion === 'solicitada' ? 'text-indigo-500' :
                  'text-red-500'
                )} />
                <span className={cn("text-xs font-bold", 
                  detalle.EstatusAutorizacion === 'autorizada' ? 'text-emerald-600 dark:text-emerald-400' :
                  detalle.EstatusAutorizacion === 'solicitada' ? 'text-indigo-600 dark:text-indigo-400' :
                  'text-red-600 dark:text-red-400'
                )}>
                  {authBadge.label}
                </span>
              </div>
              
              {(detalle.AutorizadoPor || detalle.ObsAutorizacion) && (
                <div className="text-xs space-y-1 pt-1 border-t border-border/30">
                  {detalle.AutorizadoPor && (
                    <p className="text-muted-foreground"><span className="font-bold text-foreground">Autorizador:</span> {detalle.AutorizadoPor}</p>
                  )}
                  {detalle.ObsAutorizacion && (
                    <p className="text-muted-foreground italic leading-normal">"{detalle.ObsAutorizacion}"</p>
                  )}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Tabla de Artículos */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Artículos</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Producto</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground">P.Unit</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(detalle?.Items ?? []).map(item => (
                        <tr key={item.nivelGuid} className="hover:bg-muted/10">
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-foreground truncate max-w-[160px]">{item.producto || item.nivelCodigo}</div>
                            <div className="text-muted-foreground/70">×{item.cantidad}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-foreground tabular-nums">
                            {formatMXN(item.precioVenta)}
                            {item.descuento > 0 && (
                              <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                                −{formatMXN(item.descuento / item.cantidad)} c/u
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground tabular-nums">
                            {formatMXN(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatMXN(detalle?.Subtotal)}</span>
                </div>
                {(detalle?.TotalDescuento ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                    <span>Descuento total</span>
                    <span className="font-mono font-semibold">−{formatMXN(detalle?.TotalDescuento)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-2 mt-1">
                  <span>Total</span>
                  <span className="font-mono text-primary">{formatMXN(detalle?.Total)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
    , document.body
  );
}
