import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { TurnoProvider } from '@/providers/TurnoProvider';

/**
 * AppLayout — Layout protegido sin sidebar.
 *
 * Estructura para todas las rutas excepto /home:
 *   ┌──────────────────────────────┐
 *   │  Header (h-14, dark glass)   │
 *   ├──────────────────────────────┤
 *   │  <main> — contenido de ruta  │
 *   └──────────────────────────────┘
 *
 * Rutas fullscreen (sin Header — layout propio):
 *   - /home → HomePage (CarPlay launcher)
 *
 * TurnoProvider envuelve el Outlet para que todas las páginas protegidas
 * (incluyendo el POS) puedan consumir el estado del turno del cajero.
 */

/** Rutas que renderizan sin header — tienen su propio layout fullscreen. */
const FULLSCREEN_ROUTES = ['/home'];

export function AppLayout() {
  const { pathname } = useLocation();

  const isFullscreen = FULLSCREEN_ROUTES.some(
    r => pathname === r || pathname.startsWith(`${r}/`),
  );

  // Modo fullscreen: solo el Outlet (HomePage tiene su propio Header)
  if (isFullscreen) {
    return (
      <TurnoProvider>
        <Outlet />
      </TurnoProvider>
    );
  }

  // Layout estándar: Header + área de contenido
  return (
    <TurnoProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
        <AppHeader />
        <main className="flex-1 overflow-y-auto bg-bg-subtle">
          <Outlet />
        </main>
      </div>
    </TurnoProvider>
  );
}
