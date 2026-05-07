import { Navigate, useLocation } from 'react-router-dom';
import { useActivation } from '@/providers/ActivationProvider';
import { ScreenLoader } from '@/components/ScreenLoader';

/**
 * DeviceGuard — protege todas las rutas que requieren un rol configurado.
 * Vive dentro del RouterProvider para poder usar useNavigate/Navigate.
 *
 * Flujo:
 *   1. Sin rol          → /device-setup/role
 *   2. Caja sin URL     → /device-setup/local-server
 *   3. Con rol OK       → deja pasar
 */
export function DeviceGuard({ children }) {
  const { deviceRole, localServerURL, isInitialized } = useActivation();
  const location = useLocation();

  // Aún cargando la configuración → mostrar loader
  if (!isInitialized) {
    return <ScreenLoader />;
  }

  // Sin rol configurado → setup de rol
  if (!deviceRole) {
    return <Navigate to="/device-setup/role" state={{ from: location }} replace />;
  }

  // Caja sin URL del Servidor Local → configurar conexión
  if (deviceRole === 'caja' && !localServerURL) {
    return <Navigate to="/device-setup/local-server" state={{ from: location }} replace />;
  }

  return children;
}
