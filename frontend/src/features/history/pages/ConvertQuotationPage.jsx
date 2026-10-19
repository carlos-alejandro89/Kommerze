import * as React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, ImageIcon, Loader2, Mail, Phone, ReceiptText, Search, ShoppingCart, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { EventsOn } from '../../../../wailsjs/runtime/runtime';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaymentMethodSelector } from '@/features/pos/components/PaymentMethodSelector';
import { ItemPagos } from '@/features/pos/components/item-pagos';
import { PinpadWaitingDialog } from '@/features/pos/components/PinpadWaitingDialog';
import { isCardPayment } from '@/features/pos/components/payment-method-utils';
import { usePosService } from '@/features/pos/usePosService';
import { useActivation } from '@/providers/ActivationProvider';
import { useCloudConfig } from '@/providers/CloudConfigProvider';
import { TRANSACTION_TYPES } from '@/features/pos/transaction-types';

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

export function ConvertQuotationPage() {
  const { pedidoId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const posService = usePosService();
  const { store } = useActivation();
  const { getCloudAssetUrl } = useCloudConfig();
  const source = location.state?.row || {};
  const quotationID = Number(pedidoId || source.ID || 0);
  const returnTo = location.state?.returnTo || '/history';
  const successTo = location.state?.successTo || '/history';
  const paymentGuid = React.useRef(crypto.randomUUID());
  const pendingPinpad = React.useRef(null);
  const pinpadTimeout = React.useRef(null);
  const [detalle, setDetalle] = React.useState(null);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [clientDialogOpen, setClientDialogOpen] = React.useState(false);
  const [clientQuery, setClientQuery] = React.useState('');
  const [clientResults, setClientResults] = React.useState([]);
  const [searchingClients, setSearchingClients] = React.useState(false);
  const [formasPago, setFormasPago] = React.useState([]);
  const [paymentMethod, setPaymentMethod] = React.useState(null);
  const [pagos, setPagos] = React.useState([]);
  const [pinpadEnabled, setPinpadEnabled] = React.useState(false);
  const [pinpadDialog, setPinpadDialog] = React.useState({ open: false, amount: 0, status: 'waiting', message: '' });
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!quotationID) { setError('No se recibió una cotización válida.'); setLoading(false); return; }
    let active = true;
    Promise.all([
      posService.obtenerDetalleCotizacion(quotationID),
      posService.obtenerFormasPago(),
      posService.obtenerConfiguracionDispositivo().catch(() => null),
    ]).then(([quotation, paymentResponse, config]) => {
      if (!active) return;
      setDetalle(quotation);
      setSelectedClient({
        Guid: quotation?.ClienteGuid || '',
        RazonSocial: quotation?.RazonSocial || 'Público General',
        RFC: quotation?.ClienteRFC || '',
        Correo: quotation?.ClienteCorreo || '',
        Telefono: quotation?.ClienteTelefono || '',
      });
      const methods = paymentResponse?.data || [];
      setFormasPago(methods);
      setPaymentMethod(methods.find(method => String(method.Clave).trim() === '01')?.ID ?? methods[0]?.ID ?? null);
      const credentials = Boolean(String(config?.netPayUser || '').trim() && String(config?.netPayPassword || '').trim() && String(config?.netPayStoreId || '').trim() && String(config?.netPayDeviceSerial || '').trim());
      setPinpadEnabled(config?.terminalCobro === 'pinpad' && credentials);
      if (!methods.length) setError('No hay formas de pago sincronizadas.');
    }).catch(reason => setError(reason?.message || String(reason))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [quotationID]);

  React.useEffect(() => {
    if (!clientDialogOpen) return undefined;
    let active = true;
    setSearchingClients(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await posService.buscarClientes(clientQuery.trim());
        if (active) setClientResults(results || []);
      } catch (reason) {
        if (active) setClientResults([]);
        console.error('No se pudieron consultar los clientes:', reason);
      } finally {
        if (active) setSearchingClients(false);
      }
    }, clientQuery.trim() ? 280 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [clientDialogOpen, clientQuery]);

  const selectClient = client => {
    setSelectedClient(client);
    setClientDialogOpen(false);
    setClientQuery('');
  };

  React.useEffect(() => {
    const unsubscribe = EventsOn('netpay_payment_response', data => {
      const pendingPayment = pendingPinpad.current;
      if (!pendingPayment) return;
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
        const normalized = { ...pendingPayment, ...type, TipoTarjeta: type.Nombre || pendingPayment.Nombre, MarcaTarjeta: brand, Referencia: type.Nombre || pendingPayment.Nombre, NetPay: data?.raw ?? data };
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
        const result = await netPaySaleTransaction({ serialNumber: '', amount: pending.toFixed(2), storeId: '', folioNumber: String(detalle?.Folio || Date.now()), msi: '00', traceability: { paymentGuid: paymentGuid.current, idSucursal: String(store?.ID || store?.Guid || store?.guid || 'N/A') } });
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
      const response = await posService.convertirCotizacionAVenta(quotationID, pagos, store?.ID ?? store?.id ?? null, selectedClient?.Guid || '');
      if (response?.success === false) throw new Error(response.message || 'No fue posible crear la venta');
      const sale = response?.data || {};
      localStorage.setItem('folio', String(sale.Folio || ''));
      localStorage.setItem('pedidoGuid', String(sale.Guid || ''));
      localStorage.setItem('operationTypeGuid', TRANSACTION_TYPES.VENTA.guid);
      localStorage.setItem('pagosAplicados', JSON.stringify(pagos));
      if (successTo === '/pos/order-placed') {
        localStorage.setItem('cart', JSON.stringify((detalle?.Items || []).map(item => ({
          id: item.nivelGuid,
          name: item.producto,
          sku: item.nivelCodigo,
          quantity: Number(item.cantidad || 0),
          price: Number(item.precioVenta || 0),
          discount: Number(item.porcentajeDescuento || 0),
          image: getCloudAssetUrl(item.imgReferencia),
        }))));
        localStorage.removeItem('validCart'); localStorage.removeItem('sucursal');
      }
      toast.success('Venta creada. La cotización original quedó marcada como aplicada.');
      navigate(successTo, { replace: true });
    } catch (reason) { setError(reason?.message || String(reason)); } finally { setSubmitting(false); }
  };

  return <div className="relative flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-[#f5f8fc] dark:bg-background">
    <div className="kommerze-gradient-bg pointer-events-none absolute inset-0" />
    <header className="relative z-[var(--z-layer-base)] flex shrink-0 items-center justify-between border-b border-border/70 bg-background/90 px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(returnTo)} disabled={submitting}><ArrowLeft className="size-4" /></Button>
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShoppingCart className="size-5" /></div>
        <div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-primary">Ventas</p><h1 className="text-xl font-bold">Crear venta desde cotización</h1><p className="text-xs text-muted-foreground">Cotización #{String(detalle?.Folio || source.Folio || '').padStart(6, '0')} · El documento original se conservará.</p></div>
      </div>
      <div className="hidden rounded-xl border bg-background/70 px-4 py-2 text-right sm:block"><p className="text-[10px] font-bold uppercase text-muted-foreground">Total a cobrar</p><p className="text-xl font-black text-primary">{money.format(totals.total)}</p></div>
    </header>

    <main className="relative z-[var(--z-layer-base)] grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(480px,.95fr)]">
      <section className="min-h-0 overflow-y-auto border-b border-border/70 p-5 lg:border-b-0 lg:border-r">
        {loading ? <div className="flex h-full items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div> : <div className="mx-auto max-w-4xl space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex min-h-[82px] items-center gap-3 rounded-xl border border-primary bg-primary/5 px-4 py-3 shadow-[0_0_0_1px_rgba(var(--primary),0.12)] dark:bg-primary/10 dark:border-primary/20">
              <Avatar className="size-11 shrink-0"><AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">{String(selectedClient?.RazonSocial || 'PG').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Cliente actual</p><Button variant="link" onClick={() => setClientDialogOpen(true)} className="h-auto shrink-0 p-0 text-[9px] font-bold uppercase">Cambiar cliente</Button></div>
                <p className="truncate text-sm font-semibold leading-tight">{selectedClient?.RazonSocial || 'Público General'}</p>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">{selectedClient?.RFC ? `RFC: ${selectedClient.RFC}` : 'Venta al público general'}</p>
              </div>
            </div>
            {detalle?.EstatusAutorizacion === 'autorizada' && <div className="flex min-h-[82px] items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700"><CheckCircle2 className="size-5" /><div><p className="text-xs font-bold">Descuentos autorizados</p><p className="text-xs opacity-80">{detalle?.AutorizadoPor || 'Autorización registrada'}</p></div></div>}
          </div>
          <div className="overflow-hidden rounded-2xl border bg-background/75 shadow-sm"><div className="flex items-center gap-2 border-b px-5 py-4"><ReceiptText className="size-4 text-primary" /><h2 className="text-sm font-bold">Productos de la cotización</h2><span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{detalle?.Items?.length || 0}</span></div><div className="divide-y">{(detalle?.Items || []).map(item => { const image = getCloudAssetUrl(item.imgReferencia); return <div key={item.nivelGuid} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-primary/[.025]"><div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">{image ? <img src={image} alt={item.producto || ''} className="size-full object-contain p-1" /> : <ImageIcon className="size-6 text-muted-foreground/40" />}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{item.producto || item.nivelCodigo}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.nivelCodigo} · {item.unidadMedida}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-muted px-2 py-1">{item.cantidad} × {money.format(item.precioVenta)}</span>{Number(item.descuento) > 0 && <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-600">Descuento -{money.format(item.descuento)}</span>}{Number(item.porcentajeDescuento) > 0 && <span className="rounded-md bg-blue-500/10 px-2 py-1 font-semibold text-blue-600">{Number(item.porcentajeDescuento).toFixed(2)}%</span>}</div></div><div className="text-right"><p className="text-[10px] font-bold uppercase text-muted-foreground">Importe</p><p className="mt-1 text-base font-black tabular-nums">{money.format(item.subtotal)}</p></div></div>; })}</div></div>
        </div>}
      </section>

      <section className="min-h-0 overflow-y-auto bg-background/45 p-5">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5"><div className="flex items-center gap-2"><WalletCards className="size-5 text-primary" /><h2 className="text-base font-bold">Selecciona el método de pago</h2></div><p className="mt-1 text-xs text-muted-foreground">Puedes combinar varios métodos, igual que en el flujo principal de Ventas.</p></div>
          {!!error && <div className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="size-4 shrink-0" />{error}</div>}
          {!loading && <PaymentMethodSelector formaPago={formasPago} paymentMethod={paymentMethod} onSelect={setPaymentMethod} onAddPayment={addPayment} saldoPendiente={pending} pinpadEnabled={pinpadEnabled} />}
          <div className="mt-6 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pagos aplicados</h3><span className="text-xs text-muted-foreground">{pagos.length}</span></div>
              <div className="space-y-2">{pagos.length ? pagos.map(payment => <ItemPagos key={payment.ID} pago={payment} handleDeletePaymentItem={id => setPagos(current => current.filter(item => item.ID !== id))} />) : <p className="py-6 text-center text-xs text-muted-foreground">Aún no has agregado pagos.</p>}</div>
              <div className="mt-4 space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Aplicado</span><span className="font-semibold">{money.format(paid)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Pendiente</span><span className={pending > 0 ? 'font-bold text-amber-600' : 'font-bold text-emerald-600'}>{money.format(pending)}</span></div>{change > 0 && <div className="flex justify-between text-emerald-600"><span>Cambio</span><span className="font-bold">{money.format(change)}</span></div>}</div>
            </div>
            <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-br from-[#002366] to-[#001233] p-4 text-white shadow-xl">
              <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-white opacity-[0.03] blur-2xl" />
              <div className="relative z-[var(--z-layer-raised)] flex h-full min-h-[190px] flex-col">
                <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-blue-200/60">Resumen de cuenta</h3>
                <div className="space-y-2"><div className="flex justify-between text-xs"><span className="text-blue-100/70">Subtotal</span><span className="font-bold">{money.format(totals.subtotal)}</span></div><div className="flex justify-between text-xs"><span className="text-blue-100/70">Descuento</span><span className="font-bold">{money.format(totals.discount)}</span></div></div>
                <div className="mt-auto pt-4"><div className="mb-3 border-t border-white/10" /><div className="flex items-end justify-between"><div><p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-blue-200/60">Total neto</p><p className="text-2xl font-black leading-none tracking-tighter">{money.format(totals.total)}</p></div><span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-200/80">{detalle?.Items?.length || 0} Art.</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer className="relative z-[var(--z-layer-base)] flex shrink-0 items-center justify-between border-t bg-background px-6 py-4"><p className="hidden text-xs text-muted-foreground sm:block">Se generará una venta nueva y la cotización quedará como Aplicada.</p><div className="ml-auto flex gap-3"><Button variant="outline" onClick={() => navigate(returnTo)} disabled={submitting}>Cancelar</Button><Button onClick={submit} disabled={loading || submitting || totals.total <= 0 || pending > 0.001}>{submitting ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}{submitting ? 'Creando venta…' : 'Crear venta'}</Button></div></footer>
    <ClientSelectorDialog open={clientDialogOpen} onOpenChange={setClientDialogOpen} query={clientQuery} onQueryChange={setClientQuery} results={clientResults} loading={searchingClients} onSelect={selectClient} />
    <PinpadWaitingDialog open={pinpadDialog.open} amount={pinpadDialog.amount} status={pinpadDialog.status} message={pinpadDialog.message} onOpenChange={open => { if (!open) { pendingPinpad.current = null; setPinpadDialog(current => ({ ...current, open: false })); } }} />
  </div>;
}

function ClientSelectorDialog({ open, onOpenChange, query, onQueryChange, results, loading, onSelect }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[82vh] w-[min(720px,94vw)] max-w-none flex-col overflow-hidden rounded-2xl p-0">
      <DialogHeader className="border-b border-border/70 px-6 py-5 text-left"><DialogTitle>Seleccionar cliente</DialogTitle><DialogDescription>Busca por nombre o razón social, RFC, teléfono o correo electrónico.</DialogDescription></DialogHeader>
      <div className="px-6 pt-4"><div className="flex h-11 items-center rounded-xl border border-[#dce7f6] bg-white/90 px-4 transition focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-white/[.065]"><Search className="mr-3 size-4 text-[#6481ad]" /><input autoFocus value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Nombre, RFC, teléfono o correo…" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#7790b6]" />{loading && <Loader2 className="size-4 animate-spin text-blue-600" />}</div></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {loading && !results.length ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-muted/70" />)}</div> : results.length ? <div className="space-y-2">{results.map(client => <button key={client.Guid || client.ID} type="button" onClick={() => onSelect(client)} className="group flex w-full items-center gap-3 rounded-xl border border-border/65 bg-background/65 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/55 dark:hover:border-blue-400/20 dark:hover:bg-blue-500/[.07]"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-600">{String(client.RazonSocial || 'C').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{client.RazonSocial || 'Cliente sin nombre'}</span><span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground"><span className="font-semibold text-foreground/75">RFC: {client.RFC || '—'}</span>{client.Correo && <span className="inline-flex items-center gap-1"><Mail className="size-3" />{client.Correo}</span>}{client.Telefono && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{client.Telefono}</span>}</span></span><span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-600 opacity-0 transition group-hover:opacity-100">Seleccionar</span></button>)}</div> : <div className="flex flex-col items-center justify-center py-14 text-center"><Search className="size-9 text-muted-foreground/35" /><p className="mt-3 text-sm font-semibold">Sin clientes encontrados</p><p className="mt-1 text-xs text-muted-foreground">Prueba con otro dato o registra primero al cliente.</p></div>}
      </div>
      <div className="border-t border-border/70 bg-muted/20 px-6 py-3 text-[10px] text-muted-foreground">{loading ? 'Consultando clientes…' : `${results.length} cliente${results.length === 1 ? '' : 's'} disponible${results.length === 1 ? '' : 's'}`}</div>
    </DialogContent>
  </Dialog>;
}
