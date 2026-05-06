import { useState } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  Package, AlertTriangle, Star, ArrowRight, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { cn } from '@/lib/utils';

/* ── Mock data (replace with real API calls) ── */
const salesData = [
  { day: 'Lun', sales: 18500 },
  { day: 'Mar', sales: 24200 },
  { day: 'Mié', sales: 19800 },
  { day: 'Jue', sales: 31000 },
  { day: 'Vie', sales: 42850 },
  { day: 'Sáb', sales: 8200 },
  { day: 'Dom', sales: 3100 },
];

const stockAlerts = [
  { id: 1, name: 'Sellador Vinílico 5×1', sku: 'SLL-004', unit: 'Galón 4L', current: 2, min: 10 },
  { id: 2, name: 'Esmalte Acrílico 100', sku: 'ESM-012', unit: 'Cubeta 19L', current: 1, min: 5 },
  { id: 3, name: 'Impermeabilizante Max', sku: 'IMP-007', unit: 'Bote 20L', current: 3, min: 8 },
];

const kpis = [
  {
    id: 'sales',
    label: 'Ventas Hoy',
    value: '$42,850',
    cents: '.00',
    delta: '+15.2%',
    deltaPositive: true,
    subtitle: 'vs ayer',
    icon: DollarSign,
    gradient: 'from-brand-500/10 to-brand-600/5',
    iconBg: 'bg-brand-500/15 text-brand-600',
  },
  {
    id: 'ticket',
    label: 'Ticket Promedio',
    value: '$1,245',
    cents: '.50',
    delta: '+3.4%',
    deltaPositive: true,
    subtitle: 'vs promedio mensual',
    icon: ShoppingCart,
    gradient: 'from-success/10 to-success/5',
    iconBg: 'bg-success/15 text-success',
  },
  {
    id: 'ops',
    label: 'Operaciones',
    value: '34',
    cents: '',
    delta: '4 devoluciones',
    deltaPositive: null,
    subtitle: 'completadas hoy',
    icon: Package,
    gradient: 'from-accent-500/10 to-accent-500/5',
    iconBg: 'bg-accent-500/15 text-accent-500',
  },
];

/* ── Custom tooltip for chart ── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface-raised px-3 py-2 shadow-xl text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        ${payload[0].value.toLocaleString('es-MX')}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const [chartRange, setChartRange] = useState('semana');

  return (
    <div className="p-5 space-y-5 animate-fade-in">

      {/* ── Page Title ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Resumen Ejecutivo</h2>
          <p className="text-sm text-muted-foreground">Métricas clave de rendimiento — hoy</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="size-3.5" />
          Actualizar
        </button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className={cn(
              'relative overflow-hidden rounded-xl border border-border bg-surface p-5',
              'hover:shadow-lg hover:shadow-black/5 transition-all duration-200',
              `bg-gradient-to-br ${kpi.gradient}`,
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
              <div className={cn('flex size-9 items-center justify-center rounded-lg', kpi.iconBg)}>
                <kpi.icon className="size-[18px]" />
              </div>
            </div>

            <p className="text-3xl font-bold tracking-tight text-foreground">
              {kpi.value}
              {kpi.cents && (
                <span className="text-lg font-semibold text-muted-foreground">{kpi.cents}</span>
              )}
            </p>

            <div className="mt-2 flex items-center gap-1.5">
              {kpi.deltaPositive !== null && (
                kpi.deltaPositive
                  ? <TrendingUp className="size-3.5 text-success" />
                  : <TrendingDown className="size-3.5 text-danger" />
              )}
              <span className={cn(
                'text-xs font-semibold',
                kpi.deltaPositive === true  && 'text-success',
                kpi.deltaPositive === false && 'text-danger',
                kpi.deltaPositive === null  && 'text-muted-foreground',
              )}>
                {kpi.delta}
              </span>
              <span className="text-xs text-muted-foreground">{kpi.subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Tendencia de Ventas</h3>
              <p className="text-xs text-muted-foreground">Ventas diarias en pesos MXN</p>
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {['semana', 'mes'].map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={cn(
                    'px-3 py-1.5 capitalize font-medium transition-colors',
                    chartRange === r
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {r === 'semana' ? 'Esta semana' : 'Este mes'}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={salesData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sales" stroke="var(--brand-500)" strokeWidth={2.5} fill="url(#salesGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--brand-500)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top product */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Producto Estrella</h3>
            <Star className="size-4 text-warning fill-warning" />
          </div>

          <div className="rounded-lg overflow-hidden border border-border bg-bg-subtle mb-4 aspect-video flex items-center justify-center">
            <div className="text-center space-y-1">
              <Package className="size-10 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground">Sin imagen</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
              ★ #1 Ventas
            </div>
            <h4 className="font-semibold text-foreground text-sm leading-tight">
              Esmalte Acrílico 100
            </h4>
            <p className="text-xs text-muted-foreground">Cubeta 19L — Blanco Ostión</p>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-[11px] text-muted-foreground">Unidades hoy</p>
                <p className="text-xl font-bold text-foreground">42 uds.</p>
              </div>
              <button className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                Ver detalles <ArrowRight className="size-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stock Alerts ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Alertas de Stock</h3>
            <span className="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">
              {stockAlerts.length} críticos
            </span>
          </div>
          <button className="text-xs font-medium text-primary hover:text-brand-700 transition-colors flex items-center gap-1">
            Ver inventario <ArrowRight className="size-3" />
          </button>
        </div>

        <div className="divide-y divide-border">
          {stockAlerts.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg-subtle transition-colors">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                <Package className="size-4 text-warning" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.unit} · {item.sku}</p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[11px] text-muted-foreground">Stock actual</p>
                <p className="text-sm font-bold text-danger">{item.current}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-muted-foreground">Mínimo</p>
                <p className="text-sm font-semibold text-foreground">{item.min}</p>
              </div>

              <button className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">
                Reordenar
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
