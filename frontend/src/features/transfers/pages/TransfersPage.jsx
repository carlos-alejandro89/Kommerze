import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Eye,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosService } from '@/features/pos/usePosService';
import { useActivation } from '@/providers/ActivationProvider';
import { EventsOn } from '../../../../wailsjs/runtime/runtime';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PAGE_SIZE = 15;

function formatDate(value, empty = 'Pendiente de recepción') {
  if (!value) return { date: empty, time: '' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: String(value), time: '' };
  return {
    date: parsed.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: parsed.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  };
}

function isReceived(item) {
  return Boolean(item.fechaRecepcion) || /recibid|complet/i.test(item.estatus || '');
}

function StatusBadge({ item }) {
  const received = isReceived(item);
  const Icon = received ? CheckCircle2 : Truck;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
      received
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    )}>
      <Icon className="size-3.5" />
      {item.estatus || (received ? 'Recibido' : 'En tránsito')}
    </span>
  );
}

function TransferDetail({ item, onClose, currentBranchGuid, onResolve }) {
  if (!item) return null;
  const sent = formatDate(item.fechaEnvio);
  const received = formatDate(item.fechaRecepcion);
  const receivedTransfer = isReceived(item);
  const incoming = String(item.sucursalDestinoGuid || '').toLowerCase() === String(currentBranchGuid || '').toLowerCase();
  const definitive = /aceptad|rechazad|cancelad/i.test(item.estatus || '');
  const value = `$${Number(item.valorTotal || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="w-[calc(100vw-36px)] max-w-[820px] gap-0 overflow-hidden border-white/80 bg-background/95 p-0 shadow-[0_28px_90px_-35px_rgba(15,39,82,.5)] backdrop-blur-xl sm:rounded-3xl dark:border-white/10"
        showCloseButton
      >
        <DialogHeader className="relative mb-0 overflow-hidden border-b border-border/65 bg-gradient-to-br from-cyan-500/[.10] via-background to-blue-500/[.06] px-6 py-5 pr-14 text-left">
          <div className="pointer-events-none absolute -right-12 -top-20 size-52 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-[0_12px_24px_-14px_rgba(8,145,178,.8)]">
              <Truck className="size-6" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <DialogTitle className="text-xl font-bold tracking-[-0.025em]">Detalle de transferencia</DialogTitle>
                <StatusBadge item={item} />
              </div>
              <DialogDescription className="flex flex-wrap items-center gap-x-2 text-xs">
                <span className="font-mono font-bold text-foreground">Folio #{item.folio}</span>
                <span aria-hidden="true">•</span>
                <span>Seguimiento del envío entre sucursales</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-muted/[.12] to-background p-5 sm:p-6">
          <section className="border-b border-border/65 pb-5">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Información general</h3>
            <dl className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
              <div className="grid grid-cols-[120px_minmax(0,1fr)] items-baseline gap-3">
                <dt className="text-xs text-muted-foreground">Folio</dt>
                <dd className="font-mono text-xs font-bold text-foreground">#{item.folio}</dd>
              </div>
              <div className="grid grid-cols-[120px_minmax(0,1fr)] items-baseline gap-3">
                <dt className="text-xs text-muted-foreground">Estatus</dt>
                <dd className="text-xs font-semibold text-foreground">{item.estatus || (receivedTransfer ? 'Recibido' : 'En tránsito')}</dd>
              </div>
              <div className="grid grid-cols-[120px_minmax(0,1fr)] items-baseline gap-3">
                <dt className="text-xs text-muted-foreground">Fecha de envío</dt>
                <dd className="text-xs font-medium text-foreground">{sent.date}{sent.time ? `, ${sent.time}` : ''}</dd>
              </div>
              <div className="grid grid-cols-[120px_minmax(0,1fr)] items-baseline gap-3">
                <dt className="text-xs text-muted-foreground">Recepción</dt>
                <dd className={cn('text-xs font-medium', item.fechaRecepcion ? 'text-foreground' : 'text-amber-600 dark:text-amber-400')}>
                  {received.date}{received.time ? `, ${received.time}` : ''}
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-6">
            <div className="mb-3 px-0.5">
              <h3 className="text-sm font-bold tracking-[-0.01em] text-foreground">Ruta de transferencia</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Origen y destino registrados para el movimiento de mercancía.</p>
            </div>
            <div className="rounded-2xl border border-border/65 bg-background/75 px-5 py-5 shadow-[0_14px_35px_-30px_rgba(20,54,110,.55)]">
              <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Sucursal origen</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-foreground">{item.sucursalOrigen}</p>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <span className="hidden h-px w-7 bg-primary/25 sm:block" />
                  <ArrowRight className="size-5" />
                  <span className="hidden h-px w-7 bg-primary/25 sm:block" />
                </div>
                <div className="min-w-0 sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Sucursal destino</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-foreground">{item.sucursalDestino}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-4 px-0.5">
              <div>
                <h3 className="text-sm font-bold tracking-[-0.01em] text-foreground">Artículos transferidos</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Productos y cantidades incluidos en el envío.</p>
              </div>
              <p className="shrink-0 text-[11px] font-medium text-muted-foreground">
                {(item.productos || []).length} registro{(item.productos || []).length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/65 bg-background/75 shadow-[0_14px_35px_-30px_rgba(20,54,110,.55)]">
              <div className="max-h-[280px] overflow-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-border/65 bg-slate-50/95 backdrop-blur dark:bg-slate-900/95">
                      {['Artículo', 'Unidad', 'Cantidad', 'Precio de venta', 'Importe'].map((label, index) => (
                        <th
                          key={label}
                          className={cn(
                            'px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground',
                            index === 0 ? 'text-left' : index === 1 ? 'text-center' : 'text-right',
                          )}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(item.productos || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-xs text-muted-foreground">No hay artículos registrados en esta transferencia.</td>
                      </tr>
                    )}
                    {(item.productos || []).map((product, index) => (
                      <tr key={`${product.nivelGuid}-${index}`} className="transition-colors hover:bg-blue-50/40 dark:hover:bg-white/[.035]">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/10 bg-cyan-500/[.07] text-cyan-600 dark:text-cyan-400">
                              <Package className="size-4" strokeWidth={1.7} />
                            </span>
                            <div className="min-w-0">
                              <p className="max-w-[310px] truncate text-xs font-semibold text-foreground">{product.producto || 'Producto'}</p>
                              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{product.codigo || 'Sin código'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex rounded-md border border-border/60 bg-muted/25 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                            {product.unidadMedida || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-xs font-semibold tabular-nums">{Number(product.cantidad || 0)}</td>
                        <td className="px-4 py-3.5 text-right text-xs tabular-nums">
                          ${Number(product.precioVenta || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right text-xs font-bold tabular-nums text-foreground">
                          ${Number(product.importe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {item.comentarios && (
            <section className="mt-6">
              <h3 className="mb-2 text-sm font-bold tracking-[-0.01em] text-foreground">Comentarios</h3>
              <p className="rounded-xl border border-border/60 bg-muted/15 px-4 py-3 text-xs leading-relaxed text-foreground">{item.comentarios}</p>
            </section>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border/65 bg-background/95 px-6 py-4 shadow-[0_-12px_30px_-28px_rgba(15,39,82,.65)]">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
              <span>Productos</span>
              <span className="font-semibold tabular-nums text-foreground">{item.totalProductos || 0}</span>
            </div>
            <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
              <span>Unidades</span>
              <span className="font-semibold tabular-nums text-foreground">{item.unidadesTotales || 0}</span>
            </div>
            <div className="flex items-baseline gap-3 border-l border-border/70 pl-6">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Valor</span>
              <span className="text-xl font-extrabold tracking-[-0.03em] text-primary tabular-nums">{value}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
          {!definitive && incoming && <><button onClick={() => onResolve('86968037-975a-43ce-880c-043003010106')} className="h-10 rounded-xl border border-red-200 px-4 text-xs font-semibold text-red-600">Rechazar</button><button onClick={() => onResolve('86968037-975a-43ce-880c-043003010105')} className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground">Aceptar transferencia</button></>}
          {!definitive && !incoming && <button onClick={() => onResolve('86968037-975a-43ce-880c-043003010103')} className="h-10 rounded-xl border border-red-200 px-4 text-xs font-semibold text-red-600">Cancelar envío</button>}
          <DialogClose asChild>
            <button className="h-10 rounded-xl border border-border/70 bg-background px-5 text-xs font-semibold text-foreground transition hover:bg-muted">
              Cerrar
            </button>
          </DialogClose>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

export function TransfersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { store, license } = useActivation();
  const { consultarTransferencias, resolverTransferencia } = usePosService();
  const currentBranchGuid = store?.Guid ?? store?.guid ?? license?.sucursal?.guid ?? '';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await consultarTransferencias();
      setItems(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveTransfer = async (estatusGuid) => {
    if (!selected) return;
    await resolverTransferencia(selected.pedidoGuid, currentBranchGuid, estatusGuid);
    setSelected(null);
    await load();
  };

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const pedidoGuid = searchParams.get('pedido');
    if (!pedidoGuid || loading || !items.length) return;
    const transfer = items.find(item => item.pedidoGuid === pedidoGuid);
    if (transfer) setSelected(transfer);
    setSearchParams({}, { replace: true });
  }, [items, loading, searchParams, setSearchParams]);

  useEffect(() => {
    const unsubscribe = EventsOn('transferencia_recibida', () => load());
    const unsubscribeStatus = EventsOn('transferencia_actualizada', () => load());
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof unsubscribeStatus === 'function') unsubscribeStatus();
    };
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(item => [
      item.folio,
      item.sucursalOrigen,
      item.sucursalDestino,
      item.estatus,
    ].some(value => String(value || '').toLowerCase().includes(query)));
  }, [items, search]);

  useEffect(() => setPage(1), [search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const inTransit = items.filter(item => !isReceived(item)).length;
  const received = items.filter(isReceived).length;
  const unitsInTransit = items.filter(item => !isReceived(item)).reduce((sum, item) => sum + Number(item.unidadesTotales || 0), 0);

  const cards = [
    { label: 'En tránsito', value: inTransit, detail: 'Envíos pendientes de recepción', icon: Truck, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { label: 'Recibidas', value: received, detail: 'Transferencias completadas', icon: PackageCheck, tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { label: 'Unidades en tránsito', value: unitsInTransit, detail: 'Productos por recibir', icon: Boxes, tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
    { label: 'Total registros', value: items.length, detail: 'Histórico de transferencias', icon: MapPin, tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in">
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-hidden p-5 lg:p-6">
        <div className="shrink-0">
          <nav className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <button onClick={() => navigate('/home')} className="transition hover:text-primary">Home</button>
            <span>/</span>
            <span className="text-foreground">Transferencias</span>
          </nav>
          <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Truck className="size-6" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-[-0.025em] text-foreground">Transferencias</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Seguimiento a envío y recepción de productos.</p>
              </div>
            </div>
            <button onClick={() => navigate('/home')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-xs font-semibold text-foreground transition hover:bg-muted">
              <ArrowLeft className="size-4" /> Volver al inicio
            </button>
          </header>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map(card => (
            <div key={card.label} className="flex min-h-[92px] items-center gap-3.5 rounded-2xl border border-white/70 bg-white/65 p-4 shadow-[0_12px_32px_-27px_rgba(30,64,120,.42)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.045]">
              <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', card.tone)}><card.icon className="size-5" /></div>
              <div><p className="text-[11px] font-semibold text-muted-foreground">{card.label}</p><p className="mt-0.5 text-xl font-bold text-foreground">{loading ? '—' : card.value}</p><p className="text-[10px] text-muted-foreground/75">{card.detail}</p></div>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/70 bg-white/55 p-2.5 shadow-[0_12px_34px_-29px_rgba(30,64,120,.4)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.035]">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por folio, sucursal o estatus…" className="h-10 w-full rounded-xl border border-border/70 bg-background/75 pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/75 focus:border-primary/50 focus:ring-2 focus:ring-primary/10" />
          </div>
          <button onClick={load} disabled={loading} title="Actualizar transferencias" className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/75 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40">
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
          {error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"><AlertCircle className="size-7 text-red-500" /><p className="font-semibold">No se pudieron cargar las transferencias</p><p className="max-w-md text-xs text-muted-foreground">{error}</p><button onClick={load} className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Reintentar</button></div>
          ) : loading ? (
            <div className="flex-1 space-y-2 p-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-muted/70" />)}</div>
          ) : (
            <>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead><tr className="sticky top-0 border-b border-border/70 bg-slate-50/95 backdrop-blur dark:bg-white/[.055]">
                    {['Folio', 'Sucursal destino', 'Fecha de envío', 'Fecha de recepción', 'Productos', 'Estatus', 'Acciones'].map(label => <th key={label} className="whitespace-nowrap px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-border/65">
                    {pageItems.length === 0 && <tr><td colSpan={7} className="py-16 text-center text-sm text-muted-foreground">{search ? 'Sin resultados para la búsqueda.' : 'No hay transferencias registradas.'}</td></tr>}
                    {pageItems.map(item => {
                      const sent = formatDate(item.fechaEnvio);
                      const receivedDate = formatDate(item.fechaRecepcion);
                      const incoming = String(item.sucursalDestinoGuid || '').toLowerCase() === String(currentBranchGuid).toLowerCase();
                      return (
                        <tr key={item.traspasoGuid} className="transition hover:bg-blue-50/40 dark:hover:bg-white/[.035]">
                          <td className="whitespace-nowrap px-5 py-3.5"><button onClick={() => setSelected(item)} className="font-mono text-xs font-bold text-primary hover:underline">#{item.folio}</button><span className={cn('ml-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide', incoming ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600')}>{incoming ? 'Entrante' : 'Salida'}</span><p className="mt-1 text-[10px] text-muted-foreground">{item.sucursalOrigen}</p></td>
                          <td className="px-5 py-3.5 font-medium text-foreground">{item.sucursalDestino}</td>
                          <td className="whitespace-nowrap px-5 py-3.5"><p className="text-xs font-medium">{sent.date}</p><p className="text-xs text-muted-foreground">{sent.time}</p></td>
                          <td className="whitespace-nowrap px-5 py-3.5"><p className={cn('text-xs font-medium', !item.fechaRecepcion && 'text-amber-600 dark:text-amber-400')}>{receivedDate.date}</p>{receivedDate.time && <p className="text-xs text-muted-foreground">{receivedDate.time}</p>}</td>
                          <td className="px-5 py-3.5"><p className="font-semibold">{item.totalProductos || 0}</p><p className="text-[10px] text-muted-foreground">{item.unidadesTotales || 0} unidades</p></td>
                          <td className="px-5 py-3.5"><StatusBadge item={item} /></td>
                          <td className="px-5 py-3.5"><button onClick={() => setSelected(item)} className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/65 px-2.5 py-1.5 text-[11px] font-semibold transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"><Eye className="size-3" /> Ver</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <footer className="flex shrink-0 items-center justify-between border-t border-border/70 bg-background/35 px-5 py-3">
                <p className="text-xs text-muted-foreground">{filtered.length ? `Mostrando ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length} transferencias` : 'Sin resultados'}</p>
                <div className="flex items-center gap-2"><button onClick={() => setPage(value => Math.max(1, value - 1))} disabled={safePage === 1} className="flex size-8 items-center justify-center rounded-lg border border-border/70 disabled:opacity-40"><ArrowLeft className="size-3.5" /></button><span className="min-w-16 text-center text-xs font-semibold">{safePage} / {totalPages}</span><button onClick={() => setPage(value => Math.min(totalPages, value + 1))} disabled={safePage === totalPages} className="flex size-8 items-center justify-center rounded-lg border border-border/70 disabled:opacity-40"><ArrowRight className="size-3.5" /></button></div>
              </footer>
            </>
          )}
        </div>
      </div>
      <TransferDetail item={selected} onClose={() => setSelected(null)} currentBranchGuid={currentBranchGuid} onResolve={resolveTransfer} />
    </div>
  );
}
