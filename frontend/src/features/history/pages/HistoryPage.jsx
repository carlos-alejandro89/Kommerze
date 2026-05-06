import { useState } from 'react';
import {
  Search, Filter, Eye, FileText,
  TrendingUp, CheckCircle, Clock, XCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Mock data ── */
const mockOrders = [
  { id: '#ORD-0842', date: '12 Oct 2023', time: '14:30', client: 'Constructora Alfa S.A.', total: 4500.00, status: 'Completado' },
  { id: '#ORD-0841', date: '12 Oct 2023', time: '11:15', client: 'Pinturas Martínez',      total: 1250.50, status: 'Pendiente' },
  { id: '#ORD-0840', date: '11 Oct 2023', time: '16:45', client: 'Cliente Público General',total: 890.00,  status: 'Completado' },
  { id: '#ORD-0839', date: '11 Oct 2023', time: '09:20', client: 'Acabados Especiales SR', total: 3200.00, status: 'Cancelado' },
  { id: '#ORD-0838', date: '10 Oct 2023', time: '17:00', client: 'Ferremax SA de CV',      total: 7800.00, status: 'Completado' },
  { id: '#ORD-0837', date: '10 Oct 2023', time: '13:10', client: 'Cliente Público General', total: 540.00, status: 'Completado' },
];

const statusConfig = {
  'Completado': { icon: CheckCircle, className: 'bg-success/10 text-success border-success/20' },
  'Pendiente':  { icon: Clock,        className: 'bg-warning/10 text-warning border-warning/20' },
  'Cancelado':  { icon: XCircle,      className: 'bg-danger/10  text-danger  border-danger/20'  },
};

const summaryCards = [
  { label: 'Ventas Hoy',   value: '$14,250.00', icon: TrendingUp,    color: 'text-brand-500',  bg: 'bg-brand-500/10' },
  { label: 'Completados',  value: '24',          icon: CheckCircle,   color: 'text-success',    bg: 'bg-success/10'   },
  { label: 'Pendientes',   value: '3',           icon: Clock,         color: 'text-warning',    bg: 'bg-warning/10'   },
];

export function HistoryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const total = 128;

  const filtered = mockOrders.filter(o =>
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.client.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in">
      {/* ── Main content ──────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden p-5 gap-5">

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Gestión de Pedidos</h2>
            <p className="text-sm text-muted-foreground">Revisa y administra el historial de ventas.</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por ID o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-lg border border-border bg-surface pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <button className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <Filter className="size-3.5" />
              Filtrar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-xl border border-border bg-surface flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle">
                  {['ID Pedido', 'Fecha', 'Cliente', 'Total', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((order) => {
                  const sc = statusConfig[order.status];
                  return (
                    <tr key={order.id} className="hover:bg-bg-subtle transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                        {order.id}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        <div>{order.date}</div>
                        <div className="text-xs text-muted-foreground/70">{order.time}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {order.client}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground tabular-nums">
                        ${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                          sc.className,
                        )}>
                          <sc.icon className="size-3" />
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                            <Eye className="size-3" /> Ver
                          </button>
                          <button className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-600 transition-colors">
                            <FileText className="size-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3 shrink-0">
            <p className="text-xs text-muted-foreground">
              Mostrando {filtered.length} de {total} pedidos
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-2 text-xs font-medium text-foreground">{page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Summary ──────────────────────── */}
      <div className="w-[280px] shrink-0 border-l border-border bg-surface flex flex-col gap-4 p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold text-foreground">Resumen del Día</h3>
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-bg-subtle p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <div className={cn('flex size-7 items-center justify-center rounded-lg', card.bg)}>
                <card.icon className={cn('size-3.5', card.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
