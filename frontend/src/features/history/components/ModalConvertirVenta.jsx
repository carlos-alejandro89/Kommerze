import * as React from 'react';
import { AlertCircle, CheckCircle2, Loader2, ReceiptText, ShoppingCart, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { EventsOn } from '../../../../wailsjs/runtime/runtime';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentMethodSelector } from '@/features/pos/components/PaymentMethodSelector';
import { ItemPagos } from '@/features/pos/components/item-pagos';
import { PinpadWaitingDialog } from '@/features/pos/components/PinpadWaitingDialog';
import { isCardPayment } from '@/features/pos/components/payment-method-utils';
import { usePosService } from '@/features/pos/usePosService';
import { useActivation } from '@/providers/ActivationProvider';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
const netPaySaleTransaction = payload => {
  const service = window?.go?.main?.App?.NetPaySaleTransaction;
  if (typeof service !== 'function') throw new Error('El servicio de NetPay no está disponible.');
  return service(payload);
};
const cardPaymentType = data => {
  const value = String(data?.cardType ?? data?.CardType ?? data?.raw?.card_type ?? data?.raw?.cardType ?? '').trim().toUpperCase();
  if (value === 'C') return { Clave: '04', Nombre: 'Tarjeta de crédito' };
  if (value === 'D') return { Clave: '28', Nombre: 'Tarjeta de débito' };
  return {};
};

export function ModalConvertirVenta({ row, onClose }) {
  const posService = usePosService();
  const { store } = useActivation();
  const paymentGuid = React.useRef(crypto.randomUUID());
  const pendingPinpad = React.useRef(null);
  const pinpadTimeout = React.useRef(null);
  const [detalle, setDetalle] = React.useState(null);
  const [formasPago, setFormasPago] = React.useState([]);
  const [paymentMethod, setPaymentMethod] = React.useState(null);
  const [pagos, setPagos] = React.useState([]);
  const [pinpadEnabled, setPinpadEnabled] = React.useState(false);
  const [pinpadDialog, setPinpadDialog] = React.useState({ open: false, amount: 0, status: 'waiting', message: '' });
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let active = true;
    Promise.all([
      posService.obtenerDetalleCotizacion(row.ID),
      posService.obtenerFormasPago(),
      posService.obtenerConfiguracionDispositivo().catch(() => null),
    ]).then(([quotation, paymentResponse, config]) => {
      if (!active) return;
      setDetalle(quotation);
      const methods = paymentResponse?.data || [];
      setFormasPago(methods);
      setPaymentMethod(methods.find(method => String(method.Clave).trim() === '01')?.ID ?? methods[0]?.ID ?? null);
      const credentials = Boolean(String(config?.netPayUser || '').trim() && String(config?.netPayPassword || '').trim() && String(config?.netPayStoreId || '').trim() && String(config?.netPayDeviceSerial || '').trim());
      setPinpadEnabled(config?.terminalCobro === 'pinpad' && credentials);
      if (!methods.length) setError('No hay formas de pago sincronizadas.');
    }).catch(reason => setError(reason?.message || String(reason))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [row.ID]);

  React.useEffect(() => {
    const unsubscribe = EventsOn('netpay_payment_response', data => {
      const pending = pendingPinpad.current;
      if (!pending) return;
      const guid = data?.paymentGuid ?? data?.PaymentGuid ?? data?.raw?.paymentGuid;
      if (guid && guid !== paymentGuid.current) return;
      const approved = String(data?.responseCode ?? data?.ResponseCode ?? '') === '00';
      const message = data?.message ?? data?.Message ?? (approved ? 'Pago aprobado correctamente' : 'Pago no aprobado');
      pendingPinpad.current = null;
      setPinpadDialog(current => ({ ...current, open: true, status: approved ? 'success' : 'error', message }));
      clearTimeout(pinpadTimeout.current);
      pinpadTimeout.current = setTimeout(() => setPinpadDialog({ open: false, amount: 0, status: 'waiting', message: '' }), approved ? 2200 : 3200);
      if (approved) {
        const type = cardPaymentType(data);
        const brand = String(data?.cardTypeName ?? data?.CardTypeName ?? data?.raw?.cardTypeName ?? data?.raw?.card_type_name ?? '').trim();
        const normalized = { ...pending, ...type, TipoTarjeta: type.Nombre || pending.Nombre, MarcaTarjeta: brand, Referencia: type.Nombre || pending.Nombre, NetPay: data?.raw ?? data };
        setPagos(current => current.some(item => item.ID == normalized.ID) ? current.map(item => item.ID == normalized.ID ? normalized : item) : [...current, normalized]);
      }
      paymentGuid.current = crypto.randomUUID();
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); clearTimeout(pinpadTimeout.current); };
  }, []);

  const totals = React.useMemo(() => ({ subtotal: Number(detalle?.Subtotal || 0), discount: Number(detalle?.TotalDescuento || 0), total: Number(detalle?.Total || 0) }), [detalle]);
  const paid = pagos.reduce((sum, payment) => sum + Number(payment.Monto || 0), 0);
  const pending = Math.max(0, Number((totals.total - paid).toFixed(2)));
  const change = pagos.reduce((sum, payment) => sum + Number(payment.Cambio || 0), 0);

  const addPayment = async payment => {
    setError('');
    if (pinpadEnabled && isCardPayment(payment)) {
      try {
        if (pending <= 0) return toast.info('La venta ya está cubierta');
        const normalized = { ...payment, Monto: pending.toFixed(2), MontoRecibido: pending.toFixed(2), Cambio: '0.00' };
        const result = await netPaySaleTransaction({ serialNumber: '', amount: pending.toFixed(2), storeId: '', folioNumber: String(row.Folio || Date.now()), msi: '00', traceability: { paymentGuid: paymentGuid.current, idSucursal: String(store?.ID || store?.Guid || store?.guid || 'N/A') } });
        if (!result?.success) throw new Error(result?.message || result?.errors?.[0] || 'No fue posible procesar el pago');
        pendingPinpad.current = { ...normalized, Referencia: 'Pago con tarjeta', NetPaySolicitud: result.data };
        setPinpadDialog({ open: true, amount: pending, status: 'waiting', message: '' });
      } catch (reason) { pendingPinpad.current = null; toast.error(reason?.message || 'No fue posible procesar el pago con tarjeta'); }
      return;
    }
    const received = Number(payment.MontoRecibido ?? payment.Monto ?? 0);
    if (!Number.isFinite(received) || received <= 0) return toast.error('Ingresa un monto válido mayor que cero');
    const otherPayments = pagos.filter(item => item.ID != payment.ID).reduce((sum, item) => sum + Number(item.Monto || 0), 0);
    const available = Math.max(0, Number((totals.total - otherPayments).toFixed(2)));
    if (available <= 0) return toast.info('La venta ya está cubierta');
    const cash = String(payment.Clave || '').trim() === '01';
    if (!cash && received > available + 0.001) return toast.error(`Este medio de pago no puede superar ${money.format(available)}`);
    const normalized = { ...payment, Monto: (cash ? Math.min(received, available) : received).toFixed(2), MontoRecibido: received.toFixed(2), Cambio: (cash ? Math.max(0, received - available) : 0).toFixed(2) };
    setPagos(current => current.some(item => item.ID == normalized.ID) ? current.map(item => item.ID == normalized.ID ? normalized : item) : [...current, normalized]);
  };

  const submit = async () => {
    if (!pagos.length || pending > 0.001) return setError(`Falta aplicar ${money.format(pending)} para completar el pago.`);
    setSubmitting(true); setError('');
    try {
      const response = await posService.convertirCotizacionAVenta(row.ID, pagos, null);
      if (response?.success === false) throw new Error(response.message || 'No fue posible crear la venta');
      toast.success('Venta creada. La cotización original se conservó sin cambios.');
      onClose();
    } catch (reason) { setError(reason?.message || String(reason)); } finally { setSubmitting(false); }
  };

  return <>
    <Dialog open onOpenChange={open => !open && !submitting && onClose()}>
      <DialogContent className="w-[min(96vw,1040px)] max-w-none max-h-[90vh] overflow-hidden rounded-2xl p-0" onEscapeKeyDown={event => submitting && event.preventDefault()}>
        <DialogHeader className="mb-0 border-b bg-muted/25 px-6 py-5"><div className="flex items-center gap-3 pr-8"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShoppingCart className="size-5" /></div><div><DialogTitle className="text-xl">Crear venta desde cotización</DialogTitle><DialogDescription className="mt-1">Cotización #{String(row.Folio || '').padStart(6, '0')} · Se conservará el documento original.</DialogDescription></div></div></DialogHeader>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="min-h-0 overflow-y-auto border-b p-6 lg:border-b-0 lg:border-r">
            {loading ? <div className="flex h-64 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div> : <div className="space-y-5">
              <div className="rounded-xl border bg-muted/20 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cliente</p><p className="mt-1 font-semibold">{detalle?.RazonSocial || row.RazonSocial || 'Público General'}</p></div>
              {row.EstatusAutorizacion === 'autorizada' && <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700"><CheckCircle2 className="mt-0.5 size-4" /><div><p className="text-xs font-bold">Descuentos autorizados</p><p className="text-xs opacity-80">{detalle?.AutorizadoPor || 'Autorización registrada'}</p></div></div>}
              <div><div className="mb-3 flex items-center gap-2"><ReceiptText className="size-4 text-primary" /><h3 className="text-sm font-bold">Productos de la cotización</h3></div><div className="overflow-hidden rounded-xl border">{(detalle?.Items || []).map(item => <div key={item.nivelGuid} className="flex items-start justify-between gap-3 border-b px-4 py-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.producto || item.nivelCodigo}</p><p className="text-xs text-muted-foreground">{item.cantidad} × {money.format(item.precioVenta)}</p></div><div className="text-right"><p className="text-sm font-bold tabular-nums">{money.format(item.subtotal)}</p>{Number(item.descuento) > 0 && <p className="text-[11px] text-emerald-600">-{money.format(item.descuento)}</p>}</div></div>)}</div></div>
              <div className="space-y-2 rounded-xl border bg-muted/20 p-4 text-sm"><div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{money.format(totals.subtotal)}</span></div>{totals.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Descuentos</span><span>-{money.format(totals.discount)}</span></div>}<div className="flex justify-between border-t pt-3 text-base font-bold"><span>Total</span><span className="text-primary">{money.format(totals.total)}</span></div></div>
            </div>}
          </section>
          <section className="min-h-0 overflow-y-auto p-6">
            <div className="mb-5"><div className="flex items-center gap-2"><WalletCards className="size-4 text-primary" /><h3 className="text-sm font-bold">Formas de pago</h3></div><p className="mt-1 text-xs text-muted-foreground">Puedes combinar varios métodos de pago, igual que en el flujo principal de Ventas.</p></div>
            {!!error && <div className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="size-4 shrink-0" />{error}</div>}
            {!loading && <PaymentMethodSelector formaPago={formasPago} paymentMethod={paymentMethod} onSelect={setPaymentMethod} onAddPayment={addPayment} saldoPendiente={pending} pinpadEnabled={pinpadEnabled} />}
            <div className="mt-6 rounded-xl border bg-muted/15 p-4"><div className="mb-3 flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pagos aplicados</h4><span className="text-xs text-muted-foreground">{pagos.length}</span></div><div className="space-y-2">{pagos.length ? pagos.map(payment => <ItemPagos key={payment.ID} pago={payment} handleDeletePaymentItem={id => setPagos(current => current.filter(item => item.ID !== id))} />) : <p className="py-5 text-center text-xs text-muted-foreground">Aún no has agregado pagos.</p>}</div><div className="mt-4 space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Aplicado</span><span className="font-semibold">{money.format(paid)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Pendiente</span><span className={pending > 0 ? 'font-bold text-amber-600' : 'font-bold text-emerald-600'}>{money.format(pending)}</span></div>{change > 0 && <div className="flex justify-between text-emerald-600"><span>Cambio</span><span className="font-bold">{money.format(change)}</span></div>}</div></div>
          </section>
        </div>
        <div className="flex items-center justify-between gap-3 border-t bg-background px-6 py-4"><p className="hidden text-xs text-muted-foreground sm:block">Se generará una venta nueva vinculada a estos datos.</p><div className="ml-auto flex gap-3"><Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button><Button onClick={submit} disabled={loading || submitting || totals.total <= 0 || pending > 0.001}>{submitting ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}{submitting ? 'Creando venta…' : 'Crear venta'}</Button></div></div>
      </DialogContent>
    </Dialog>
    <PinpadWaitingDialog open={pinpadDialog.open} amount={pinpadDialog.amount} status={pinpadDialog.status} message={pinpadDialog.message} onOpenChange={open => { if (!open) { pendingPinpad.current = null; setPinpadDialog(current => ({ ...current, open: false })); } }} />
  </>;
}
