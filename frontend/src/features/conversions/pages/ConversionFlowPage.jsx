import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Boxes, Check, Image as ImageIcon, Loader2, Package, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { QuantityControl } from '@/components/common/quantity-control';
import { StockFilterSwitch } from '@/components/common/stock-filter-switch';
import { useTurno } from '@/providers/TurnoProvider';
import { usePosService } from '@/features/pos/usePosService';

const numeric = value => Number(value || 0);
const formatNumber = value => numeric(value).toLocaleString('es-MX', { maximumFractionDigits: 3 });
const imageUrl = path => path ? `${import.meta.env.VITE_CLOUD_API_URL || ''}${path}` : '';

export function ConversionFlowPage() {
  const navigate = useNavigate();
  const { turnoActivo } = useTurno();
  const { consultarProductosConvertibles, ejecutarConversion } = usePosService();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [onlyWithStock, setOnlyWithStock] = useState(true);

  const load = useCallback(async term => {
    setLoading(true); setError('');
    try { setProducts(await consultarProductosConvertibles((term || '').trim()) || []); }
    catch (err) { setProducts([]); setError(String(err).replace(/^Error:\s*/, '')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => load(search), 250); return () => window.clearTimeout(timer); }, [load, search]);

  const output = useMemo(() => numeric(quantity) * numeric(selected?.factorConversion), [quantity, selected]);
  const visibleProducts = useMemo(
    () => onlyWithStock ? products.filter(item => numeric(item.existenciaOrigen) > 0) : products,
    [onlyWithStock, products],
  );
  const invalid = !selected || !turnoActivo || numeric(quantity) <= 0 || numeric(quantity) > numeric(selected.existenciaOrigen);
  const open = item => { setSelected(item); setQuantity('1'); };
  const confirm = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      const operacionCajeroId = turnoActivo?.ID ?? turnoActivo?.id;
      const result = await ejecutarConversion({ reglaGuid: selected.reglaGuid, cantidad: numeric(quantity), operacionCajeroId });
      toast.success(`Conversión ${String(result?.folio || '').padStart(7, '0')} registrada correctamente.`);
      setSelected(null);
      navigate('/conversions');
    } catch (err) { toast.error(String(err).replace(/^Error:\s*/, '') || 'No fue posible realizar la conversión.'); }
    finally { setSaving(false); }
  };

  return <div className="mx-auto flex min-h-full w-full max-w-[1380px] flex-col gap-5 p-5 lg:p-6">
    <nav className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><button onClick={() => navigate('/home')}>Home</button><span>/</span><button onClick={() => navigate('/conversions')}>Conversiones</button><span>/</span><span className="text-foreground">Nueva conversión</span></nav>
    <header className="flex flex-col justify-between gap-4 rounded-2xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] dark:border-white/10 dark:bg-white/[.04] sm:flex-row sm:items-center">
      <div className="flex items-center gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600"><Boxes className="size-6" /></div><div><h1 className="text-xl font-bold">Nueva conversión</h1><p className="mt-1 text-xs text-muted-foreground">Selecciona una ruta configurada y define la cantidad a transformar.</p></div></div>
      <button onClick={() => navigate('/conversions')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 px-4 text-xs font-semibold"><ArrowLeft className="size-4" /> Volver al historial</button>
    </header>
    <section className="flex min-h-[430px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] dark:border-white/10 dark:bg-white/[.04]">
      <div className="flex flex-col justify-between gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-semibold">Conversiones disponibles</h2><p className="mt-1 text-[11px] text-muted-foreground">Las rutas provienen de las reglas de conversión activas.</p></div><div className="flex items-center justify-end gap-2"><div className="relative w-full sm:w-[330px]"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto o código…" className="h-10 w-full rounded-full border border-border/70 bg-background/75 pl-10 pr-4 text-sm outline-none focus:border-primary/45" /></div><button onClick={() => load(search)} className="flex size-10 items-center justify-center rounded-full border border-border/70"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button></div></div>
      <div className="flex min-h-11 items-center justify-between border-b border-border/55 bg-muted/[.16] px-5 py-2"><p className="text-[10px] text-muted-foreground">Mostrando <span className="font-semibold text-foreground">{visibleProducts.length}</span> conversión{visibleProducts.length === 1 ? '' : 'es'}</p><StockFilterSwitch checked={onlyWithStock} onCheckedChange={setOnlyWithStock} /></div>
      {loading ? <div className="flex flex-1 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div> : error ? <Empty title="No fue posible cargar las conversiones" detail={error} /> : visibleProducts.length === 0 ? <Empty title={onlyWithStock && products.length ? 'No hay productos con existencia' : 'No hay rutas disponibles'} detail={onlyWithStock && products.length ? 'Desactiva el filtro para consultar todas las conversiones posibles.' : 'Configura y activa reglas de conversión para comenzar.'} /> : <div className="grid gap-3 overflow-auto p-4 md:grid-cols-2">{visibleProducts.map(item => <button key={item.reglaGuid} onClick={() => open(item)} className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-background/55 p-4 text-left transition hover:border-primary/30 hover:bg-primary/[.025]"><ProductImage src={item.imagenOrigen} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.productoOrigen}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.codigoOrigen} · {item.empaqueOrigen}</p><p className="mt-2 text-xs font-medium text-primary">Existencia: {formatNumber(item.existenciaOrigen)} {item.unidadOrigen}</p></div><ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.productoDestino}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.codigoDestino} · {item.empaqueDestino}</p><p className="mt-2 text-xs">1 → {formatNumber(item.factorConversion)}</p></div></button>)}</div>}
    </section>
    {selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && !saving && setSelected(null)}><div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/60 bg-background shadow-2xl"><div className="flex items-start justify-between border-b px-6 py-5"><div><h2 className="text-lg font-bold">Confirmar conversión</h2><p className="mt-1 text-xs text-muted-foreground">Verifica la ruta, cantidad y existencia disponible.</p></div><button disabled={saving} onClick={() => setSelected(null)} className="flex size-9 items-center justify-center rounded-full hover:bg-muted"><X className="size-4" /></button></div>
      <div className="p-6"><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-primary/15 bg-primary/[.025] p-5"><RouteProduct image={selected.imagenOrigen} name={selected.productoOrigen} code={selected.codigoOrigen} packageName={selected.empaqueOrigen} /><div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><ArrowRight className="size-5" /></div><RouteProduct image={selected.imagenDestino} name={selected.productoDestino} code={selected.codigoDestino} packageName={selected.empaqueDestino} /></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-semibold text-[#334a70] dark:text-slate-300">Cantidad de origen</p><div className="mt-2 flex items-center gap-3"><QuantityControl value={numeric(quantity)} onChange={value => setQuantity(String(value))} min={1} max={Math.floor(numeric(selected.existenciaOrigen))} step={1} disabled={saving || numeric(selected.existenciaOrigen) < 1} className="h-12 px-1.5 [&>button]:size-9 [&>button:nth-child(2)]:w-14 [&>button_svg]:size-4 [&>input]:w-14 [&>input]:text-sm" /><div className="rounded-full bg-blue-50/80 px-4 py-2 text-xs font-semibold uppercase text-blue-600 dark:bg-blue-400/[.08] dark:text-blue-300">{selected.unidadOrigen}</div></div><span className="mt-2 block text-xs font-normal text-muted-foreground">Disponible: {formatNumber(selected.existenciaOrigen)} {selected.unidadOrigen}</span></div><div className="relative overflow-hidden rounded-2xl border border-blue-200/45 bg-gradient-to-br from-blue-50/50 via-background to-cyan-50/30 p-4 shadow-[0_10px_24px_-24px_rgba(37,99,235,.45)] dark:border-blue-400/10 dark:from-blue-500/[.055] dark:via-background dark:to-cyan-400/[.03]"><div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-blue-400/[.055] blur-2xl" /><p className="relative flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700/75 dark:text-blue-300/85"><Sparkles className="size-3.5" /> Resultado estimado</p><div className="relative mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-x-2 text-center tabular-nums"><span className="rounded-lg bg-white/45 px-1 py-2 text-lg font-semibold text-foreground shadow-sm dark:bg-white/[.035]" title="Existencia actual">{formatNumber(selected.existenciaDestino)}</span><span className="text-lg text-blue-400/75">+</span><span className="rounded-lg bg-blue-500/[.065] px-1 py-2 text-xl font-bold text-primary" title="Unidades generadas">{formatNumber(output)}</span><span className="text-lg text-blue-400/75">=</span><span className="rounded-lg bg-emerald-500/[.065] px-1 py-2 text-xl font-extrabold text-emerald-600 dark:text-emerald-400" title="Existencia final">{formatNumber(numeric(selected.existenciaDestino) + output)}</span><span className="mt-2 text-[9px] leading-tight text-muted-foreground">Existencia actual</span><span /><span className="mt-2 text-[9px] leading-tight text-blue-600/75 dark:text-blue-300/85">Conversión</span><span /><span className="mt-2 text-[9px] leading-tight text-emerald-600/80 dark:text-emerald-400/90">Existencia final</span></div><div className="relative mt-3 flex items-center justify-between border-t border-blue-200/40 pt-2 text-[10px] text-muted-foreground dark:border-blue-400/[.07]"><span>{selected.unidadDestino || 'Unidad destino'}</span><span className="rounded-full bg-blue-500/[.065] px-2 py-0.5 font-medium text-blue-700/85 dark:text-blue-300/90">Factor × {formatNumber(selected.factorConversion)}</span></div></div></div>
        {numeric(quantity) > numeric(selected.existenciaOrigen) && <p className="mt-3 text-xs font-medium text-destructive">La existencia disponible no es suficiente para esta conversión.</p>}
        {!turnoActivo && <p className="mt-3 text-xs font-medium text-destructive">Debes abrir un turno de caja para registrar la conversión.</p>}
      </div><div className="flex justify-end gap-2 border-t bg-muted/20 px-6 py-4"><button disabled={saving} onClick={() => setSelected(null)} className="h-10 rounded-xl border border-border px-4 text-xs font-semibold">Cancelar</button><button disabled={invalid || saving} onClick={confirm} className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Confirmar conversión</button></div></div></div>}
  </div>;
}

function ProductImage({ src }) { return <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">{src ? <img src={imageUrl(src)} alt="" className="size-full object-cover" /> : <ImageIcon className="size-5 text-muted-foreground/50" />}</div>; }
function RouteProduct({ image, name, code, packageName }) { return <div className="flex min-w-0 flex-col items-center text-center"><div className="mb-3 flex size-24 items-center justify-center overflow-hidden rounded-2xl border bg-muted">{image ? <img src={imageUrl(image)} alt="" className="size-full object-cover" /> : <ImageIcon className="size-7 text-muted-foreground/50" />}</div><p className="w-full truncate text-sm font-semibold">{name}</p><p className="mt-1 text-[11px] text-muted-foreground">{code} · {packageName}</p></div>; }
function Empty({ title, detail }) { return <div className="flex flex-1 flex-col items-center justify-center text-center"><Package className="size-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }
