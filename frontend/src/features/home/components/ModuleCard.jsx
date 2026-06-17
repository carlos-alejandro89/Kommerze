import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * ModuleCard — Tarjeta grande estilo CarPlay para navegación principal.
 * Usa tokens del design system (bg-surface, border-border) para adaptarse al tema.
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

  const badgeColors = {
    red:   'bg-danger text-white',
    amber: 'bg-warning text-black',
    green: 'bg-success text-white',
  };

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        'group relative flex flex-col items-start justify-between',
        'rounded-3xl p-6 text-left',
        'transition-all duration-300 ease-out',
        'cursor-pointer select-none',
        // Usa tokens del tema — se adapta a claro/oscuro
        'bg-surface border border-border',
        // Hover: lift
        'hover:-translate-y-1 hover:scale-[1.02]',
        'hover:border-border-strong',
        // Wide card (Terminal POS)
        wide && 'col-span-2',
        'min-h-[160px]',
      )}
      style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08)' }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 0 28px 0 ${accentColor}30, 0 4px 20px 0 rgb(0 0 0 / 0.12)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.08)';
      }}
    >
      {/* Gradient overlay tinted by accent color */}
      <div
        className="absolute inset-0 rounded-3xl opacity-10 pointer-events-none transition-opacity duration-300 group-hover:opacity-20"
        style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, transparent 60%)`,
        }}
      />

      {/* Icon container */}
      <div
        className="relative z-[var(--z-layer-raised)] flex items-center justify-center rounded-2xl mb-4 size-14 shrink-0"
        style={{
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}35`,
        }}
      >
        <Icon
          className="size-7 transition-transform duration-300 group-hover:scale-110"
          style={{ color: accentColor }}
          strokeWidth={1.8}
        />
        {/* Badge */}
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

      {/* Text */}
      <div className="relative z-[var(--z-layer-raised)] mt-auto">
        <p className="text-[15px] font-semibold text-foreground leading-tight">{title}</p>
        <p
          className="text-xs mt-0.5 font-medium leading-tight"
          style={{ color: `${accentColor}bb` }}
        >
          {subtitle}
        </p>
      </div>

      {/* Wide card accent bar */}
      {wide && (
        <div
          className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full opacity-40 group-hover:opacity-80 transition-opacity"
          style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
        />
      )}
    </button>
  );
}
