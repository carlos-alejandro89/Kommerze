import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingCart, AlertCircle, Loader2, CreditCard, Banknote, CheckCircle2, ArrowRightLeft, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosService } from '@/features/pos/usePosService';
import { toast } from 'sonner';

/**
 * ModalConvertirVenta
 * Sheet lateral para convertir una cotización en una venta real.
 * Muestra los ítems con descuentos autorizados aplicados y el flujo de pago.
 */
export function ModalConvertirVenta({ row, onClose }) {
  const { obtenerDetalleCotizacion, convertirCotizacionAVenta, obtenerFormasPago } = usePosService();

  const [detalle, setDetalle]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [formasPago, setFormasPago] = useState([]);
  const [formaSeleccionada, setFormaSeleccionada] = useState(null);

  /* ── Cargar detalle y formas de pago ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    Promise.all([
      obtenerDetalleCotizacion(row.ID),
      obtenerFormasPago().catch(() => ({ success: false, data: [] }))
    ])
      .then(([detRes, fpRes]) => {
        if (cancelled) return;
        setDetalle(detRes);
        
        // Procesar formas de pago
        const rawFp = fpRes?.data || [];
        // Filtrar métodos comunes
        const commonClaves = new Set(['01', '03', '04', '28', '29']);
        let list = rawFp.filter(fp => commonClaves.has(String(fp.Clave || '').trim()));
        if (list.length === 0) {
          list = [
            { ID: 1, Nombre: 'Efectivo', Clave: '01', Descripcion: 'Pago en efectivo' },
            { ID: 2, Nombre: 'Tarjeta', Clave: '28', Descripcion: 'Pago con tarjeta de crédito/débito' },
            { ID: 3, Nombre: 'Transferencia', Clave: '03', Descripcion: 'Pago electrónico' },
          ];
        }
        setFormasPago(list);
        
        // Seleccionar efectivo (01) por defecto
        const cashFp = list.find(fp => String(fp.Clave).trim() === '01') || list[0];
        setFormaSeleccionada(cashFp);
      })
      .catch(e => {
        if (!cancelled) setError(e?.message ?? String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
      
    return () => { cancelled = true; };
  }, [row.ID]);

  /* ── Totales con descuentos autorizados ── */
  const totales = useMemo(() => {
    if (!detalle) return { subtotal: 0, totalDescuento: 0, total: 0 };
    return {
      subtotal:       detalle.Subtotal        ?? 0,
      totalDescuento: detalle.TotalDescuento  ?? 0,
      total:          detalle.Total           ?? 0,
    };
  }, [detalle]);

  const monto    = parseFloat(montoRecibido) || 0;
  const cambio   = Math.max(0, monto - totales.total);
  const falta    = totales.total > 0 ? Math.max(0, totales.total - monto) : 0;

  const handleSelectFormaPago = (fp) => {
    setFormaSeleccionada(fp);
    // Para cualquier método que no sea Efectivo (01), auto-llenamos el monto exacto
    if (String(fp.Clave || '').trim() !== '01') {
      setMontoRecibido(totales.total.toFixed(2));
    } else {
      setMontoRecibido('');
    }
  };

  const handleSubmit = async () => {
    if (falta > 0) { setError(`Falta $${falta.toFixed(2)} para completar el pago.`); return; }
    setSubmitting(true);
    setError(null);
    try {
      const pagos = [{
        ID: formaSeleccionada?.ID || 1,
        Nombre: formaSeleccionada?.Nombre || 'Efectivo',
        Monto: totales.total,
      }];
      const res = await convertirCotizacionAVenta(row.ID, pagos, null);
      if (res?.success === false) { setError(res.message || 'Error al procesar la venta'); return; }
      toast.success('Venta generada exitosamente.');
      onClose();
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const formatMXN = (n) => `$${(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  /* ── Render ── */
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
                <ShoppingCart className="size-4 text-primary" />
              </div>
              <h2 className="text-base font-bold text-foreground">Convertir a Venta</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-10">
              Cotización #{String(row.Folio).padStart(4, '0')} — {row.RazonSocial || 'Público General'}
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

          {/* Badge de autorización */}
          {row.EstatusAutorizacion === 'autorizada' && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Descuentos autorizados</p>
                <p className="text-xs text-muted-foreground">por {detalle?.AutorizadoPor || '—'}</p>
              </div>
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
              {/* Ítems */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ítems</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Producto</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground">P.Unit</th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground w-32">Descuento</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(detalle?.Items ?? []).map(item => {
                        const descSol = detalle?.DescuentosSolicitados?.find(d => d.nivelGuid === item.nivelGuid);
                        const descAut = detalle?.DescuentosAutorizados?.find(d => d.nivelGuid === item.nivelGuid);
                        const solicitadoPct = descSol?.descuentoSolicitado ?? 0;
                        const autorizadoPct = descAut?.descuentoAutorizado ?? 0;

                        return (
                          <tr key={item.nivelGuid} className="hover:bg-muted/10">
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-foreground truncate max-w-[160px]">{item.producto || item.nivelCodigo}</div>
                              <div className="text-muted-foreground/70">×{item.cantidad}</div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-foreground tabular-nums">
                              {formatMXN(item.precioVenta)}
                            </td>
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              {solicitadoPct > 0 ? (
                                <div className="space-y-0.5">
                                  <div className="text-[10px] text-muted-foreground">
                                    Solicitado: <span className="font-semibold">{solicitadoPct}%</span>
                                  </div>
                                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                    Autorizado: <span>{autorizadoPct}%</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/50 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground tabular-nums">
                              {formatMXN(item.subtotal)}
                              {item.descuento > 0 && (
                                <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                                  −{formatMXN(item.descuento)}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatMXN(totales.subtotal)}</span>
                </div>
                {totales.totalDescuento > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                    <span>Descuento total</span>
                    <span className="font-mono font-semibold">−{formatMXN(totales.totalDescuento)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-2 mt-1">
                  <span>Total a pagar</span>
                  <span className="font-mono text-primary">{formatMXN(totales.total)}</span>
                </div>
              </div>

              {/* Forma de pago */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Método de Pago</p>
                <div className="space-y-4">
                  {/* Grid de métodos de pago */}
                  <div className="grid grid-cols-3 gap-2">
                    {formasPago.map(fp => {
                      const ClaveStr = String(fp.Clave || '').trim();
                      const isSelected = formaSeleccionada?.ID === fp.ID;
                      
                      // Resolver ícono
                      let Icon = DollarSign;
                      if (ClaveStr === '01') Icon = Banknote;
                      else if (ClaveStr === '03') Icon = ArrowRightLeft;
                      else if (ClaveStr === '04' || ClaveStr === '28' || ClaveStr === '29') Icon = CreditCard;

                      // Nombre
                      const name = fp.Nombre === 'Efectivo' ? 'Efectivo' :
                                   fp.Nombre === 'Tarjeta' ? 'Tarjeta' :
                                   fp.Nombre === 'Transferencia' ? 'Transferencia' : fp.Nombre;

                      return (
                        <button
                          key={fp.ID}
                          type="button"
                          onClick={() => handleSelectFormaPago(fp)}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border-2 gap-2 text-center transition-all duration-200",
                            isSelected
                              ? "border-primary bg-primary/5 text-primary shadow-sm"
                              : "border-border hover:border-border/80 bg-surface text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className="size-5" />
                          <span className="text-xs font-bold whitespace-nowrap">{name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Input de monto recibido */}
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={montoRecibido}
                      onChange={e => setMontoRecibido(e.target.value)}
                      placeholder={`Monto recibido (mín. ${formatMXN(totales.total)})`}
                      className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2.5 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                  </div>

                  {monto > 0 && (
                    <div className={cn(
                      'flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-semibold',
                      falta > 0
                        ? 'border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400'
                        : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
                    )}>
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="size-4" />
                        {falta > 0 ? 'Falta' : 'Cambio'}
                      </span>
                      <span className="font-mono text-base">
                        {falta > 0 ? formatMXN(falta) : formatMXN(cambio)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading || falta > 0 || totales.total === 0}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
            {submitting ? 'Procesando…' : 'Confirmar Venta'}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
