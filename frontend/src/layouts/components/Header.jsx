import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Home, Store, Clock } from 'lucide-react';
import { MAIN_NAV } from '@/config/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';

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
 *  - Izquierda:  Logo Kommerze + botón "← Inicio" (navega a /home)
 *  - Centro:     Título de la página actual + sucursal · terminal
 *  - Derecha:    Reloj en vivo + toggle tema + notificaciones + avatar
 */
export function Header() {
  const { user } = useAuth();
  const { store, operation, license } = useActivation();
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
  const terminalName = operation?.Nombre ?? 'Terminal 01';
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

      {/* ── Izquierda: Logo + Botón Inicio ─────────────── */}
      <div className="flex items-center gap-2 shrink-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Store className="size-3.5 text-primary" strokeWidth={2} />
          </div>
          <span className="text-xs font-bold tracking-tight text-foreground hidden sm:block">
            Kommerze
          </span>
        </div>

        {/* Separador */}
        <div className="h-4 w-px bg-border mx-1" />

        {/* Botón ← Inicio */}
        <button
          onClick={() => navigate('/home')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
            'bg-primary/10 border border-primary/25 text-primary',
            'hover:bg-primary/20 hover:border-primary/45',
            'transition-all duration-150',
          )}
          aria-label="Volver al inicio"
        >
          <Home className="size-3.5" strokeWidth={2.2} />
          <span>Inicio</span>
        </button>
      </div>

      {/* ── Centro: Título de página ────────────────────── */}
      <div className="absolute inset-x-0 flex flex-col items-center pointer-events-none">
        <h1 className="text-[13px] font-semibold text-foreground leading-tight">
          {pageTitle}
        </h1>
        <p className="text-[10px] text-muted-foreground leading-none">
          {storeName} · {terminalName}
        </p>
      </div>

      {/* ── Derecha: Reloj + Tema + Notif + Avatar ───────── */}
      <div className="flex items-center gap-1.5 shrink-0 z-10">
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
