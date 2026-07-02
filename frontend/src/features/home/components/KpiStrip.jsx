import { DollarSign, ShoppingCart, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * KpiStrip — Banda horizontal de 3 KPIs de vistazo rápido.
 * Usa tokens del design system para adaptarse al tema claro/oscuro.
 */
export function KpiStrip({ ventasHoy = '—', operaciones = '—', alertasStock = 0 }) {
  const kpis = [
    {
      id: 'ventas',
      label: 'Ventas Hoy',
      value: ventasHoy,
      icon: DollarSign,
      accentColor: '#4f46e5',
      valueClass: 'text-primary',
    },
    {
      id: 'ops',
      label: 'Operaciones',
      value: typeof operaciones === 'number' ? String(operaciones) : operaciones,
      icon: ShoppingCart,
      accentColor: '#0891b2',
      valueClass: 'text-foreground',
    },
    {
      id: 'stock',
      label: 'Alertas de Stock',
      value: typeof alertasStock === 'number'
        ? `${alertasStock} crítico${alertasStock !== 1 ? 's' : ''}`
        : alertasStock,
      icon: AlertTriangle,
      accentColor: alertasStock > 0 ? '#e11d48' : '#059669',
      valueClass: alertasStock > 0 ? 'text-danger' : 'text-success',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className={cn(
            'flex items-center gap-3 rounded-2xl px-4 py-3',
            'border border-white/45 bg-white/45 backdrop-blur-md',
            'dark:border-white/10 dark:bg-white/[0.038]',
          )}
        >
          {/* Icon */}
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `${kpi.accentColor}18`,
              border: `1px solid ${kpi.accentColor}30`,
            }}
          >
            <kpi.icon className="size-4" style={{ color: kpi.accentColor }} strokeWidth={2} />
          </div>

          {/* Text */}
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-none mb-0.5">
              {kpi.label}
            </p>
            <p className={cn('text-base font-bold leading-tight truncate', kpi.valueClass)}>
              {kpi.value}
            </p>
          </div>

          {/* Pulse para alertas de stock crítico */}
          {kpi.id === 'stock' && alertasStock > 0 && (
            <span className="ml-auto shrink-0 flex size-2 relative">
              <span className="absolute inline-flex size-2 rounded-full bg-danger opacity-75 animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-danger" />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
