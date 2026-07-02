import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import posTerminalCard from '@/assets/pos-terminal-card.jpg';

function shadeHex(hex, percent) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * ModuleCard — Botón launchpad para navegación principal.
 *
 * Props:
 *  title        — Nombre del módulo
 *  subtitle     — Descripción breve
 *  icon         — Componente de icono Lucide
 *  accentColor  — Color CSS hex del acento del módulo (para glow y gradiente)
 *  to           — Ruta de navegación
 *  wide         — Si true, ocupa 2 columnas (Terminal POS)
 *  badge        — Texto badge opcional
 *  badgeColor   — 'red' | 'amber' | 'green'
 */
export function ModuleCard({
  title,
  subtitle,
  icon: Icon,
  accentColor,
  to,
  wide = false,
  badge,
  badgeColor = 'red',
  shortcut,
  status,
}) {
  const navigate = useNavigate();
  const gradientEnd = shadeHex(accentColor, -14);

  const badgeColors = {
    red: 'bg-danger text-white',
    amber: 'bg-warning text-black',
    green: 'bg-success text-white',
  };

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden',
        'rounded-[1.2rem] p-3 text-center',
        'transition-all duration-300 ease-out',
        'cursor-pointer select-none',
        'items-center justify-between border border-white/70 bg-white/68 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.46)] backdrop-blur-xl',
        'dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none',
        'hover:-translate-y-0.5 hover:bg-white/82 hover:shadow-[0_22px_48px_-34px_rgba(15,23,42,0.44)] active:scale-[0.98]',
        'dark:hover:bg-white/[0.075] dark:hover:shadow-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4',
        'dark:focus-visible:ring-offset-background',
        'min-h-[124px]',
        wide && [
          'col-span-2 row-span-2 min-h-[260px] items-start p-5 text-left',
          'md:col-span-2 lg:col-span-2',
          'border-[#0b4ed8]/25 bg-[#003b9a] shadow-none hover:shadow-none dark:border-white/15 dark:shadow-none dark:hover:shadow-none',
        ],
      )}
    >
      {wide && (
        <>
          <img
            src={posTerminalCard}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,35,102,0.98)_0%,rgba(0,57,155,0.9)_36%,rgba(0,35,102,0.38)_100%)]" />
        </>
      )}

      <div
        className={cn(
          'relative flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105',
          wide && 'size-14 rounded-full bg-white/10',
        )}
        style={wide ? undefined : {
          background: `${accentColor}14`,
          border: `1px solid ${accentColor}18`,
        }}
      >
        <Icon
          className={cn(
            'size-6 transition-transform duration-300',
            wide ? 'size-7 text-white' : '',
          )}
          style={wide ? undefined : { color: accentColor }}
          strokeWidth={1.85}
        />
        {badge && (
          <span
            className={cn(
              'absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center',
              'rounded-full text-[10px] font-bold',
              badgeColors[badgeColor],
            )}
          >
            {badge}
          </span>
        )}
      </div>

      <div className={cn('relative flex flex-1 flex-col items-center justify-center gap-0.5', wide && 'mt-5 flex-none items-start justify-start gap-1.5')}>
        <span className={cn(
          'max-w-[145px] text-[14px] font-bold leading-tight text-foreground',
          wide && 'max-w-[260px] text-2xl font-extrabold uppercase tracking-normal text-white',
        )}>
          {title}
        </span>
        {subtitle && (
          <span className={cn(
            'max-w-[145px] text-[12px] font-medium leading-snug text-muted-foreground',
            wide && 'max-w-[240px] text-sm font-semibold text-white/82',
          )}>
            {subtitle}
          </span>
        )}
        {status && !wide && (
          <span className="mt-0.5 max-w-[145px] text-[11px] font-semibold leading-tight" style={{ color: accentColor }}>
            {status}
          </span>
        )}
      </div>

      {wide && (
        <div className="relative mt-auto flex w-full flex-col gap-4">
          <span className="inline-flex h-10 w-full max-w-[250px] items-center justify-center rounded-xl bg-white px-4 text-[13px] font-extrabold uppercase text-[#003b9a] transition-transform group-hover:translate-x-0.5 dark:bg-white/95">
            Iniciar venta
            <ArrowRight className="ml-2 size-4" strokeWidth={2.5} />
          </span>
        </div>
      )}

      {!wide && shortcut && (
        <kbd className="relative mt-1.5 rounded-md bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/[0.08] dark:text-white/60">
          {shortcut}
        </kbd>
      )}

    </button>
  );
}
