import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Tag, AlertCircle, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosService } from '../../../crm/pages/pos/usePosService';
import { ServiceGetSucursalGuid } from '../../../../wailsjs/go/main/App';
import { useAuth } from '@/providers/AuthProvider';

/**
 * ModalSolicitarDescuento
 * Sheet lateral para solicitar autorización de descuentos al sistema central.
 * Muestra cada ítem de la cotización con un campo editable de % descuento solicitado.
 */
export function ModalSolicitarDescuento({ row, onClose }) {
  const { obtenerDetalleCotizacion, solicitarAutorizacion } = usePosService();
  const { user } = useAuth();

  const [detalle, setDetalle]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);
  const [justificacion, setJustificacion] = useState('');

  /* descuentos: { [nivelGuid]: float } */
  const [descuentos, setDescuentos] = useState({});

  /* ── Cargar detalle ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    obtenerDetalleCotizacion(row.ID)
      .then(d => {
        if (cancelled) return;
        setDetalle(d);
        // Inicializar con descuentos solicitados anteriores si existen
        const init = {};
        (d?.Items ?? []).forEach(item => {
          const prev = d.DescuentosSolicitados?.find(s => s.nivelGuid === item.nivelGuid);
          init[item.nivelGuid] = prev?.descuentoSolicitado ?? 0;
        });
        setDescuentos(init);
      })
      .catch(e => { if (!cancelled) setError(e?.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [row.ID]);

  const handleDescuentoChange = (nivelGuid, val) => {
    const num = Math.min(100, Math.max(0, parseFloat(val) || 0));
    setDescuentos(prev => ({ ...prev, [nivelGuid]: num }));
  };

  const handleSubmit = async () => {
    if (!detalle) return;
    setSubmitting(true);
    setError(null);
    try {
      const sucursalGuid = await ServiceGetSucursalGuid();
      const items = (detalle.Items ?? []).map(item => ({
        nivelGuid:           item.nivelGuid,
        producto:            item.producto,
        precioVenta:         item.precioVenta,
        descuentoSolicitado: descuentos[item.nivelGuid] ?? 0,
        descuentoAutorizado: 0,
      }));
      const GUID_DESCUENTO_ESPECIAL = 'e57b32c1-d9a4-4638-b02f-f481c7e93da0';
      const res = await solicitarAutorizacion(
        detalle.PedidoGuid,
        sucursalGuid,
        GUID_DESCUENTO_ESPECIAL,
        user?.Guid || '',
        justificacion,
        items
      );
      if (res?.success === false) { setError(res.message); return; }
      onClose();
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ── */
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 flex h-full w-full max-w-[480px] flex-col bg-background border-l border-border shadow-2xl animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10">
                <Tag className="size-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-base font-bold text-foreground">Solicitar Descuento</h2>
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

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Tabla de ítems */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Ítems de la cotización
                </p>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Producto</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground">P. Venta</th>
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground w-24">% Desc.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(detalle?.Items ?? []).map(item => {
                        const pct = descuentos[item.nivelGuid] ?? 0;
                        const ahorroUnidad = item.precioVenta * pct / 100;
                        return (
                          <tr key={item.nivelGuid} className="hover:bg-muted/10 transition-colors">
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-foreground truncate max-w-[160px]">{item.producto || item.nivelCodigo}</div>
                              <div className="text-muted-foreground/70">×{item.cantidad}</div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-foreground tabular-nums">
                              ${item.precioVenta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              {pct > 0 && (
                                <div className="text-indigo-500 font-semibold">−${ahorroUnidad.toFixed(2)}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.5}
                                  value={pct}
                                  onChange={e => handleDescuentoChange(item.nivelGuid, e.target.value)}
                                  className="w-14 rounded-md border border-border bg-surface px-2 py-1 text-center text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                                />
                                <span className="text-muted-foreground">%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Justificación */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                  Justificación (opcional)
                </label>
                <textarea
                  value={justificacion}
                  onChange={e => setJustificacion(e.target.value)}
                  placeholder="Motivo del descuento especial…"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition resize-none"
                />
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
            disabled={submitting || loading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
              'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {submitting ? 'Enviando…' : 'Enviar para autorización'}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
