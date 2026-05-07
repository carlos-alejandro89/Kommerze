import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { DeviceGuard } from '@/components/DeviceGuard';
import { ScreenLoader } from '@/components/ScreenLoader';

// ── Lazy Pages ──────────────────────────────────────────────────────────────
const LoginPage             = lazy(() => import('@/features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const LicenseActivationPage = lazy(() => import('@/features/license/pages/LicenseActivationPage').then(m => ({ default: m.LicenseActivationPage })));
const DeviceRolePage        = lazy(() => import('@/features/device-setup/pages/DeviceRolePage').then(m => ({ default: m.DeviceRolePage })));
const LocalServerSetupPage  = lazy(() => import('@/features/device-setup/pages/LocalServerSetupPage').then(m => ({ default: m.LocalServerSetupPage })));
const DashboardPage         = lazy(() => import('@/features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const POSPage               = lazy(() => import('@/features/pos/pages/POSPage'));
const TransactionPage       = lazy(() => import('@/features/pos/pages/TransactionPage').then(m => ({ default: m.TransactionPage })));
const PaymentPage           = lazy(() => import('@/features/pos/pages/PaymentPage').then(m => ({ default: m.PaymentPage })));
const OrderPlacedPage       = lazy(() => import('@/features/pos/pages/OrderPlacedPage').then(m => ({ default: m.OrderPlacedPage })));
const ProductsPage          = lazy(() => import('@/features/products/pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const CreateProductPage     = lazy(() => import('@/features/products/pages/CreateProductPage').then(m => ({ default: m.CreateProductPage })));
const HistoryPage           = lazy(() => import('@/features/history/pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const SettingsPage          = lazy(() => import('@/features/settings/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SyncPage              = lazy(() => import('@/features/sync/pages/SyncPage').then(m => ({ default: m.SyncPage })));

// ── Suspense Wrapper ─────────────────────────────────────────────────────────
function SuspensePage({ children }) {
  return <Suspense fallback={<ScreenLoader />}>{children}</Suspense>;
}

// ── Router Definition ────────────────────────────────────────────────────────
export const router = createBrowserRouter(
  [
    // ── Device setup (no guard) ───────────────────────────────────────────
    // Estas rutas son accesibles antes de tener un rol configurado
    {
      element: <AuthLayout />,
      children: [
        {
          path: '/device-setup/role',
          element: <SuspensePage><DeviceRolePage /></SuspensePage>,
        },
        {
          path: '/device-setup/local-server',
          element: <SuspensePage><LocalServerSetupPage /></SuspensePage>,
        },
      ],
    },

    // ── Auth routes (requieren rol, no sidebar) ───────────────────────────
    {
      element: (
        <DeviceGuard>
          <AuthLayout />
        </DeviceGuard>
      ),
      children: [
        {
          path: '/login',
          element: <SuspensePage><LoginPage /></SuspensePage>,
        },
        {
          path: '/license/activate',
          element: <SuspensePage><LicenseActivationPage /></SuspensePage>,
        },
      ],
    },

    // ── Protected routes (requieren rol + auth, con sidebar) ──────────────
    {
      element: (
        <DeviceGuard>
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        </DeviceGuard>
      ),
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        {
          path: '/dashboard',
          element: <SuspensePage><DashboardPage /></SuspensePage>,
        },
        {
          path: '/pos',
          element: <SuspensePage><POSPage /></SuspensePage>,
        },
        {
          path: '/pos/transaction',
          element: <SuspensePage><TransactionPage /></SuspensePage>,
        },
        {
          path: '/pos/payment',
          element: <SuspensePage><PaymentPage /></SuspensePage>,
        },
        {
          path: '/pos/order-placed',
          element: <SuspensePage><OrderPlacedPage /></SuspensePage>,
        },
        {
          path: '/products',
          element: <SuspensePage><ProductsPage /></SuspensePage>,
        },
        {
          path: '/products/new',
          element: <SuspensePage><CreateProductPage /></SuspensePage>,
        },
        {
          path: '/history',
          element: <SuspensePage><HistoryPage /></SuspensePage>,
        },
        {
          path: '/settings',
          element: <SuspensePage><SettingsPage /></SuspensePage>,
        },
        {
          path: '/sync',
          element: <SuspensePage><SyncPage /></SuspensePage>,
        },
      ],
    },

    // ── Catch-all ─────────────────────────────────────────────────────────
    {
      path: '*',
      element: <Navigate to="/dashboard" replace />,
    },
  ],
  {
    basename: import.meta.env.VITE_BASE_URL || '/',
  },
);
