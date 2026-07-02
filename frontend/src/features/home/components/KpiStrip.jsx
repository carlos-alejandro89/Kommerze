import {
  AlertTriangle,
  CloudCheck,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
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
      detail: '+12.5% vs ayer',
      icon: DollarSign,
      accentColor: '#4f46e5',
      valueClass: 'text-primary',
    },
    {
      id: 'ops',
      label: 'Operaciones',
      value: typeof operaciones === 'number' ? String(operaciones) : operaciones,
      detail: 'En el dia de hoy',
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
      detail: 'Ver detalles',
      icon: AlertTriangle,
      accentColor: alertasStock > 0 ? '#e11d48' : '#059669',
      valueClass: alertasStock > 0 ? 'text-danger' : 'text-success',
    },
    {
      id: 'sync',
      label: 'Ultima sincronizacion',
      value: 'Hace 3 min',
      detail: 'Todo en orden',
      icon: CloudCheck,
      accentColor: '#16a34a',
      valueClass: 'text-success',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className={cn(
            'flex min-h-[86px] items-center gap-3.5 rounded-[1.2rem] px-4 py-3',
            'border border-white/70 bg-white/70 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.5)] backdrop-blur-xl',
            'dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none',
          )}
        >
          {/* Icon */}
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `${kpi.accentColor}18`,
            }}
          >
            <kpi.icon className="size-5" style={{ color: kpi.accentColor }} strokeWidth={2} />
          </div>

          {/* Text */}
          <div className="min-w-0">
            <p className="mb-1 text-[12px] font-semibold leading-none text-muted-foreground">
              {kpi.label}
            </p>
            <p className={cn('truncate text-xl font-extrabold leading-tight', kpi.valueClass)}>
              {kpi.value}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
              {kpi.detail}
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
