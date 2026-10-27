import * as React from 'react';
import { Check, Percent, RotateCcw, Settings2, ShoppingBag, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const PRESETS = [10, 20, 30, 40, 50];
const MIN_UTILITY = 10;
const DEFAULT_TAX = 16;
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const calculateSalePrice = (value, roundUp) => roundUp
  ? Math.ceil(Number(value) - Number.EPSILON)
  : roundMoney(value);

export function PriceConfigurationDialog({ open, onOpenChange, item, onApply }) {
  const [selected, setSelected] = React.useState(10);
  const [customMode, setCustomMode] = React.useState(false);
  const [customValue, setCustomValue] = React.useState('10');
  const [customPriceValue, setCustomPriceValue] = React.useState('0.00');
  const [customEditSource, setCustomEditSource] = React.useState('percentage');
  const [roundUp, setRoundUp] = React.useState(false);

  const purchasePrice = Math.max(0, Number(item?.purchasePrice || 0));
  const taxRate = Math.max(0, Number(item?.taxRate ?? DEFAULT_TAX));
  const baseWithTax = purchasePrice * (1 + taxRate / 100);
  const percentage = customMode ? Number(customValue) : selected;
  const validPercentage = Number.isFinite(percentage) && percentage >= MIN_UTILITY;
  const enteredCustomPrice = Number(customPriceValue);
  const minimumSalePrice = baseWithTax * (1 + MIN_UTILITY / 100);
  const validCustomPrice = Number.isFinite(enteredCustomPrice) && enteredCustomPrice >= minimumSalePrice;
  const salePrice = customMode
    ? (validCustomPrice ? enteredCustomPrice : 0)
    : calculateSalePrice(baseWithTax * (1 + percentage / 100), roundUp);
  const customPercentage = Number(customValue);
  const validCustomPercentage = Number.isFinite(customPercentage) && customPercentage >= MIN_UTILITY;
  const customSalePrice = Number.isFinite(enteredCustomPrice) ? enteredCustomPrice : 0;
  const customGrossProfit = validCustomPercentage && validCustomPrice ? roundMoney(customSalePrice - baseWithTax) : 0;
  const hasCost = purchasePrice > 0;

  React.useEffect(() => {
    if (!open) return;
    const initial = Math.max(MIN_UTILITY, Number(item?.utilityPercent || MIN_UTILITY));
    const preset = PRESETS.includes(initial);
    setSelected(preset ? initial : MIN_UTILITY);
    setCustomMode(!preset);
    setCustomValue(String(initial));
    setCustomPriceValue(calculateSalePrice(baseWithTax * (1 + initial / 100), false).toFixed(2));
    setCustomEditSource('percentage');
    setRoundUp(false);
  }, [open, item, baseWithTax]);

  React.useEffect(() => {
    if (!open || customEditSource !== 'percentage') return;
    const nextPercentage = Number(customValue);
    if (!Number.isFinite(nextPercentage)) {
      setCustomPriceValue('');
      return;
    }
    setCustomPriceValue(calculateSalePrice(baseWithTax * (1 + nextPercentage / 100), roundUp).toFixed(2));
  }, [baseWithTax, customEditSource, customValue, open, roundUp]);

  const choosePreset = value => {
    setSelected(value);
    setCustomMode(false);
  };

  const changeCustom = event => {
    const raw = event.target.value.replace(/[^0-9.]/g, '');
    if ((raw.match(/\./g) || []).length > 1) return;
    setCustomValue(raw);
    setCustomEditSource('percentage');
    setCustomMode(true);
  };

  const changeCustomPrice = event => {
    const raw = event.target.value.replace(/[^0-9.]/g, '');
    if ((raw.match(/\./g) || []).length > 1) return;
    setCustomPriceValue(raw);
    setCustomEditSource('price');
    setCustomMode(true);

    const price = Number(raw);
    if (!Number.isFinite(price) || baseWithTax <= 0) {
      setCustomValue('');
      return;
    }
    const calculatedPercentage = ((price / baseWithTax) - 1) * 100;
    setCustomValue(String(Number(calculatedPercentage.toFixed(4))));
  };

  const reset = () => {
    setSelected(MIN_UTILITY);
    setCustomMode(false);
    setCustomValue(String(MIN_UTILITY));
    setCustomPriceValue(calculateSalePrice(baseWithTax * (1 + MIN_UTILITY / 100), false).toFixed(2));
    setCustomEditSource('percentage');
    setRoundUp(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[min(1120px,94vw)] max-w-none overflow-hidden rounded-[24px] border border-blue-100/80 bg-[#f8fbff] p-0 shadow-2xl dark:border-white/10 dark:bg-zinc-950">
      <DialogHeader className="border-b border-border/70 bg-background/90 px-6 py-5 text-left">
        <DialogTitle className="flex items-center gap-3 text-lg"><span className="grid size-9 place-items-center rounded-xl bg-blue-500/10 text-blue-600"><ShoppingBag className="size-4.5" /></span>Configuración de precio</DialogTitle>
        <DialogDescription className="sr-only">Calcula el precio de venta a partir del costo, IVA y porcentaje de utilidad.</DialogDescription>
      </DialogHeader>

      <div className="space-y-6 p-6">
        <section className="grid gap-5 rounded-2xl border border-border/60 bg-white p-4 shadow-sm md:grid-cols-[130px_minmax(0,1fr)_260px] md:items-center dark:bg-zinc-900">
          <div className="flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-muted/45"><img src={item?.image} alt={item?.name || 'Producto'} className="size-full object-contain p-2" /></div>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">Código</p><p className="mt-1 text-lg font-bold">{item?.sku || '—'}</p><p className="mt-3 text-xs text-muted-foreground">Descripción</p><p className="mt-1 truncate text-base font-semibold">{item?.name || 'Producto'}</p></div>
          <div className="border-t pt-4 md:border-l md:border-t-0 md:pl-8 md:pt-0"><p className="text-xs text-muted-foreground">Costo del producto</p><p className="mt-1 text-xl font-black tabular-nums">{money.format(purchasePrice)}</p><p className="mt-3 text-xs text-muted-foreground">Costo + IVA ({taxRate.toFixed(0)}%)</p><p className="mt-1 text-2xl font-black tabular-nums text-primary">{money.format(baseWithTax)}</p></div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-lg font-bold">Selecciona el porcentaje de utilidad</h3><p className="text-sm text-muted-foreground">El precio se calcula sobre el costo más IVA. La utilidad mínima permitida es {MIN_UTILITY}%.</p></div>
          <label className="flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
            <span className="text-sm font-normal text-muted-foreground">Redondear precio</span>
            <button type="button" role="switch" aria-checked={roundUp} aria-label="Redondear el precio de venta al entero superior" onClick={() => setRoundUp(value => !value)} className={cn('relative h-4 w-7 rounded-full transition-colors', roundUp ? 'bg-primary' : 'bg-muted-foreground/25')}>
              <span className={cn('absolute left-0.5 top-0.5 size-3 rounded-full bg-white shadow-sm transition-transform', roundUp ? 'translate-x-3' : 'translate-x-0')} />
            </button>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {PRESETS.map(value => {
            const active = !customMode && selected === value;
            const price = calculateSalePrice(baseWithTax * (1 + value / 100), roundUp);
            const profit = roundMoney(price - baseWithTax);
            return <button key={value} type="button" onClick={() => choosePreset(value)} className={cn('relative rounded-2xl border bg-background/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md', active && 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/10 dark:bg-blue-500/10')}>
              {active && <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-blue-600 text-white"><Check className="size-3.5" /></span>}
              <span className={cn('mx-auto grid size-20 place-items-center rounded-full border-4 border-white bg-slate-100 text-2xl font-black shadow-inner dark:border-zinc-800 dark:bg-zinc-900', active && 'bg-blue-600 text-white')}>{value}%</span>
              <p className="mt-4 text-center text-xs font-bold">Precio {PRESETS.indexOf(value) + 1}</p><div className="my-3 border-t" /><p className="text-[10px] text-muted-foreground">Precio de venta</p><p className="mt-1 text-base font-black tabular-nums">{money.format(price)}</p><span className={cn('mt-3 inline-flex rounded-full px-2 py-1 text-[10px] font-bold transition-colors', active ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400')}>Ganas {money.format(profit)} pesos</span>
            </button>;
          })}

          <div onClick={() => setCustomMode(true)} className={cn('rounded-2xl border bg-background/80 p-4 text-left transition hover:border-blue-300', customMode && 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/10 dark:bg-blue-500/10')}>
            <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-blue-500/10 text-blue-600"><Settings2 className="size-4" /></span><span className="text-xs font-bold">Personalizar</span></div>
            <label className="mt-3 block text-[10px] text-muted-foreground">Porcentaje</label>
            <div className="relative mt-1"><Input inputMode="decimal" value={customValue} onChange={changeCustom} onFocus={() => setCustomMode(true)} className={cn('h-10 pr-9 text-base font-bold', customMode && !validCustomPercentage && 'border-red-400 focus-visible:ring-red-200')} /><Percent className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" /></div>
            <label className="mt-2 block text-[10px] text-muted-foreground">Precio de venta</label>
            <div className="relative mt-1"><span className="pointer-events-none absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">$</span><Input inputMode="decimal" value={customPriceValue} onChange={changeCustomPrice} onFocus={() => setCustomMode(true)} className={cn('h-10 pl-7 text-base font-bold', customMode && !validCustomPrice && 'border-red-400 focus-visible:ring-red-200')} /></div>
            {customMode && (!validCustomPercentage || !validCustomPrice) && <p className="mt-2 text-[10px] font-semibold text-red-600">El precio debe representar al menos {MIN_UTILITY}% de utilidad.</p>}
            {validCustomPercentage && validCustomPrice && <span className={cn('mt-3 inline-flex rounded-full px-2 py-1 text-[10px] font-bold transition-colors', customMode ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400')}>Ganas {money.format(customGrossProfit)} pesos</span>}
          </div>
        </div>

        {!hasCost && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Este producto no tiene un precio de compra válido; configura su costo antes de recalcular el precio de venta.</div>}
      </div>

      <div className="flex items-center justify-between border-t bg-background/90 px-6 py-4"><Button variant="outline" onClick={reset}><RotateCcw className="size-4" />Restablecer</Button><div className="flex gap-3"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!hasCost || !validPercentage || (customMode && !validCustomPrice)} onClick={() => onApply({ price: salePrice, percentage })}><TrendingUp className="size-4" />Aplicar precio</Button></div></div>
    </DialogContent>
  </Dialog>;
}
