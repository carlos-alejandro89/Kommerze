import {
  ShoppingCart,
  LayoutDashboard,
  History,
  Package,
  Wallet,
  XCircle,
  Building2,
  RefreshCw,
  Settings,
  Search,
  ClipboardCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ModuleCard } from '../components/ModuleCard';
import { KpiStrip } from '../components/KpiStrip';
import { AppHeader } from '@/layouts/components/AppHeader';
import { HomeStatusBar } from '../components/HomeStatusBar';
import { useActivation } from '@/providers/ActivationProvider';
import { useAuth } from '@/providers/AuthProvider';
import modernPosBackground from '@/assets/retail-home-background.jpg';

/**
 * HomePage — Pantalla principal del ERP Kommerze POS.
 *
 * Interfaz de navegación tipo CarPlay: grid de cards grandes, sin sidebar.
 * Cada card lleva directamente al módulo correspondiente.
 *
 * Layout:
 *   ┌─────────────────────────────┐
 *   │  HomeHeader (h-14)          │
 *   ├─────────────────────────────┤
 *   │  KPI Strip (3 cols)         │
 *   ├─────────────────────────────┤
 *   │  Module Grid (3 cols)       │
 *   │  [Terminal POS x2] [Dash]   │
 *   │  [Historial] [Productos] [Apertura] │
 *   │  [Cierre] [Cortes] [Sync] [Ajustes] │
 *   ├─────────────────────────────┤
 *   │  HomeStatusBar (h-9)        │
 *   └─────────────────────────────┘
 */

/**
 * Definición de módulos con sus metadatos visuales.
 * serverOnly: true → no se muestra en modo Caja
 * cajaOnly: true  → no se muestra en modo Servidor Local
 */
const ALL_MODULES = [
  {
    id: 'pos',
    title: 'Terminal POS',
    subtitle: 'Registrar venta',
    icon: ShoppingCart,
    accentColor: '#0f2f4f',   // navy
    to: '/pos',
    wide: true,               // Ocupa 2 columnas
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Métricas del día',
    icon: LayoutDashboard,
    accentColor: '#7c3aed',   // violet
    to: '/dashboard',
  },
  {
    id: 'history',
    title: 'Historial',
    subtitle: 'Ventas anteriores',
    icon: History,
    accentColor: '#0891b2',   // cyan
    to: '/history',
  },
  {
    id: 'products',
    title: 'Productos',
    subtitle: 'Catálogo e inventario',
    icon: Package,
    accentColor: '#059669',   // emerald
    to: '/products',
    serverOnly: true,
  },
  {
    id: 'caja-apertura',
    title: 'Apertura de Caja',
    subtitle: 'Iniciar turno',
    icon: Wallet,
    accentColor: '#d97706',   // amber
    to: '/caja/apertura',
  },
  {
    id: 'caja-cierre',
    title: 'Cierre de Caja',
    subtitle: 'Cerrar turno',
    icon: XCircle,
    accentColor: '#e11d48',   // rose
    to: '/caja/cierre',
  },
  {
    id: 'sucursal-cortes',
    title: 'Cortes Sucursal',
    subtitle: 'Resumen por sucursal',
    icon: Building2,
    accentColor: '#ea580c',   // orange
    to: '/sucursal/cortes',
    serverOnly: true,
  },
  {
    id: 'sync',
    title: 'Sincronización',
    subtitle: 'Sync con la nube',
    icon: RefreshCw,
    accentColor: '#0284c7',   // sky
    to: '/sync',
    serverOnly: true,
  },
  {
    id: 'settings',
    title: 'Ajustes',
    subtitle: 'Configuración',
    icon: Settings,
    accentColor: '#64748b',   // slate
    to: '/settings',
    serverOnly: true,
  },
  {
    id: 'auditoria',
    title: 'Auditoria',
    subtitle: 'Conteo fisico',
    icon: ClipboardCheck,
    accentColor: '#0f766e',   // teal
    to: '/auditoria',
    serverOnly: true,
  },
];

export function HomePage() {
  const { isCaja, store } = useActivation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar módulos según el rol del dispositivo
  const roleModules = ALL_MODULES.filter((m) => {
    if (m.serverOnly && isCaja) return false;
    if (m.cajaOnly && !isCaja) return false;
    return true;
  });

  const modules = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return roleModules;

    return roleModules.filter((m) => (
      m.title.toLowerCase().includes(q)
      || m.subtitle.toLowerCase().includes(q)
      || m.id.toLowerCase().includes(q)
    ));
  }, [roleModules, searchTerm]);

  const firstName = (user?.Nombre ?? user?.nombre ?? user?.Username ?? user?.username ?? 'Usuario')
    .split(' ')
    .filter(Boolean)[0];
  const storeName = store?.Nombre ?? store?.nombre ?? store?.NombreSucursal ?? store?.nombreSucursal;

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-background"
    >
      {/* ── Header ─────────────────────────────────── */}
      <AppHeader showHomeButton={false} showPageTitle={false} />

      {/* ── Main scrollable area ────────────────────── */}
      <main className="relative flex-1 overflow-y-auto px-6 py-5">
        <img
          src={modernPosBackground}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-white/62 backdrop-blur-[1px] dark:bg-black/58" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(224,234,252,0.36),rgba(248,250,255,0.74),rgba(207,222,243,0.28))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.78),rgba(17,24,39,0.82),rgba(30,41,59,0.66))]" />
        <div className="relative z-[var(--z-layer-base)] mx-auto flex w-full max-w-7xl flex-col gap-5">
          <section className="flex flex-col gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground md:text-3xl">
                ¡Bienvenido, {firstName}!
              </h1>
              <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">
                Kommerze POS{storeName ? ` | ${storeName}` : ''}
              </p>
            </div>
          </section>

          {/* KPI Strip */}
          <KpiStrip
            ventasHoy="$42,850"
            operaciones={34}
            alertasStock={3}
          />

          <div className="max-w-xl">
            <div className="flex items-center rounded-2xl border border-white/45 bg-white/45 px-4 py-2.5 shadow-sm backdrop-blur-md transition-shadow focus-within:bg-white/62 focus-within:shadow-[0_14px_32px_-24px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-white/[0.038] dark:focus-within:bg-white/[0.065] dark:focus-within:shadow-[0_18px_36px_-28px_rgba(0,0,0,1)]">
              <Search className="mr-3 size-4 shrink-0 text-muted-foreground" strokeWidth={2.25} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-7 w-full min-w-0 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/70"
                placeholder="Buscar aplicación..."
                type="text"
              />
              <div className="ml-3 hidden items-center gap-1 sm:flex">
                <span className="rounded border border-black/5 bg-black/5 px-2 py-1 text-[10px] font-bold text-muted-foreground/70 dark:border-white/10 dark:bg-white/[0.06]">
                  Ctrl
                </span>
                <span className="rounded border border-black/5 bg-black/5 px-2 py-1 text-[10px] font-bold text-muted-foreground/70 dark:border-white/10 dark:bg-white/[0.06]">
                  K
                </span>
              </div>
            </div>
          </div>

          {/* Module Grid — Bento launchpad style */}
          <div className="grid auto-rows-[142px] grid-cols-2 gap-3 pb-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
            {modules.length > 0 ? (
              modules.map((mod) => (
                <ModuleCard key={mod.id} {...mod} />
              ))
            ) : (
              <div className="col-span-full rounded-[2rem] border border-white/45 bg-white/45 px-6 py-8 text-center text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.038]">
                No se encontraron módulos para “{searchTerm}”.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Status Bar ──────────────────────────────── */}
      <HomeStatusBar />
    </div>
  );
}
