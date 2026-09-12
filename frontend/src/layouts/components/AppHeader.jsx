import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, Sun, Moon, LogOut, User, ChevronDown, Users, ReceiptText, Truck, Handshake, Settings, ClipboardCheck, Building2, ShoppingCart, Repeat2 } from 'lucide-react';
import { MAIN_NAV } from '@/config/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';
import { WebSocketStatusIndicator } from '@/components/WebSocketStatusIndicator';

const THEME_KEY = 'kommerze-theme';

const MODULE_CONTEXTS = [
  { path: '/purchases/history', title: 'Historial de compras', subtitle: 'Compras manuales y documentos cargados mediante XML', icon: ShoppingCart, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { path: '/sucursal/cortes', title: 'Operación de sucursal', subtitle: 'Inicio, seguimiento y cierre de operaciones', icon: Building2, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { path: '/conversions', title: 'Conversiones', subtitle: 'Movimientos entre presentaciones y equivalencias', icon: Repeat2, tone: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  { path: '/suppliers', title: 'Proveedores', subtitle: 'Entidades y datos fiscales de proveedores', icon: Handshake, tone: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { path: '/transfers', title: 'Transferencias', subtitle: 'Envío y recepción de productos entre sucursales', icon: Truck, tone: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  { path: '/history', title: 'Historial de ventas', subtitle: 'Consulta y seguimiento de ventas y cotizaciones', icon: ReceiptText, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { path: '/clients', title: 'Clientes', subtitle: 'Información y condiciones comerciales de clientes', icon: Users, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { path: '/auditoria', title: 'Auditoría', subtitle: 'Conteo y conciliación del inventario', icon: ClipboardCheck, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { path: '/settings', title: 'Configuración', subtitle: 'Dispositivo, tickets y servicios de Kommerze', icon: Settings, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
];

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
 *   showPageTitle   boolean  — muestra el título de la ruta activa (false en /home)
 *
 * Estructura:
 *   Izquierda │ Logo Kommerze (acceso al inicio)
 *   Centro    │ [Título de página +] Sucursal · Terminal
 *   Derecha   │ Reloj · Toggle Tema · Notificaciones · UserMenu (dropdown + logout)
 */
export function AppHeader({ showPageTitle = true }) {
  const { user, logout } = useAuth();
  const { store, license, deviceName } = useActivation();
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
  const moduleContext = MODULE_CONTEXTS.find(item => location.pathname.startsWith(item.path));
  const ModuleIcon = moduleContext?.icon;

  // Datos de contexto
  const storeName    = store?.Nombre ?? license?.sucursal?.nombreSucursal ?? 'Kommerze';
  const terminalName = deviceName || 'Dispositivo';
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

      {/* ── Izquierda: marca y acceso al inicio ───────── */}
      {moduleContext ? (
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <button type="button" onClick={() => navigate('/home')} className="group flex size-9 shrink-0 items-center justify-center rounded-xl transition hover:bg-muted/60" aria-label="Ir al inicio">
            <img src="/media/app_icon.png" alt="" className="size-8 rounded-[9px] object-cover shadow-sm transition-transform group-hover:scale-[1.03]" />
          </button>
          <span className="hidden h-7 w-px bg-border/80 sm:block" aria-hidden="true" />
          <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', moduleContext.tone)}>
            <ModuleIcon className="size-4" strokeWidth={1.9} />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-[13px] font-bold leading-4 tracking-[-0.02em] text-foreground">{moduleContext.title}</p>
            <p className="max-w-[300px] truncate text-[9px] leading-3 text-muted-foreground">{moduleContext.subtitle}</p>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => navigate('/home')} className="group flex shrink-0 items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35" aria-label="Ir al inicio">
          <img src="/media/app_icon.png" alt="" className="size-8 rounded-[9px] object-cover shadow-sm transition-transform group-hover:scale-[1.03]" />
          <span className="hidden text-sm font-bold tracking-[-0.025em] text-foreground sm:block">Kommerze</span>
        </button>
      )}

      {/* ── Centro: Título + Sucursal/Terminal ─────────── */}
      <div className="absolute inset-x-0 flex flex-col items-center pointer-events-none">
        {showPageTitle && pageTitle && !moduleContext && (
          <h1 className="text-[13px] font-semibold text-foreground leading-tight">
            {pageTitle}
          </h1>
        )}
        <p className="flex items-center gap-1.5 text-[10px] leading-none text-muted-foreground">
          <span>{storeName} · {terminalName}</span>
          <WebSocketStatusIndicator />
        </p>
      </div>

      {/* ── Derecha: Reloj + Tema + Notif + UserMenu ────── */}
      <div className="flex items-center gap-1.5 shrink-0">
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
              'flex items-center gap-2 rounded-full px-2.5 py-1.5',
              'bg-muted/60 border border-border',
              'hover:bg-muted transition-all duration-150',
            )}
            aria-label="Menú de usuario"
            aria-expanded={menuOpen}
          >
            <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/30 text-[10px] font-bold text-primary shrink-0">
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
              'absolute right-0 top-[calc(100%+6px)] w-56 z-[var(--z-layer-dropdown)]',
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
