import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { DeviceGuard } from '@/components/DeviceGuard';
import { AuditoriaGuard } from '@/components/AuditoriaGuard';
import { TurnoGuard } from '@/components/TurnoGuard';
import { ScreenLoader } from '@/components/ScreenLoader';
import { useActivation } from '@/providers/ActivationProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { AuditoriaProvider } from '@/providers/AuditoriaProvider';

// Guard para rutas exclusivas del Servidor Local
function ServerOnlyGuard({ children }) {
  const { isCaja } = useActivation();
  if (isCaja) return <Navigate to="/home" replace />;
  return children;
}

// ── Lazy Pages ──────────────────────────────────────────────────────────────
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const LicenseActivationPage = lazy(() => import('@/features/license/pages/LicenseActivationPage').then(m => ({ default: m.LicenseActivationPage })));
const DeviceRolePage = lazy(() => import('@/features/device-setup/pages/DeviceRolePage').then(m => ({ default: m.DeviceRolePage })));
const LocalServerSetupPage = lazy(() => import('@/features/device-setup/pages/LocalServerSetupPage').then(m => ({ default: m.LocalServerSetupPage })));
const DatabaseSetupPage = lazy(() => import('@/features/device-setup/pages/DatabaseSetupPage').then(m => ({ default: m.DatabaseSetupPage })));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const POSPage = lazy(() => import('@/features/pos/pages/POSPage'));
const TransactionPage = lazy(() => import('@/features/pos/pages/TransactionPage').then(m => ({ default: m.TransactionPage })));
const PaymentPage = lazy(() => import('@/features/pos/pages/PaymentPage').then(m => ({ default: m.PaymentPage })));
const OrderPlacedPage = lazy(() => import('@/features/pos/pages/OrderPlacedPage').then(m => ({ default: m.OrderPlacedPage })));
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const CreateProductPage = lazy(() => import('@/features/products/pages/CreateProductPage').then(m => ({ default: m.CreateProductPage })));
const HistoryPage = lazy(() => import('@/features/history/pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SyncPage = lazy(() => import('@/features/sync/pages/SyncPage').then(m => ({ default: m.SyncPage })));
const InventoryImportPage = lazy(() => import('@/features/inventory-import/pages/InventoryImportPage').then(m => ({ default: m.InventoryImportPage })));
const AperturaCajaPage = lazy(() => import('@/features/pos/pages/AperturaCajaPage').then(m => ({ default: m.AperturaCajaPage })));
const CierreCajaPage = lazy(() => import('@/features/pos/pages/CierreCajaPage').then(m => ({ default: m.CierreCajaPage })));
const CortesSucursalPage = lazy(() => import('@/features/pos/pages/CortesSucursalPage').then(m => ({ default: m.CortesSucursalPage })));
const HomePage = lazy(() => import('@/features/home/pages/HomePage').then(m => ({ default: m.HomePage })));
const AuditoriaPage = lazy(() => import('@/features/audit/pages/AuditoriaPage').then(m => ({ default: m.AuditoriaPage })));

// ── Suspense Wrapper ─────────────────────────────────────────────────────────
function SuspensePage({ children }) {
  return <Suspense fallback={<ScreenLoader />}>{children}</Suspense>;
}

// Guard de turno para el POS — verifica jornada + turno abierto antes de renderizar
function PosGuard({ children }) {
  return (
    <TurnoGuard>
      <SuspensePage>{children}</SuspensePage>
    </TurnoGuard>
  );
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
        {
          path: '/device-setup/database',
          element: <SuspensePage><DatabaseSetupPage /></SuspensePage>,
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
            <AuditoriaProvider>
              <AuditoriaGuard>
                <NotificationProvider>
                  <AppLayout />
                </NotificationProvider>
              </AuditoriaGuard>
            </AuditoriaProvider>
          </AuthGuard>
        </DeviceGuard>
      ),
      children: [
        { index: true, element: <Navigate to="/home" replace /> },
        {
          path: '/home',
          element: <SuspensePage><HomePage /></SuspensePage>,
        },
        {
          path: '/dashboard',
          element: <SuspensePage><DashboardPage /></SuspensePage>,
        },
        {
          path: '/pos',
          element: <PosGuard><POSPage /></PosGuard>,
        },
        {
          path: '/pos/transaction',
          element: <PosGuard><TransactionPage /></PosGuard>,
        },
        {
          path: '/pos/payment',
          element: <PosGuard><PaymentPage /></PosGuard>,
        },
        {
          path: '/pos/order-placed',
          element: <PosGuard><OrderPlacedPage /></PosGuard>,
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
          element: (
            <ServerOnlyGuard>
              <SuspensePage><SyncPage /></SuspensePage>
            </ServerOnlyGuard>
          ),
        },
        {
          path: '/inventario/importar-json',
          element: (
            <ServerOnlyGuard>
              <SuspensePage><InventoryImportPage /></SuspensePage>
            </ServerOnlyGuard>
          ),
        },
        // ── Operaciones de Caja y Sucursal ──────────────────────────────
        {
          path: '/caja/apertura',
          element: <SuspensePage><AperturaCajaPage /></SuspensePage>,
        },
        {
          path: '/caja/cierre',
          element: <SuspensePage><CierreCajaPage /></SuspensePage>,
        },
        {
          path: '/sucursal/cortes',
          element: (
            <ServerOnlyGuard>
              <SuspensePage><CortesSucursalPage /></SuspensePage>
            </ServerOnlyGuard>
          ),
        },
        {
          path: '/auditoria',
          element: (
            <ServerOnlyGuard>
              <SuspensePage><AuditoriaPage /></SuspensePage>
            </ServerOnlyGuard>
          ),
        },
      ],
    },

    // ── Catch-all ─────────────────────────────────────────────────────────
    {
      path: '*',
      element: <Navigate to="/home" replace />,
    },
  ],
  {
    basename: import.meta.env.VITE_BASE_URL || '/',
  },
);
