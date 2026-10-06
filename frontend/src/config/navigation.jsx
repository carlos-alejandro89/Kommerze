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
  Repeat2,
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
    permission: 'reportes.acceder',
  },
  {
    id: 'pos',
    title: 'Terminal POS',
    icon: ShoppingCart,
    path: '/pos',
    permission: 'ventas.acceder',
  },
  {
    id: 'history',
    title: 'Historial',
    icon: History,
    path: '/history',
    permission: 'historial_ventas.acceder',
  },
  {
    id: 'products',
    title: 'Productos',
    icon: Package,
    path: '/products',
    serverOnly: true,
    permission: 'productos.acceder',
  },
  {
    id: 'conversions',
    title: 'Conversiones',
    icon: Repeat2,
    path: '/conversions',
    permission: 'conversiones.acceder',
  },
  {
    id: 'suppliers',
    title: 'Proveedores',
    icon: Handshake,
    path: '/suppliers',
    permission: 'proveedores.acceder',
  },

  // ── Operaciones de Caja ────────────────────────────────────────────────
  {
    id: 'caja-apertura',
    title: 'Apertura de Caja',
    icon: Wallet,
    path: '/caja/apertura',
    group: 'Caja',
    permission: 'cajas.abrir',
  },
  {
    id: 'caja-cierre',
    title: 'Cierre de Caja',
    icon: X,
    path: '/caja/cierre',
    permission: 'cajas.cerrar',
  },
  {
    id: 'sucursal-cortes',
    title: 'Cortes Sucursal',
    icon: Building2,
    path: '/sucursal/cortes',
    serverOnly: true,
    permission: 'operacion_sucursal.acceder',
  },

  // ── Administración ────────────────────────────────────────────────────
  {
    id: 'sync',
    title: 'Sincronización',
    icon: RefreshCw,
    path: '/sync',
    serverOnly: true,
    group: 'Admin',
    permission: 'configuracion.sincronizar',
  },
  {
    id: 'settings',
    title: 'Configuración',
    icon: Settings,
    path: '/settings',
    permission: 'configuracion.acceder',
  },
  // ── Auditoria ────────────────────────────────────────────────────
  {
    id: 'auditoria',
    title: 'Auditoria',
    icon: Settings,
    path: '/auditoria',
    serverOnly: true,
    permission: 'auditorias.acceder',
  },
];
