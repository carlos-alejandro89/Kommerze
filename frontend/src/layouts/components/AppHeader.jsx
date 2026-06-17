import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Store, Clock, Home, Sun, Moon, LogOut, User, ChevronDown } from 'lucide-react';
import { MAIN_NAV } from '@/config/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';

const THEME_KEY = 'kommerze-theme';

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, setDark];
}

/**
 * AppHeader — Header unificado para toda la aplicación.
 *
 * Usa exclusivamente tokens del design system (bg-surface, border-border, etc.)
 * para adaptarse correctamente al tema claro/oscuro.
 *
 * Props:
 *   showHomeButton  boolean  — muestra el botón "← Inicio" (false en /home)
 *   showPageTitle   boolean  — muestra el título de la ruta activa (false en /home)
 *
 * Estructura:
 *   Izquierda │ Logo Kommerze [+ botón Inicio]
 *   Centro    │ [Título de página +] Sucursal · Terminal
 *   Derecha   │ Reloj · Toggle Tema · Notificaciones · UserMenu (dropdown + logout)
 */
export function AppHeader({ showHomeButton = true, showPageTitle = true }) {
  const { user, logout } = useAuth();
  const { store, operation, license } = useActivation();
  const location = useLocation();
  const navigate = useNavigate();
  const [dark, setDark] = useDarkMode();
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Reloj en vivo
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Título de página desde config de navegación
  const currentNav = MAIN_NAV
    .filter(n => location.pathname.startsWith(n.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  const pageTitle = currentNav?.title ?? '';

  // Datos de contexto
  const storeName    = store?.Nombre ?? license?.sucursal?.nombreSucursal ?? 'Kommerze';
  const terminalName = operation?.Nombre ?? 'Terminal 01';
  const userName     = user?.Nombre ?? user?.CorreoElectronico ?? 'Usuario';
  const userEmail    = user?.CorreoElectronico ?? '';

  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between px-4 border-b border-border bg-surface">

      {/* ── Izquierda: Logo + botón Inicio ────────────── */}
      <div className="flex items-center gap-2 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Store className="size-3.5 text-primary" strokeWidth={2} />
          </div>
          <span className="text-xs font-bold tracking-tight text-foreground hidden sm:block">
            Kommerze
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hidden sm:block">
            POS
          </span>
        </div>

        {showHomeButton && (
          <>
            <div className="h-4 w-px bg-border mx-1" />
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
          </>
        )}
      </div>

      {/* ── Centro: Título + Sucursal/Terminal ─────────── */}
      <div className="absolute inset-x-0 flex flex-col items-center pointer-events-none">
        {showPageTitle && pageTitle && (
          <h1 className="text-[13px] font-semibold text-foreground leading-tight">
            {pageTitle}
          </h1>
        )}
        <p className="text-[10px] text-muted-foreground leading-none">
          {storeName} · {terminalName}
        </p>
      </div>

      {/* ── Derecha: Reloj + Tema + Notif + UserMenu ────── */}
      <div className="flex items-center gap-1.5 shrink-0 z-10">
        {/* Reloj */}
        <div className="hidden md:flex items-center gap-1.5 mr-1">
          <Clock className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />
          <div className="text-right">
            <p className="text-[12px] font-semibold text-foreground leading-none">{timeStr}</p>
            <p className="text-[9px] text-muted-foreground leading-none capitalize">{dateStr}</p>
          </div>
        </div>

        {/* Toggle tema */}
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

        {/* ── User dropdown ──────────────────────────────── */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-2.5 py-1.5',
              'bg-muted/60 border border-border',
              'hover:bg-muted transition-all duration-150',
            )}
            aria-label="Menú de usuario"
            aria-expanded={menuOpen}
          >
            <div className="flex size-6 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30 text-[10px] font-bold text-primary shrink-0">
              {initials || <User className="size-3.5" />}
            </div>
            <span className="text-[12px] font-medium text-foreground max-w-[110px] truncate hidden sm:block">
              {userName}
            </span>
            <ChevronDown
              className={cn(
                'size-3 shrink-0 text-muted-foreground transition-transform duration-200 hidden sm:block',
                menuOpen && 'rotate-180',
              )}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className={cn(
              'absolute right-0 top-[calc(100%+6px)] w-56 z-50',
              'rounded-xl border border-border bg-surface-raised shadow-xl shadow-black/20',
              'animate-slide-up overflow-hidden',
            )}>
              {/* Info usuario */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30 text-sm font-bold text-primary shrink-0">
                    {initials || <User className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                    {userEmail && (
                      <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cerrar sesión */}
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2',
                    'text-sm font-medium text-danger',
                    'hover:bg-danger/10 transition-colors duration-150',
                  )}
                >
                  <LogOut className="size-4 shrink-0" strokeWidth={2} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
