import {
  BriefcaseBusiness,
  Building2,
  CheckSquare,
  CircleEllipsis,
  GalleryVerticalEnd,
  Home,
  RefreshCw,
  ShoppingCart,
  Users,
} from 'lucide-react';

export const MAIN_NAV = [
  {
    title: 'Ventas',
    icon: ShoppingCart,
    path: '/pos',
    id: 'pos',
  },
  {
    title: 'Inicio',
    icon: Home,
    path: '/dashboard',
    id: 'dashboard',
  },
  {
    icon: Users,
    title: 'Clientes',
    path: '/contacts',
    pinnable: true,
    pinned: true,
    id: 'clients',
    new: {
      tooltip: 'New Contact',
      path: '/contacts',
    },
  },
  {
    icon: CheckSquare,
    title: 'Tasks',
    path: '/tasks',
    pinnable: true,
    pinned: true,
    badge: '3',
    id: 'tasks',
    more: true,
    new: {
      tooltip: 'New Task',
      path: '/tasks/new',
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
    icon: CircleEllipsis,
    title: 'More',
    id: 'more',
    dropdown: true,
  },
];
