import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, LogOut, Store } from 'lucide-react';
import { MAIN_NAV } from '@/config/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import { cn } from '@/lib/utils';

/**
 * Agrupa los ítems de navegación insertando separadores cuando cambia el campo `group`.
 * Devuelve un array donde cada elemento es:
 *   { type: 'divider', label: string } — separador con etiqueta
 *   { type: 'item', ...navItem }       — ítem de navegación normal
 */
function buildNavGroups(items) {
  const result = [];
  let lastGroup = undefined; // undefined = sin grupo previo

  for (const item of items) {
    if (item.group !== undefined && item.group !== lastGroup) {
      result.push({ type: 'divider', label: item.group });
      lastGroup = item.group;
    }
    result.push({ type: 'item', ...item });
  }
  return result;
}

export function Sidebar({ open, onToggle }) {
  const { logout, can } = useAuth();
  const { store, license, isCaja, deviceName } = useActivation();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState({});

  // Filtrar ítems según rol del dispositivo
  const filteredItems = MAIN_NAV.filter((item) => {
    if (item.serverOnly && isCaja) return false;
    if (item.cajaOnly && !isCaja) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  });

  const navGroups = buildNavGroups(filteredItems);

  useEffect(() => {
    const activeParent = filteredItems.find((item) =>
      item.children?.some((child) => location.pathname.startsWith(child.path)),
    );
    if (activeParent) {
      setExpanded((current) => ({ ...current, [activeParent.id]: true }));
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      style={{ '--sidebar-w': open ? '220px' : '60px', width: open ? 220 : 60 }}
      className={cn(
        'relative flex flex-col shrink-0 overflow-visible z-[var(--z-layer-sticky)] transition-all duration-300 ease-in-out',
        'bg-sidebar border-r border-sidebar-border',
      )}
    >
      {/* ── Brand ───────────────────────────────────────────── */}
      <div className="flex h-14 items-center gap-3 px-3 border-b border-sidebar-border shrink-0">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
          <Store className="size-4 text-primary" />
        </div>
        {open && (
          <div className="flex flex-col min-w-0 animate-fade-in">
            <span
              className="text-[13px] font-semibold text-sidebar-fg truncate leading-tight"
              title={store?.Nombre ?? license?.sucursal?.nombreSucursal ?? 'Kommerze POS'}
            >
              {store?.Nombre ?? license?.sucursal?.nombreSucursal ?? 'Kommerze POS'}
            </span>
            <span className="text-[11px] text-sidebar-muted truncate leading-tight">
              {deviceName || 'Dispositivo'}
            </span>
          </div>
        )}
      </div>

      {/* ── Nav Items ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {navGroups.map((entry, idx) => {
          // ── Separador de grupo ─────────────────────────────
          if (entry.type === 'divider') {
            return (
              <div
                key={`divider-${entry.label}-${idx}`}
                className={cn(
                  'flex items-center gap-2 pt-3 pb-1 first:pt-1',
                  !open && 'justify-center',
                )}
              >
                {open ? (
                  <>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted select-none">
                      {entry.label}
                    </span>
                    <div className="flex-1 h-px bg-sidebar-border" />
                  </>
                ) : (
                  <div className="w-5 h-px bg-sidebar-border" />
                )}
              </div>
            );
          }

          // ── Ítem de navegación ─────────────────────────────
          const item = entry;
          if (item.children?.length) {
            const visibleChildren = item.children.filter(
              (child) => !child.permission || can(child.permission),
            );
            if (!visibleChildren.length) return null;
            const isActive = visibleChildren.some((child) =>
              child.path === '/reports'
                ? location.pathname === child.path
                : location.pathname.startsWith(child.path),
            );
            const isExpanded = expanded[item.id] ?? isActive;
            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!open) {
                      navigate(visibleChildren[0].path);
                      return;
                    }
                    setExpanded((current) => ({
                      ...current,
                      [item.id]: !isExpanded,
                    }));
                  }}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors duration-150',
                    'text-sidebar-muted hover:bg-sidebar-hover-bg hover:text-sidebar-fg',
                    isActive && 'bg-primary text-white hover:bg-primary hover:text-white',
                    !open && 'justify-center',
                  )}
                  title={!open ? item.title : undefined}
                  aria-expanded={isExpanded}
                >
                  <item.icon className={cn('size-[18px] shrink-0', isActive ? 'text-white' : 'text-sidebar-muted group-hover:text-sidebar-fg')} />
                  {open && <span className="flex-1 truncate text-left animate-fade-in">{item.title}</span>}
                  {open && <ChevronDown className={cn('size-4 transition-transform', isExpanded && 'rotate-180')} />}
                </button>
                {open && isExpanded && (
                  <div className="ml-4 space-y-0.5 border-l border-sidebar-border pl-2">
                    {visibleChildren.map((child) => (
                      <NavLink
                        key={child.id}
                        to={child.path}
                        end={child.path === '/reports'}
                        className={({ isActive: childActive }) => cn(
                          'group flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                          'text-sidebar-muted hover:bg-sidebar-hover-bg hover:text-sidebar-fg',
                          childActive && 'bg-primary/12 text-primary',
                        )}
                      >
                        <child.icon className="size-4 shrink-0" />
                        <span className="truncate">{child.title}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors duration-150',
                  'text-sidebar-muted hover:bg-sidebar-hover-bg hover:text-sidebar-fg',
                  isActive && 'bg-primary text-white hover:bg-primary hover:text-white',
                  !open && 'justify-center',
                )
              }
              title={!open ? item.title : undefined}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'size-[18px] shrink-0 transition-colors',
                      isActive ? 'text-white' : 'text-sidebar-muted group-hover:text-sidebar-fg',
                    )}
                  />
                  {open && (
                    <span className="truncate animate-fade-in">{item.title}</span>
                  )}
                  {open && item.badge && (
                    <span className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5 shrink-0">
        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium',
            'text-sidebar-muted hover:bg-sidebar-hover-bg hover:text-danger transition-colors',
            !open && 'justify-center',
          )}
          title={!open ? 'Cerrar sesión' : undefined}
        >
          <LogOut className="size-[18px] shrink-0" />
          {open && <span className="animate-fade-in">Cerrar sesión</span>}
        </button>
      </div>

      {/* ── Toggle Button ────────────────────────────────────── */}
      <button
        onClick={onToggle}
        className={cn(
          'absolute -right-3 top-[52px] z-[var(--z-layer-raised)] flex size-6 items-center justify-center rounded-full',
          'bg-sidebar-surface border border-sidebar-border text-sidebar-muted',
          'hover:text-sidebar-fg hover:border-primary transition-colors shadow-md',
        )}
        aria-label={open ? 'Colapsar sidebar' : 'Expandir sidebar'}
      >
        {open
          ? <ChevronLeft className="size-3.5" />
          : <ChevronRight className="size-3.5" />
        }
      </button>
    </aside>
  );
}
