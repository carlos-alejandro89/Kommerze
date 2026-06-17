import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, Store } from 'lucide-react';
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
  const { logout } = useAuth();
  const { store, operation, license, isCaja } = useActivation();
  const navigate = useNavigate();

  // Filtrar ítems según rol del dispositivo
  const filteredItems = MAIN_NAV.filter((item) => {
    if (item.serverOnly && isCaja) return false;
    if (item.cajaOnly && !isCaja) return false;
    return true;
  });

  const navGroups = buildNavGroups(filteredItems);

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
              {operation?.Nombre ?? 'Terminal 01'}
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
