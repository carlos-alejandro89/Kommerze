import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
        'group relative flex min-w-0 flex-col items-center justify-center gap-4 overflow-hidden',
        'rounded-3xl p-5 text-center',
        'transition-all duration-300 ease-out',
        'cursor-pointer select-none',
        'border border-white/45 bg-white/45 shadow-[0_10px_26px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md',
        'dark:border-white/10 dark:bg-white/[0.038] dark:shadow-[0_14px_32px_-26px_rgba(0,0,0,0.9)]',
        'hover:-translate-y-0.5 hover:bg-white/68 hover:shadow-[0_18px_38px_-24px_rgba(15,23,42,0.36)] active:scale-[0.98]',
        'dark:hover:bg-white/[0.065] dark:hover:shadow-[0_22px_42px_-28px_rgba(0,0,0,1)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4',
        'dark:focus-visible:ring-offset-background',
        'min-h-[142px]',
        wide && [
          'col-span-2 row-span-2 min-h-[296px] items-start justify-between p-7 text-left',
          'md:col-span-2 lg:col-span-2',
          'border-white/70 bg-white/58 shadow-none hover:shadow-none dark:border-white/15 dark:bg-white/[0.064] dark:shadow-none dark:hover:shadow-none',
        ],
      )}
    >
      {wide && (
        <>
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{

            }}
          />
          <div
            className="pointer-events-none absolute left-0 top-6 h-24 w-1.5 rounded-r-full bg-gradient-to-b from-[#002366] to-[#001233]"
          />
        </>
      )}

      {wide && (
        <Icon
          className="pointer-events-none absolute -bottom-8 -right-10 size-64 text-[#002366]/[0.13] transition-transform duration-500 group-hover:scale-110 dark:text-white/[0.07]"

        />
      )}

      <div
        className={cn(
          'relative flex size-16 shrink-0 items-center justify-center rounded-2xl shadow-[0_8px_18px_-8px_rgba(0,0,0,0.24)] transition-shadow duration-300 group-hover:shadow-[0_12px_26px_-12px_rgba(0,0,0,0.34)]',
          wide && 'size-20 rounded-3xl border border-[#4f78b8]/35 bg-gradient-to-br from-[#002366] to-[#001233] shadow-none group-hover:shadow-none',
        )}
        style={wide ? undefined : {
          background: `linear-gradient(135deg, ${accentColor}, ${gradientEnd})`,
        }}
      >
        <Icon
          className={cn(
            'size-7 text-white transition-transform duration-300 group-hover:scale-105',
            wide && 'size-10',
          )}
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

      <div className={cn('relative flex flex-col items-center gap-1', wide && 'items-start gap-2')}>
        <span className={cn(
          'max-w-[140px] text-[14px] font-semibold leading-tight text-foreground',
          wide && 'max-w-[260px] text-2xl font-bold',
        )}>
          {title}
        </span>
        {subtitle && (
          <span className={cn(
            'max-w-[150px] text-[11px] font-medium leading-tight text-muted-foreground',
            wide && 'max-w-[260px] text-sm font-semibold',
          )}>
            {subtitle}
          </span>
        )}
      </div>

      {wide && (
        <div className="relative mt-auto flex w-full items-end justify-between gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.75)]" />
            Listo para vender
          </div>

          <kbd className="rounded-lg border border-[#002366]/10 bg-[#002366]/5 px-2 py-1 text-[10px] font-bold text-[#002366]/70 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70">
            F12
          </kbd>
        </div>
      )}


    </button>
  );
}
