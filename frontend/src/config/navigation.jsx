import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Package,
  RefreshCw,
  Settings,
} from 'lucide-react';

/**
 * Main navigation items for the sidebar.
 * path: absolute route path
 * id:   unique identifier for active state matching
 */
export const MAIN_NAV = [
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
    badge: '3',
  },
  {
    id: 'sync',
    title: 'Sincronización',
    icon: RefreshCw,
    path: '/sync',
  },
  {
    id: 'settings',
    title: 'Ajustes',
    icon: Settings,
    path: '/settings',
  },
];
