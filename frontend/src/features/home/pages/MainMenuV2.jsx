import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Cloud,
  Clock,
  FileText,
  LogOut,
  Moon,
  Package,
  PackageCheck,
  RefreshCcw,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Sun,
  User,
  Users,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { useActivation } from '@/providers/ActivationProvider';
import { useAuth } from '@/providers/AuthProvider';
import { NotificationBell } from '@/components/NotificationBell';
import { HomeStatusBar } from '../components/HomeStatusBar';

const THEME_KEY = 'kommerze-theme';

function useMenuDarkMode() {
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

const MODULES = [
  { id: 'ventas', title: 'Ventas', subtitle: 'Captura y consulta de ventas', icon: ShoppingBag, color: '#0876f9', to: '/pos' },
  { id: 'productos', title: 'Productos', subtitle: 'Catálogo y control de productos', icon: Package, color: '#12b85a', to: '/products', serverOnly: true },
  { id: 'inventario', title: 'Inventario', subtitle: 'Existencias y movimientos', icon: ClipboardCheck, color: '#ff8a28', to: '/products', serverOnly: true },
  { id: 'clientes', title: 'Clientes', subtitle: 'Catálogo y gestión de clientes', icon: Users, color: '#7645df', to: '/clients' },
  { id: 'compras', title: 'Compras', subtitle: 'Órdenes y control de compras', icon: ShoppingCart, color: '#168bea' },
  { id: 'transferencias', title: 'Transferencias', subtitle: 'Seguimiento a envío y recepción de productos', icon: ArrowLeftRight, color: '#12aeb4', to: '/transfers' },
  { id: 'auditorias', title: 'Auditorías', subtitle: 'Conteos y auditorías de inventario', icon: PackageCheck, color: '#df2864', to: '/auditoria', serverOnly: true },
  { id: 'reportes', title: 'Reportes', subtitle: 'Reportes y análisis del negocio', icon: BarChart3, color: '#4a74db', to: '/dashboard' },
  { id: 'cajas', title: 'Cajas', subtitle: 'Apertura y cierre de cajas', icon: WalletCards, color: '#f7b900', to: '/caja/apertura' },
  { id: 'sucursales', title: 'Sucursales', subtitle: 'Gestión de sucursales', icon: Store, color: '#7d4ae5', to: '/sucursal/cortes', serverOnly: true },
  { id: 'usuarios', title: 'Usuarios', subtitle: 'Usuarios y permisos', icon: User, color: '#30b9ce' },
  { id: 'configuracion', title: 'Configuración', subtitle: 'Parámetros del sistema', icon: Settings, color: '#607996', to: '/settings' },
];

const RECENT_ACTIVITY = [
  { icon: ShoppingCart, color: '#1779f5', title: 'Venta #VTA-000125', detail: 'Hace 5 min', value: '$1,250.00' },
  { icon: ArrowLeftRight, color: '#13aa68', title: 'Traspaso #TRP-00008', detail: 'Hace 30 min', value: '$3,450.00' },
  { icon: Package, color: '#e6a80a', title: 'Entrada de productos', detail: 'Hace 1 h', value: '$8,900.00' },
  { icon: ClipboardCheck, color: '#8654df', title: 'Auditoría iniciada', detail: 'Hace 2 h', value: 'Sucursal Norte' },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/media/app_icon.png"
        alt=""
        aria-hidden="true"
        className="size-12 shrink-0 rounded-xl object-contain"
      />
      <span className="text-[27px] font-extrabold tracking-[-0.04em] text-[#071431] dark:text-white">Kommerze</span>
    </div>
  );
}

function SalesChart() {
  return (
    <div className="mt-3 h-[104px] w-full">
      <svg viewBox="0 0 250 104" className="h-full w-full overflow-visible" aria-label="Tendencia de ventas del día">
        <defs>
          <linearGradient id="menuV2Area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#26a6ff" stopOpacity=".48" />
            <stop offset="100%" stopColor="#26a6ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M2 90 C15 74,20 92,34 77 S53 84,64 66 S80 59,94 38 S116 56,126 53 S150 40,165 50 S184 46,196 38 S216 47,248 10 L248 104 L2 104 Z" fill="url(#menuV2Area)" />
        <path d="M2 90 C15 74,20 92,34 77 S53 84,64 66 S80 59,94 38 S116 56,126 53 S150 40,165 50 S184 46,196 38 S216 47,248 10" fill="none" stroke="#29a7ff" strokeWidth="3" strokeLinecap="round" />
        <line x1="125" y1="5" x2="125" y2="96" stroke="#7fb8ff" strokeOpacity=".25" strokeDasharray="3 4" />
        <circle cx="248" cy="10" r="3.5" fill="#49bbff" />
      </svg>
    </div>
  );
}

function ModuleTile({ module, onOpen }) {
  const Icon = module.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(module)}
      className="group relative flex min-h-[156px] flex-col items-center justify-center overflow-hidden rounded-[18px] border border-[#e6edf7]/90 bg-white/78 px-5 py-5 text-center shadow-[0_8px_24px_-21px_rgba(28,70,133,.38)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d9e5f5] hover:bg-white/96 hover:shadow-[0_14px_30px_-22px_rgba(28,70,133,.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:border-white/10 dark:bg-white/[.055] dark:hover:border-white/15 dark:hover:bg-white/[.08]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px opacity-0 transition-opacity group-hover:opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${module.color}, transparent)` }}
      />
      <span
        className="mb-3.5 flex size-[58px] items-center justify-center rounded-[16px] text-white shadow-[0_9px_18px_-12px_var(--module-color)] ring-1 ring-white/40 transition-transform duration-200 group-hover:scale-[1.025]"
        style={{ '--module-color': module.color, background: `linear-gradient(145deg, ${module.color}c7, ${module.color})` }}
      >
        <Icon className="size-7" strokeWidth={1.8} />
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.015em] text-[#101c35] dark:text-slate-100">{module.title}</span>
      <span className="mt-1 max-w-[168px] text-[12px] font-normal leading-[1.45] text-[#7185a7] dark:text-slate-400">{module.subtitle}</span>
    </button>
  );
}

export function MainMenuV2() {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const { user, logout } = useAuth();
  const { isCaja, store, license } = useActivation();
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(new Date());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [dark, setDark] = useMenuDarkMode();

  const userName = user?.Nombre ?? user?.nombre ?? user?.CorreoElectronico ?? 'Usuario';
  const firstName = userName.split(' ').filter(Boolean)[0] || 'Usuario';
  const initials = userName.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join('');
  const storeName = store?.Nombre ?? store?.NombreSucursal ?? store?.nombre ?? license?.sucursal?.nombreSucursal ?? 'Matriz Centro';

  const modules = useMemo(() => {
    const query = search.trim().toLowerCase();
    return MODULES.filter(module => {
      if (module.serverOnly && isCaja) return false;
      if (!query) return true;
      return `${module.title} ${module.subtitle}`.toLowerCase().includes(query);
    });
  }, [isCaja, search]);

  useEffect(() => {
    const onShortcut = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (event.key === 'F1') {
        event.preventDefault();
        toast.info('El centro de ayuda estará disponible próximamente');
      } else if (event.key === 'F5') {
        event.preventDefault();
        window.location.reload();
      } else if (event.key === 'F12') {
        event.preventDefault();
        navigate('/pos');
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const closeUserMenu = event => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeUserMenu);
    return () => document.removeEventListener('mousedown', closeUserMenu);
  }, []);

  const timeText = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const dateText = now.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const openModule = module => {
    if (module.to) {
      navigate(module.to);
      return;
    }
    toast.info(`${module.title} estará disponible próximamente`);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#f4f8fe] text-[#08142e] dark:bg-[#07111f] dark:text-slate-100">
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[306px] shrink-0 flex-col border-r border-[#dfe9f7] bg-white/76 px-7 py-6 backdrop-blur-xl dark:border-white/10 dark:bg-[#081426]/90 lg:flex">
          <Brand />

          <section className="mt-8 rounded-[22px] bg-[radial-gradient(circle_at_90%_95%,#0758c9_0%,#032761_45%,#031636_100%)] p-5 text-white shadow-[0_18px_36px_-18px_rgba(0,46,126,.62)]">
            <div className="text-sm font-semibold text-blue-100">Ventas del día</div>
            <div className="mt-2 flex items-center justify-between">
              <strong className="text-[27px] tracking-tight">$24,850.00</strong>
              <span className="rounded-full bg-emerald-400/12 px-2 py-1 text-xs font-bold text-emerald-300">↗ 12.5%</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-blue-100">vs. ayer</div>
            <SalesChart />
            <div className="-mt-1 flex justify-between text-[10px] text-blue-200/80"><span>00:00</span><span>12:00</span><span>23:59</span></div>
          </section>

          <section className="mt-4 rounded-[22px] bg-gradient-to-b from-[#073479] to-[#032255] p-5 text-white shadow-[0_18px_36px_-20px_rgba(0,46,126,.58)]">
            <h2 className="text-sm font-semibold">Transacción rápida</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: 'Nueva venta', icon: ShoppingCart, action: () => navigate('/pos') },
                { label: 'Cotización', icon: FileText, action: () => navigate('/pos') },
                { label: 'Devolución', icon: RefreshCcw },
                { label: 'Consultar venta', icon: Search, action: () => navigate('/history') },
              ].map(item => (
                <button key={item.label} onClick={item.action ?? (() => toast.info(`${item.label} estará disponible próximamente`))}
                  className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl bg-[#164a95]/75 text-xs font-semibold transition hover:bg-[#1d5bb5]">
                  <item.icon className="size-6" />
                  {item.label}
                </button>
              ))}
            </div>

            <h2 className="mt-5 text-sm font-semibold">Actividad reciente</h2>
            <div className="mt-3 space-y-3">
              {RECENT_ACTIVITY.map(activity => (
                <div key={activity.title} className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: activity.color }}>
                    <activity.icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-semibold">{activity.title}</div>
                    <div className="text-[10px] text-blue-200/70">{activity.detail}</div>
                  </div>
                  <div className="max-w-[74px] text-right text-[10px] font-semibold text-blue-50">{activity.value}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-auto rounded-2xl border border-[#dfe8f5] bg-white p-4 shadow-[0_12px_28px_-22px_rgba(20,55,110,.42)] dark:border-white/10 dark:bg-white/[.055]">
            <div className="flex items-center gap-3">
              <Cloud className="size-5 text-[#1678ef]" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold">Conectado a la nube</div>
                <div className="mt-1 text-[10px] text-[#6178a0] dark:text-slate-400">Última sincronización: Hace 2 min</div>
              </div>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="kommerze-gradient-bg relative min-h-0 flex-1 overflow-y-auto">
            <div className="relative mx-auto flex min-h-full w-full max-w-[1180px] flex-col px-5 py-6 sm:px-8 lg:px-10">
            <header className="flex items-start justify-between gap-5">
              <div>
                <h1 className="text-[27px] font-extrabold tracking-[-0.04em]">¡Hola, {firstName}!</h1>
                <p className="mt-1 text-base font-medium text-[#49699d] dark:text-slate-400">Bienvenido a Kommerze</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button className="hidden items-center gap-2 text-sm font-semibold text-[#194991] dark:text-blue-300 sm:flex">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  Sucursal: {storeName}
                  <ChevronDown className="size-4 text-[#6a83ab]" />
                </button>

                <div className="hidden items-center gap-2 border-l border-[#dce5f2] pl-4 dark:border-white/10 md:flex">
                  <Clock className="size-4 text-[#6a83ab]" />
                  <div className="min-w-[72px]">
                    <div className="text-[13px] font-semibold leading-none text-[#1b3154] dark:text-slate-200">{timeText}</div>
                    <div className="mt-1 text-[10px] capitalize leading-none text-[#7a8fae] dark:text-slate-400">{dateText}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDark(value => !value)}
                  className="flex size-9 items-center justify-center rounded-xl text-[#587397] transition hover:bg-white/80 hover:text-[#173d76] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label={dark ? 'Activar tema claro' : 'Activar tema oscuro'}
                  title={dark ? 'Tema claro' : 'Tema oscuro'}
                >
                  {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
                </button>

                <div className="text-[#587397] dark:text-slate-300 [&_[data-slot=dropdown-menu-trigger]]:rounded-xl [&_[data-slot=dropdown-menu-trigger]]:hover:bg-white/80 dark:[&_[data-slot=dropdown-menu-trigger]]:hover:bg-white/10">
                  <NotificationBell />
                </div>

                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(value => !value)}
                    className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-white/80 dark:hover:bg-white/10"
                    aria-label="Menú de usuario"
                    aria-expanded={userMenuOpen}
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ffbf8a] to-[#b96b41] text-xs font-extrabold text-white shadow-sm">
                      {initials || <User className="size-5" />}
                    </span>
                    <ChevronDown className={`size-4 text-[#6a83ab] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-[var(--z-layer-dropdown)] w-64 overflow-hidden rounded-2xl border border-[#dce5f2] bg-white shadow-[0_20px_48px_-22px_rgba(28,61,112,.42)] dark:border-white/10 dark:bg-[#101d31]">
                      <div className="flex items-center gap-3 border-b border-[#e7edf6] px-4 py-4 dark:border-white/10">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffbf8a] to-[#b96b41] text-xs font-extrabold text-white">
                          {initials || <User className="size-5" />}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[#12213d] dark:text-slate-100">{userName}</div>
                          {user?.CorreoElectronico && (
                            <div className="mt-0.5 truncate text-[11px] text-[#7185a7] dark:text-slate-400">{user.CorreoElectronico}</div>
                          )}
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <LogOut className="size-4" />
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="mt-8 flex h-[54px] max-w-[760px] items-center rounded-2xl border border-[#dce7f6] bg-white/90 px-5 shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] dark:border-white/10 dark:bg-white/[.065]">
              <Search className="mr-4 size-5 text-[#6481ad]" />
              <input ref={searchRef} value={search} onChange={event => setSearch(event.target.value)}
                placeholder="Buscar en Kommerze..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#7790b6] dark:text-slate-100 dark:placeholder:text-slate-500" />
              <span className="rounded-lg bg-[#f4f7fc] px-2 py-1 text-xs font-semibold text-[#6b83a9] dark:bg-white/10 dark:text-slate-400">⌘ K</span>
            </div>

            <section className="mt-7 grid grid-cols-2 gap-3.5 pb-7 md:grid-cols-3 xl:grid-cols-4">
              {modules.map(module => <ModuleTile key={module.id} module={module} onOpen={openModule} />)}
              {modules.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-[#ccd9eb] bg-white/65 p-10 text-center text-sm text-[#60789f] dark:border-white/15 dark:bg-white/5 dark:text-slate-400">
                  No encontramos módulos para “{search}”.
                </div>
              )}
            </section>

            <section className="mb-5 mt-auto overflow-hidden rounded-[22px] bg-[linear-gradient(110deg,#073a96,#0757d1_58%,#0864dc)] px-7 py-6 text-white shadow-[0_20px_38px_-24px_rgba(0,60,170,.65)]">
              <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-5">
                  <div className="hidden size-20 items-center justify-center rounded-2xl bg-white/12 md:flex">
                    <Boxes className="size-11 text-blue-100" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Kommerze siempre contigo</h2>
                    <p className="mt-1 max-w-[390px] text-sm leading-6 text-blue-100/90">Gestiona tu negocio desde cualquier lugar y en cualquier dispositivo.</p>
                  </div>
                </div>
                <button onClick={() => toast.info('La aplicación móvil estará disponible próximamente')}
                  className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/15">
                  Descargar app móvil &nbsp; →
                </button>
              </div>
            </section>

            <footer className="flex items-center justify-between pb-2 text-[11px] font-medium text-[#6e84a7] dark:text-slate-500">
              <span>© {new Date().getFullYear()} Kommerze. Todos los derechos reservados.</span>
              <span>v9.3.4 &nbsp; <strong className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">Actualizado</strong></span>
            </footer>
            </div>
          </main>
          <HomeStatusBar />
        </div>
      </div>
    </div>
  );
}
