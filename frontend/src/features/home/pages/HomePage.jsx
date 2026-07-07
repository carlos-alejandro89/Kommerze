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
  MapPin,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModuleCard } from '../components/ModuleCard';
import { KpiStrip } from '../components/KpiStrip';
import { AppHeader } from '@/layouts/components/AppHeader';
import { HomeStatusBar } from '../components/HomeStatusBar';
import { useActivation } from '@/providers/ActivationProvider';
import { useAuth } from '@/providers/AuthProvider';

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
    shortcut: 'F2',
  },
  {
    id: 'history',
    title: 'Historial',
    subtitle: 'Ventas anteriores',
    icon: History,
    accentColor: '#0891b2',   // cyan
    to: '/history',
    shortcut: 'F4',
    status: '25 ventas hoy',
  },
  {
    id: 'products',
    title: 'Productos',
    subtitle: 'Catálogo e inventario',
    icon: Package,
    accentColor: '#059669',   // emerald
    to: '/products',
    serverOnly: true,
    shortcut: 'F3',
    status: '3 agotados',
  },
  {
    id: 'caja-apertura',
    title: 'Apertura de Caja',
    subtitle: 'Iniciar turno',
    icon: Wallet,
    accentColor: '#d97706',   // amber
    to: '/caja/apertura',
    shortcut: 'F6',
  },
  {
    id: 'caja-cierre',
    title: 'Cierre de Caja',
    subtitle: 'Cerrar turno',
    icon: XCircle,
    accentColor: '#e11d48',   // rose
    to: '/caja/cierre',
    shortcut: 'F7',
  },
  {
    id: 'sucursal-cortes',
    title: 'Cortes Sucursal',
    subtitle: 'Resumen por sucursal',
    icon: Building2,
    accentColor: '#ea580c',   // orange
    to: '/sucursal/cortes',
    serverOnly: true,
    shortcut: 'F9',
  },
  {
    id: 'sync',
    title: 'Sincronización',
    subtitle: 'Sync con la nube',
    icon: RefreshCw,
    accentColor: '#0284c7',   // sky
    to: '/sync',
    serverOnly: true,
    shortcut: 'F11',
  },
  {
    id: 'settings',
    title: 'Ajustes',
    subtitle: 'Configuración',
    icon: Settings,
    accentColor: '#64748b',   // slate
    to: '/settings',
    serverOnly: true,
    shortcut: 'F12',
  },
  {
    id: 'auditoria',
    title: 'Auditoria',
    subtitle: 'Conteo fisico',
    icon: ClipboardCheck,
    accentColor: '#0f766e',   // teal
    to: '/auditoria',
    serverOnly: true,
    shortcut: 'F8',
    status: '1 pendiente',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { isCaja, store } = useActivation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleHiddenInventoryImport = (event) => {
      if (event.altKey && event.key === 'F3') {
        event.preventDefault();
        navigate('/inventario/importar-json');
      }
    };

    window.addEventListener('keydown', handleHiddenInventoryImport);
    return () => window.removeEventListener('keydown', handleHiddenInventoryImport);
  }, [navigate]);

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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* ── Header ─────────────────────────────────── */}
      <AppHeader showHomeButton={false} showPageTitle={false} />

      {/* ── Main scrollable area ────────────────────── */}
      <main className="relative flex-1 overflow-y-auto bg-[#f5f8fc] px-6 py-4 dark:bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(219,234,254,0.82),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(224,242,254,0.72),transparent_30%),linear-gradient(135deg,rgba(248,250,252,0.96),rgba(239,246,255,0.9),rgba(248,250,252,0.98))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(30,64,175,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94),rgba(15,23,42,0.98))]" />
        <div className="relative z-[var(--z-layer-base)] mx-auto flex w-full max-w-7xl flex-col gap-4">
          <section className="flex flex-col gap-3">
            <div className="min-w-0 translate-y-0.5">
              <h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground md:text-[28px]">
                Hola, {firstName} 👋
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium uppercase leading-5 text-muted-foreground">
                <MapPin className="size-4 text-primary" strokeWidth={2.3} />
                <span>{storeName ?? 'Sucursal principal'}</span>
                <span className="text-muted-foreground/55">•</span>
                <span>Terminal 01</span>
              </p>
            </div>
          </section>

          {/* KPI Strip */}
          <KpiStrip
            ventasHoy="$42,850"
            operaciones={34}
            alertasStock={3}
          />

          <div>
            <div className="flex items-center rounded-[1.15rem] border border-white/65 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-xl transition-shadow focus-within:bg-white/82 focus-within:shadow-[0_14px_32px_-26px_rgba(15,23,42,0.34)] dark:border-white/10 dark:bg-white/[0.055] dark:focus-within:bg-white/[0.075] dark:focus-within:shadow-none">
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
          <div className="grid auto-rows-[124px] grid-cols-2 gap-3 pb-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
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
