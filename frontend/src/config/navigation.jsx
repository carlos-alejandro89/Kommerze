import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Package,
  RefreshCw,
  Settings,
  Wallet,
  X,
  Building2,
  Handshake,
} from 'lucide-react';

/**
 * Main navigation items for the sidebar.
 *
 * Fields:
 *  path:        absolute route path
 *  id:          unique identifier for active state matching
 *  serverOnly:  if true, only shown in Servidor Local mode
 *  cajaOnly:    if true, only shown in Caja mode
 *  group:       optional label for visual grouping (divider + label)
 */
export const MAIN_NAV = [
  // ── POS General ──────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'pos',
    title: 'Terminal POS',
    icon: ShoppingCart,
    path: '/pos',
  },
  {
    id: 'history',
    title: 'Historial',
    icon: History,
    path: '/history',
  },
  {
    id: 'products',
    title: 'Productos',
    icon: Package,
    path: '/products',
    serverOnly: true,
  },
  {
    id: 'suppliers',
    title: 'Proveedores',
    icon: Handshake,
    path: '/suppliers',
  },

  // ── Operaciones de Caja ────────────────────────────────────────────────
  {
    id: 'caja-apertura',
    title: 'Apertura de Caja',
    icon: Wallet,
    path: '/caja/apertura',
    group: 'Caja',
  },
  {
    id: 'caja-cierre',
    title: 'Cierre de Caja',
    icon: X,
    path: '/caja/cierre',
  },
  {
    id: 'sucursal-cortes',
    title: 'Cortes Sucursal',
    icon: Building2,
    path: '/sucursal/cortes',
    serverOnly: true,
  },

  // ── Administración ────────────────────────────────────────────────────
  {
    id: 'sync',
    title: 'Sincronización',
    icon: RefreshCw,
    path: '/sync',
    serverOnly: true,
    group: 'Admin',
  },
  {
    id: 'settings',
    title: 'Configuración',
    icon: Settings,
    path: '/settings',
  },
  // ── Auditoria ────────────────────────────────────────────────────
  {
    id: 'auditoria',
    title: 'Auditoria',
    icon: Settings,
    path: '/auditoria',
    serverOnly: true,
  },
];
