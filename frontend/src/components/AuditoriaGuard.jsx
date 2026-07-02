import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { ScreenLoader } from '@/components/ScreenLoader';
import { useAuditoria } from '@/providers/AuditoriaProvider';

export function AuditoriaGuard({ children }) {
    const location = useLocation();
    const { auditoriaLoading, existeAuditoria } = useAuditoria();

    if (auditoriaLoading) {
        return <ScreenLoader />;
    }

    if (existeAuditoria && location.pathname !== '/auditoria') {
        return <Navigate to="/auditoria" state={{ from: location }} replace />;
    }

    return children ?? <Outlet />;
}
