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
} from 'lucide-react';
import { ModuleCard } from '../components/ModuleCard';
import { KpiStrip } from '../components/KpiStrip';
import { AppHeader } from '@/layouts/components/AppHeader';
import { HomeStatusBar } from '../components/HomeStatusBar';
import { useActivation } from '@/providers/ActivationProvider';

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
    accentColor: '#4f46e5',   // indigo
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
  },
  {
    id: 'auditoria',
    title: 'Auditoria',
    subtitle: 'Auditoria',
    icon: Settings,
    accentColor: '#64748b',   // slate
    to: '/auditoria',
  },
];

export function HomePage() {
  const { isCaja } = useActivation();

  // Filtrar módulos según el rol del dispositivo
  const modules = ALL_MODULES.filter((m) => {
    if (m.serverOnly && isCaja) return false;
    if (m.cajaOnly && !isCaja) return false;
    return true;
  });

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-background"
    >
      {/* ── Header ─────────────────────────────────── */}
      <AppHeader showHomeButton={false} showPageTitle={false} />

      {/* ── Main scrollable area ────────────────────── */}
      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* KPI Strip */}
        <KpiStrip
          ventasHoy="$42,850"
          operaciones={34}
          alertasStock={3}
        />

        {/* Module Grid — 3 columns */}
        <div className="grid grid-cols-6 gap-3 auto-rows-[160px]">
          {modules.map((mod) => (
            <ModuleCard key={mod.id} {...mod} />
          ))}
        </div>
      </main>

      {/* ── Status Bar ──────────────────────────────── */}
      <HomeStatusBar />
    </div>
  );
}
