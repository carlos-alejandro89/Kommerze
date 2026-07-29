import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Mail,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ServiceListarClientes } from '../../../../wailsjs/go/main/App';

const PAGE_SIZE = 10;

const money = value => Number(value || 0).toLocaleString('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'CL';
}

const avatarStyles = [
  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
];

export function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setClients(await ServiceListarClientes() || []);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(client =>
      [client.RazonSocial, client.RFC, client.Telefono, client.Correo]
        .some(value => String(value || '').toLowerCase().includes(query)),
    );
  }, [clients, search]);

  useEffect(() => setPage(1), [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageClients = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const withCredit = clients.filter(client => Number(client.CreditoMaximo) > 0);
  const totalCredit = withCredit.reduce((total, client) => total + Number(client.CreditoMaximo || 0), 0);
  const completeContact = clients.filter(client => client.Correo && client.Telefono).length;

  const summaries = [
    { label: 'Total clientes', value: clients.length, detail: 'Clientes registrados', icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Con crédito', value: withCredit.length, detail: clients.length ? `${Math.round((withCredit.length / clients.length) * 100)}% del total` : 'Sin registros', icon: CreditCard, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Crédito autorizado', value: money(totalCredit), detail: 'Límite acumulado', icon: WalletCards, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Contacto completo', value: completeContact, detail: 'Con teléfono y correo', icon: Mail, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  ];

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-hidden p-5 lg:p-6">
        <div className="shrink-0">
          <nav className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <button type="button" onClick={() => navigate('/home')} className="transition hover:text-primary">Home</button>
            <span>/</span>
            <span className="text-foreground">Clientes</span>
          </nav>
          <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="size-6" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">Clientes</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">Gestiona la información y condiciones comerciales de tus clientes.</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/home')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-xs font-semibold text-foreground transition hover:bg-muted">
              <ArrowLeft className="size-4" />
              Volver al inicio
            </button>
          </header>
        </div>

        <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
          {summaries.map(summary => (
            <div key={summary.label} className="flex min-h-[92px] items-center gap-3.5 rounded-2xl border border-white/70 bg-white/65 p-4 shadow-[0_12px_32px_-27px_rgba(30,64,120,.42)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.045]">
              <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', summary.bg)}>
                <summary.icon className={cn('size-5', summary.color)} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground">{summary.label}</p>
                {loading
                  ? <div className="mt-1 h-6 w-20 animate-pulse rounded-md bg-muted" />
                  : <p className="mt-0.5 truncate text-xl font-bold tracking-[-0.025em] text-foreground">{summary.value}</p>}
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground/75">{summary.detail}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/55 p-2.5 shadow-[0_12px_34px_-29px_rgba(30,64,120,.4)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.035]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#6481ad]" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar por nombre, RFC, teléfono o correo…"
                className="h-10 w-full rounded-xl border border-[#dce7f6] bg-white/85 pl-10 pr-3 text-sm font-medium text-[#1b3154] outline-none transition placeholder:text-[#7790b6] focus:border-blue-300/80 focus:ring-2 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/[.065] dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <button type="button" onClick={loadClients} disabled={loading} className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/75 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40" title="Actualizar clientes">
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/clients/new')}
            className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-4 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105"
          >
            <UserPlus className="size-4" />
            Nuevo cliente
          </button>
        </section>

        <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
          {error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-red-500/10"><AlertCircle className="size-6 text-red-500" /></div>
              <p className="text-sm font-semibold text-foreground">No se pudo cargar el catálogo de clientes</p>
              <p className="max-w-md text-xs text-muted-foreground">{error}</p>
              <button onClick={loadClients} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Reintentar</button>
            </div>
          ) : loading ? (
            <div className="flex-1 space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-11 animate-pulse rounded-lg bg-muted/70" />)}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="sticky top-0 border-b border-border/70 bg-slate-50/95 backdrop-blur dark:bg-white/[.055]">
                      {['Cliente', 'RFC', 'Teléfono', 'Correo', 'Crédito disponible', 'Días crédito', 'Estatus', 'Acciones'].map(title => (
                        <th key={title} className="whitespace-nowrap px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/65">
                    {pageClients.map((client, index) => (
                      <tr key={client.Guid || client.ID} className="group transition-colors hover:bg-blue-50/40 dark:hover:bg-white/[.035]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', avatarStyles[(index + safePage) % avatarStyles.length])}>{initials(client.RazonSocial)}</span>
                            <span className="max-w-[230px] truncate font-semibold text-foreground">{client.RazonSocial || 'Sin razón social'}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs font-medium text-muted-foreground">{client.RFC || '—'}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-foreground">
                          <span className="inline-flex items-center gap-1.5"><Phone className="size-3 text-muted-foreground" />{client.Telefono || '—'}</span>
                        </td>
                        <td className="max-w-[240px] truncate px-5 py-3 text-xs text-foreground">
                          <span className="inline-flex max-w-full items-center gap-1.5"><Mail className="size-3 shrink-0 text-muted-foreground" /><span className="truncate">{client.Correo || '—'}</span></span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{money(client.CreditoMaximo)}</td>
                        <td className="px-5 py-3 text-center text-xs font-semibold text-foreground">{client.DiasCredito || 0}</td>
                        <td className="px-5 py-3"><span className="rounded-full border border-emerald-500/15 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Activo</span></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => toast.info(client.RazonSocial)} className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground transition hover:border-primary/30 hover:text-primary" title="Ver cliente"><Eye className="size-3.5" /></button>
                            <button onClick={() => navigate(`/clients/${client.Guid}/edit`, { state: { client } })} className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground transition hover:border-primary/30 hover:text-primary" title="Editar cliente"><MoreVertical className="size-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pageClients.length === 0 && (
                      <tr><td colSpan={8} className="py-16 text-center text-sm text-muted-foreground">{search ? 'No encontramos clientes para esta búsqueda.' : 'No hay clientes registrados.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <footer className="flex shrink-0 items-center justify-between border-t border-border/70 bg-background/35 px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  {filtered.length ? `Mostrando ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length} clientes` : 'Sin resultados'}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(value => Math.max(1, value - 1))} disabled={safePage === 1} className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground disabled:opacity-40"><ChevronLeft className="size-4" /></button>
                  <span className="min-w-16 text-center text-xs font-semibold text-foreground">{safePage} / {totalPages}</span>
                  <button onClick={() => setPage(value => Math.min(totalPages, value + 1))} disabled={safePage === totalPages} className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground disabled:opacity-40"><ChevronRight className="size-4" /></button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
