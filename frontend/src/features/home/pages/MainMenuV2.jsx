import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Cloud,
  Clock,
  FileText,
  Handshake,
  LogOut,
  Moon,
  Package,
  PackageCheck,
  RefreshCcw,
  Repeat2,
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
import { WebSocketStatusIndicator } from '@/components/WebSocketStatusIndicator';
import homeStoreBanner from '@/assets/home-tienda-kommerze.png';

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
  { id: 'clientes', title: 'Clientes', subtitle: 'Catálogo y gestión de clientes', icon: Users, color: '#7645df', to: '/clients' },
  { id: 'transferencias', title: 'Transferencias', subtitle: 'Seguimiento a envío y recepción de productos', icon: ArrowLeftRight, color: '#12aeb4', to: '/transfers' },

  { id: 'compras', title: 'Compras', subtitle: 'Historial y nuevas compras', icon: ShoppingCart, color: '#168bea', to: '/purchases/history' },
  { id: 'proveedores', title: 'Proveedores', subtitle: 'Alta y datos fiscales de proveedores', icon: Handshake, color: '#ff8a28', to: '/suppliers' },
  { id: 'auditorias', title: 'Auditorías', subtitle: 'Conteos y auditorías de inventario', icon: PackageCheck, color: '#df2864', to: '/auditoria', serverOnly: true },

  { id: 'reportes', title: 'Reportes', subtitle: 'Reportes y análisis del negocio', icon: BarChart3, color: '#4a74db', to: '/dashboard' },
  { id: 'cajas', title: 'Cajas', subtitle: 'Apertura y cierre de cajas', icon: WalletCards, color: '#f7b900', to: '/caja/apertura' },
  { id: 'sucursales', title: 'Operación de sucursal', subtitle: 'Inicio, seguimiento y cierre de operaciones.', icon: Store, color: '#7d4ae5', to: '/sucursal/cortes', serverOnly: true },
  { id: 'conversiones', title: 'Conversiones', subtitle: 'Transformación entre presentaciones', icon: Repeat2, color: '#30b9ce', to: '/conversions' },
  { id: 'configuracion', title: 'Configuración', subtitle: 'Parámetros del sistema', icon: Settings, color: '#607996', to: '/settings' },
];

const ACTIVITY_META = {
  venta: { icon: ShoppingCart, color: '#1779f5', label: 'Venta' },
  cotizacion: { icon: FileText, color: '#8654df', label: 'Cotización' },
  transferencia: { icon: ArrowLeftRight, color: '#13aa68', label: 'Transferencia' },
  compra: { icon: ShoppingBag, color: '#168bea', label: 'Compra' },
  baja: { icon: Package, color: '#e6a80a', label: 'Baja de mercancía' },
  pedido: { icon: ClipboardCheck, color: '#607996', label: 'Operación' },
};

function relativeTime(value, now = new Date()) {
  if (!value) return 'Fecha no disponible';
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Hace unos segundos';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/media/app_icon.png"
        alt=""
        aria-hidden="true"
        className="size-9 shrink-0 rounded-[10px] object-contain"
      />
      <span className="text-[21px] font-bold tracking-[-0.035em] text-[#071431] dark:text-white">Kommerze</span>
    </div>
  );
}

const money = value => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

function SalesChart({ data = [] }) {
  const chart = useMemo(() => {
    const values = data.map(item => Number(item?.total ?? item?.Total ?? 0));
    const max = Math.max(...values, 1);
    const points = values.map((value, index) => ({
      x: values.length <= 1 ? 125 : 2 + (index * 246) / (values.length - 1),
      y: 94 - (value / max) * 78,
    }));
    if (points.length === 1) points.push({ x: 248, y: points[0].y });
    if (points.length === 0) points.push({ x: 2, y: 94 }, { x: 248, y: 94 });
    const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    return { line, area: `${line} L248 104 L2 104 Z`, last: points.at(-1) };
  }, [data]);

  return (
    <div className="mt-3 h-[104px] w-full">
      <svg viewBox="0 0 250 104" className="h-full w-full overflow-visible" aria-label="Ventas por hora durante la operación">
        <defs>
          <linearGradient id="menuV2Area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#26a6ff" stopOpacity=".48" />
            <stop offset="100%" stopColor="#26a6ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={chart.area} fill="url(#menuV2Area)" />
        <path d={chart.line} fill="none" stroke="#29a7ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="125" y1="5" x2="125" y2="96" stroke="#7fb8ff" strokeOpacity=".25" strokeDasharray="3 4" />
        <circle cx={chart.last.x} cy={chart.last.y} r="3.5" fill="#49bbff" />
      </svg>
    </div>
  );
}

function ChartTimeLabels({ data = [] }) {
  const formatHour = item => {
    const value = item?.hora ?? item?.Hora;
    if (!value) return '--:--';
    return new Date(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };
  const middle = data.length ? data[Math.floor((data.length - 1) / 2)] : null;
  return (
    <div className="-mt-1 flex justify-between text-[10px] text-blue-200/80">
      <span>{formatHour(data[0])}</span>
      <span>{formatHour(middle)}</span>
      <span>{formatHour(data.at(-1))}</span>
    </div>
  );
}

function ModuleTile({ module, onOpen }) {
  const Icon = module.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(module)}
      className="group relative flex min-h-[82px] items-center overflow-hidden rounded-2xl border border-[#e2eaf5] bg-white/80 px-3.5 py-3 text-left shadow-[0_8px_24px_-22px_rgba(28,70,133,.45)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_14px_30px_-22px_rgba(28,70,133,.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:border-white/10 dark:bg-white/[.055] dark:hover:border-white/15 dark:hover:bg-white/[.08]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px opacity-0 transition-opacity group-hover:opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${module.color}, transparent)` }}
      />
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-[13px] text-white shadow-[0_9px_18px_-12px_var(--module-color)] ring-1 ring-white/40 transition-transform duration-200 group-hover:scale-[1.025]"
        style={{ '--module-color': module.color, background: `linear-gradient(145deg, ${module.color}c7, ${module.color})` }}
      >
        <Icon className="size-[22px]" strokeWidth={1.8} />
      </span>
      <span className="ml-3 min-w-0 flex-1"><span className="block text-[12px] font-bold text-[#101c35] dark:text-slate-100">{module.title}</span><span className="mt-0.5 block text-[10px] leading-[1.35] text-[#7185a7] dark:text-slate-400">{module.subtitle}</span></span>
      <ChevronRight className="ml-2 size-4 shrink-0 text-[#7890b4] transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
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
  const [salesSummary, setSalesSummary] = useState(null);

  const userName = user?.Nombre ?? user?.nombre ?? user?.CorreoElectronico ?? 'Usuario';
  const firstName = userName.split(' ').filter(Boolean)[0] || 'Usuario';
  const initials = userName.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join('');
  const storeName = store?.Nombre ?? store?.NombreSucursal ?? store?.nombre ?? license?.sucursal?.nombreSucursal ?? 'Matriz Centro';
  const storeID = store?.ID ?? store?.id ?? 0;

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
      } else if (event.key === 'F6') {
        event.preventDefault();
        if (isCaja) {
          toast.warning('La sincronización sólo está disponible en el Servidor Local');
          return;
        }
        navigate('/sync');
      } else if (event.key === 'F12') {
        event.preventDefault();
        navigate('/pos');
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [isCaja, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!storeID) {
      setSalesSummary(null);
      return undefined;
    }

    let active = true;
    const loadSales = async () => {
      try {
        const service = window?.go?.main?.App?.ServiceObtenerResumenVentasOperacion;
        if (!service) return;
        const response = await service(storeID);
        if (active) setSalesSummary(response?.success ? response.data : null);
      } catch (error) {
        console.error('No se pudo cargar el resumen de ventas de la operación', error);
        if (active) setSalesSummary(null);
      }
    };

    loadSales();
    const timer = window.setInterval(loadSales, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [storeID]);

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
        <aside className="order-last hidden w-[292px] shrink-0 flex-col border-l border-[#dfe9f7] bg-white/76 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#081426]/90 lg:flex">

          <section className="rounded-[18px] bg-[radial-gradient(circle_at_90%_95%,#0758c9_0%,#032761_45%,#031636_100%)] p-4 text-white shadow-[0_18px_36px_-18px_rgba(0,46,126,.62)]">
            <div className="text-sm font-semibold text-blue-100">Ventas en esta operación</div>
            <div className="mt-2 flex items-center justify-between">
              <strong className="text-[27px] tracking-tight">{money(salesSummary?.total)}</strong>
              <span className="rounded-full bg-sky-400/12 px-2 py-1 text-xs font-bold text-sky-200">{salesSummary?.ventas || 0} ventas</span>
            </div>
            <div className="mt-1 text-xs font-medium text-blue-100/80">Acumulado desde la apertura de la jornada</div>
            <SalesChart data={salesSummary?.porHora || []} />
            <ChartTimeLabels data={salesSummary?.porHora || []} />
          </section>

          <section className="mt-3 rounded-[18px] border border-[#e2eaf5] bg-white/90 p-3.5 text-[#102142] shadow-[0_14px_32px_-25px_rgba(20,55,110,.42)] dark:border-white/10 dark:bg-white/[.055] dark:text-white">
            <h2 className="text-xs font-bold">Transacción rápida</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: 'Nueva venta', icon: ShoppingCart, action: () => navigate('/pos') },
                { label: 'Cotización', icon: FileText, action: () => navigate('/pos') },
                { label: 'Devolución', icon: RefreshCcw },
                { label: 'Consultar venta', icon: Search, action: () => navigate('/history') },
              ].map(item => (
                <button key={item.label} onClick={item.action ?? (() => toast.info(`${item.label} estará disponible próximamente`))}
                  className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#e6edf7] bg-[#f8fbff] text-[10px] font-semibold transition hover:border-blue-200 hover:bg-blue-50 dark:border-white/10 dark:bg-white/[.055] dark:hover:bg-white/10">
                  <item.icon className="size-5 text-primary" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between"><h2 className="text-xs font-bold">Actividad reciente</h2><button onClick={() => navigate('/history')} className="text-[10px] font-semibold text-primary">Ver todas</button></div>
            <div className="mt-3 space-y-3">
              {(salesSummary?.actividades || []).map((activity, index) => {
                const type = activity?.tipo || 'pedido';
                const meta = ACTIVITY_META[type] || ACTIVITY_META.pedido;
                const ActivityIcon = meta.icon;
                const folio = String(activity?.folio || 0).padStart(6, '0');
                return (
                  <div key={`${type}-${activity?.folio}-${activity?.fecha || index}`} className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: meta.color }}>
                      <ActivityIcon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-semibold">{meta.label} #{folio}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{relativeTime(activity?.fecha, now)}{activity?.detalle && type === 'transferencia' ? ` · ${activity.detalle}` : ''}</div>
                    </div>
                    <div className="max-w-[76px] truncate text-right text-[10px] font-semibold">{money(activity?.valor)}</div>
                  </div>
                );
              })}
              {!salesSummary?.actividades?.length && (
                <div className="rounded-xl border border-white/10 bg-white/[.045] px-3 py-4 text-center text-[11px] text-blue-100/70">
                  Aún no hay actividad en esta operación.
                </div>
              )}
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
            <div className="relative mx-auto flex min-h-full w-full max-w-[1500px] flex-col px-5 py-4 sm:px-7">
            <header className="flex items-start justify-between gap-5">
              <Brand />
              <div className="flex items-center gap-2 sm:gap-3">
                <button className="hidden items-center gap-2 text-sm font-semibold text-[#194991] dark:text-blue-300 sm:flex">
                  Sucursal: {storeName}
                  <WebSocketStatusIndicator className="size-2.5" />
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

            <section className="relative mt-4 min-h-[214px] overflow-hidden rounded-[22px] border border-[#e1eaf6] bg-[#eef5ff] shadow-[0_18px_42px_-34px_rgba(20,65,135,.55)] dark:border-white/10 dark:bg-[#0c1a2f]">
              <img src={homeStoreBanner} alt="Tienda Kommerze" className="absolute inset-y-0 right-0 h-full w-[58%] object-cover object-center" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,#eef5ff_0%,#eef5ff_43%,rgba(238,245,255,.88)_52%,rgba(238,245,255,0)_78%)] dark:bg-[linear-gradient(90deg,#0c1a2f_0%,#0c1a2f_43%,rgba(12,26,47,.9)_52%,rgba(12,26,47,0)_78%)]" />
              <div className="relative z-10 max-w-[58%] px-7 pt-7"><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#5475a5]">{storeName} · {isCaja ? 'Caja' : 'Gerencia'}</p><h1 className="mt-2 text-[28px] font-extrabold tracking-[-0.04em]">¡Hola, <span className="text-primary">{firstName}!</span></h1><p className="mt-0.5 text-sm font-semibold text-[#355b91] dark:text-blue-200">Todo tu negocio, en un solo lugar</p><p className="mt-1 text-[11px] text-[#607da7] dark:text-slate-400">Gestiona ventas, inventario, clientes y más de forma simple y eficiente.</p></div>
            </section>

            <div className="relative z-20 -mt-[62px] ml-7 flex h-[44px] max-w-[540px] items-center rounded-xl border border-[#dce7f6] bg-white/95 px-4 shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] dark:border-white/10 dark:bg-[#101e33]/95">
              <Search className="mr-4 size-5 text-[#6481ad]" />
              <input ref={searchRef} value={search} onChange={event => setSearch(event.target.value)}
                placeholder="Buscar en Kommerze..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#7790b6] dark:text-slate-100 dark:placeholder:text-slate-500" />
              <span className="rounded-lg bg-[#f4f7fc] px-2 py-1 text-xs font-semibold text-[#6b83a9] dark:bg-white/10 dark:text-slate-400">⌘ K</span>
            </div>

            <div className="mb-3 mt-8 flex items-center justify-between"><h2 className="text-sm font-bold">Módulos principales</h2><span className="text-[10px] font-medium text-primary">Accesos de Kommerze</span></div>
            <section className="grid grid-cols-2 gap-2.5 pb-5 md:grid-cols-3 xl:grid-cols-4">
              {modules.map(module => <ModuleTile key={module.id} module={module} onOpen={openModule} />)}
              {modules.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-[#ccd9eb] bg-white/65 p-10 text-center text-sm text-[#60789f] dark:border-white/15 dark:bg-white/5 dark:text-slate-400">
                  No encontramos módulos para “{search}”.
                </div>
              )}
            </section>

            <section className="hidden mb-5 mt-auto overflow-hidden rounded-[22px] bg-[linear-gradient(110deg,#073a96,#0757d1_58%,#0864dc)] px-7 py-6 text-white shadow-[0_20px_38px_-24px_rgba(0,60,170,.65)]">
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

            </div>
          </main>
          <div className="flex shrink-0 items-center justify-between gap-4 bg-[#f8fbff] px-6 py-1.5 text-[10px] text-[#6e84a7] dark:bg-[#091526] dark:text-slate-500">
            <span>© {new Date().getFullYear()} Kommerze. Todos los derechos reservados.</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-semibold">v9.3.4</span>
              <span className="rounded-full border border-emerald-500/15 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                Actualizado
              </span>
            </span>
          </div>
          <HomeStatusBar />
        </div>
      </div>
    </div>
  );
}
