import { Navigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

export function PermissionGuard({ permission, children }) {
  const { can } = useAuth();

  if (!can(permission)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
