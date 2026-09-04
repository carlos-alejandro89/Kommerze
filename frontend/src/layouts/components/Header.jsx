import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Clock } from 'lucide-react';
import { MAIN_NAV } from '@/config/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';
import { WebSocketStatusIndicator } from '@/components/WebSocketStatusIndicator';

const THEME_KEY = 'kommerze-theme';

/** Toggle dark mode por preferencia del usuario o del sistema */
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, setDark];
}

/**
 * Header — Barra superior adaptada al tema del sistema (claro / oscuro).
 *
 * Usa tokens CSS del design system via clases Tailwind:
 *   bg-surface, border-border, text-foreground, text-muted-foreground, etc.
 *
 * Estructura:
 *  - Izquierda:  Logo Kommerze (navega a /home)
 *  - Centro:     Título de la página actual + sucursal · terminal
 *  - Derecha:    Reloj en vivo + toggle tema + notificaciones + avatar
 */
export function Header() {
  const { user } = useAuth();
  const { store, license, deviceName } = useActivation();
  const location = useLocation();
  const navigate = useNavigate();
  const [dark, setDark] = useDarkMode();
  const [now, setNow] = useState(new Date());

  // Reloj en vivo — actualiza cada segundo
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Título de página desde el config de navegación
  const currentNav = MAIN_NAV
    .filter(n => location.pathname.startsWith(n.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  const pageTitle = currentNav?.title ?? 'Kommerze POS';

  // Datos contextuales
  const storeName = store?.Nombre ?? license?.sucursal?.nombreSucursal ?? 'Kommerze';
  const terminalName = deviceName || 'Dispositivo';
  const userName = user?.Nombre ?? user?.CorreoElectronico ?? 'Usuario';

  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

  // Iniciales para el avatar
  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between px-4 border-b border-border bg-surface">

      {/* ── Izquierda: marca y acceso al inicio ────────── */}
      <button
        type="button"
        onClick={() => navigate('/home')}
        className="group flex shrink-0 items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        aria-label="Ir al inicio"
      >
        <img src="/media/app_icon.png" alt="" className="size-8 rounded-[9px] object-cover shadow-sm transition-transform group-hover:scale-[1.03]" />
        <span className="hidden text-sm font-bold tracking-[-0.025em] text-foreground sm:block">Kommerze</span>
      </button>

      {/* ── Centro: Título de página ────────────────────── */}
      <div className="absolute inset-x-0 flex flex-col items-center pointer-events-none">
        <h1 className="text-[13px] font-semibold text-foreground leading-tight">
          {pageTitle}
        </h1>
        <p className="flex items-center gap-1.5 text-[10px] leading-none text-muted-foreground">
          <span>{storeName} · {terminalName}</span>
          <WebSocketStatusIndicator />
        </p>
      </div>

      {/* ── Derecha: Reloj + Tema + Notif + Avatar ───────── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Reloj */}
        <div className="hidden md:flex items-center gap-1.5 mr-1">
          <Clock className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
          <div className="text-right">
            <p className="text-[12px] font-semibold text-foreground leading-none">
              {timeStr}
            </p>
            <p className="text-[9px] text-muted-foreground leading-none capitalize">
              {dateStr}
            </p>
          </div>
        </div>

        {/* Toggle tema claro/oscuro */}
        <button
          onClick={() => setDark(v => !v)}
          className={cn(
            'flex size-8 items-center justify-center rounded-lg',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            'transition-colors duration-150',
          )}
          aria-label="Cambiar tema"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* Notificaciones */}
        <NotificationBell />

        {/* Avatar */}
        <div
          className={cn(
            'flex size-8 items-center justify-center rounded-full',
            'bg-primary text-xs font-bold text-primary-foreground',
            'select-none',
          )}
          title={userName}
        >
          {initials || '?'}
        </div>
      </div>
    </header>
  );
}
