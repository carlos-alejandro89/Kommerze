import {
  BriefcaseBusiness,
  Building2,
  Box,
  CircleEllipsis,
  GalleryVerticalEnd,
  Home,
  RefreshCw,
  ShoppingCart,
  History,
  Settings,
} from 'lucide-react';

export const MAIN_NAV = [

  {
    title: 'Inicio',
    icon: Home,
    path: '/dashboard',
    id: 'dashboard',
  },
  {
    title: 'Ventas',
    icon: ShoppingCart,
    path: '/pos',
    id: 'pos',
  },
  {
    icon: History,
    title: 'Historial',
    path: '/history',
    pinnable: true,
    pinned: true,
    id: 'history',
  },
  {
    icon: Box,
    title: 'Productos',
    path: '/products',
    pinnable: true,
    pinned: true,
    badge: '3',
    id: 'products',
    more: true,
    new: {
      tooltip: 'Crear Producto',
      path: '/products/new',
    },
  },
  {
    icon: GalleryVerticalEnd,
    title: 'Notes',
    path: '/notes',
    pinnable: true,
    pinned: true,
    id: 'notes',
    new: {
      tooltip: 'New Notes',
      path: '/notes',
    },
  },

  {
    icon: Building2,
    title: 'Companies',
    path: '/companies',
    pinnable: true,
    pinned: true,
    id: 'companies',
    new: {
      tooltip: 'New Company',
      path: '/companies',
    },
  },

  {
    icon: BriefcaseBusiness,
    title: 'Company',
    path: '/company',
    pinnable: true,
    pinned: true,
    id: 'company',
  },

  {
    icon: RefreshCw,
    title: 'Synchronization',
    path: '/sync',
    id: 'sync',
  },
  {
    icon: Settings,
    title: 'Ajustes',
    path: '/settings',
    id: 'settings',
  },
  {
    icon: CircleEllipsis,
    title: 'More',
    id: 'more',
    dropdown: true,
  },
];
