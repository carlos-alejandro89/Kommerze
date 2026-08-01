/**
 * TurnoGuard — Bloquea el acceso al POS según el estado del turno.
 *
 * Estados:
 *   1. Cargando          → ScreenLoader
 *   2. Sin jornada       → SinJornadaScreen (rojo, requiere supervisor)
 *   3. Sin turno propio  → SinTurnoScreen (naranja, redirige a /caja/apertura)
 *   4. Todo OK           → {children}
 */

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, Wallet, RefreshCw, ShieldAlert, ArrowRight } from 'lucide-react';
import { useTurno } from '@/providers/TurnoProvider';
import { ScreenLoader } from '@/components/ScreenLoader';
import { cn } from '@/lib/utils';

export function TurnoGuard({ children }) {
  const { turnoActivo, jornadaActiva, turnoLoading, refreshTurno } = useTurno();

  // ── 1. Cargando ─────────────────────────────────────────────────────────────
  if (turnoLoading || turnoActivo === undefined) {
    return <ScreenLoader />;
  }

  // ── 2. Sin jornada de sucursal ───────────────────────────────────────────────
  if (!jornadaActiva) {
    return <SinJornadaScreen onRefresh={refreshTurno} />;
  }

  // ── 3. Sin turno del cajero ──────────────────────────────────────────────────
  if (!turnoActivo) {
    return <SinTurnoScreen onRefresh={refreshTurno} />;
  }

  // ── 4. OK ────────────────────────────────────────────────────────────────────
  return children;
}

// ── Pantalla: Sin Jornada de Sucursal ─────────────────────────────────────────

function SinJornadaScreen({ onRefresh }) {
  return (
    <TurnoBlockScreen
      variant="danger"
      icon={ShieldAlert}
      title="Sucursal Cerrada"
      subtitle="No hay una jornada activa en esta sucursal."
      description="Un supervisor debe iniciar la jornada del día desde la página de Cortes de Sucursal antes de que los cajeros puedan operar."
      actions={
        <RefreshButton onRefresh={onRefresh} label="Verificar nuevamente" />
      }
    />
  );
}

// ── Pantalla: Sin Turno Propio ────────────────────────────────────────────────

function SinTurnoScreen({ onRefresh }) {
  const navigate = useNavigate();

  return (
    <TurnoBlockScreen
      variant="warning"
      icon={Lock}
      title="Turno No Iniciado"
      subtitle="No tienes un turno de caja abierto."
      description="Debes aperturar tu turno antes de operar el punto de venta. Registra el fondo de apertura para comenzar a vender."
      actions={
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/caja/apertura')}
            className="group flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] px-6 py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-amber-500/30"
          >
            <Wallet className="size-4" />
            Abrir Turno
            <ArrowRight className="size-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <RefreshButton onRefresh={onRefresh} label="Ya lo abrí, actualizar" variant="ghost" />
        </div>
      }
    />
  );
}

// ── Base: BlockScreen ─────────────────────────────────────────────────────────

const VARIANTS = {
  danger: {
    // Orbs de fondo
    orb1:       'bg-rose-600/25',
    orb2:       'bg-rose-400/15',
    // Card
    cardBorder: 'border-rose-500/20',
    cardBg:     'bg-rose-950/40',
    // Accent bar
    accentBar:  'from-rose-500 via-rose-400 to-pink-400',
    // Icon
    iconBg:     'bg-rose-500/10',
    iconRing:   'ring-rose-500/25',
    iconColor:  'text-rose-400',
    // Badge
    badgeBg:    'bg-rose-500/10 border-rose-500/25 text-rose-300',
    // Title
    titleColor: 'text-white',
    // Pulse dot
    pulseDot:   'bg-rose-400',
  },
  warning: {
    orb1:       'bg-amber-600/25',
    orb2:       'bg-orange-400/15',
    cardBorder: 'border-amber-500/20',
    cardBg:     'bg-amber-950/40',
    accentBar:  'from-amber-500 via-amber-400 to-yellow-400',
    iconBg:     'bg-amber-500/10',
    iconRing:   'ring-amber-500/25',
    iconColor:  'text-amber-400',
    badgeBg:    'bg-amber-500/10 border-amber-500/25 text-amber-300',
    titleColor: 'text-white',
    pulseDot:   'bg-amber-400',
  },
};

export function TurnoBlockScreen({ variant, icon: Icon, title, subtitle, description, actions }) {
  const c = VARIANTS[variant];

  return (
    <div className="turnoguard-root flex h-[calc(100vh-56px)] items-center justify-center p-4 relative overflow-hidden">

      {/* ── Animated background ── */}
      <div className="absolute inset-0 bg-[#0f0f14]" />
      <div className={cn('turnoguard-orb turnoguard-orb-1 absolute rounded-full blur-[80px]', c.orb1)} />
      <div className={cn('turnoguard-orb turnoguard-orb-2 absolute rounded-full blur-[100px]', c.orb2)} />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Card ── */}
      <div
        className={cn(
          'turnoguard-card relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden',
          c.cardBorder,
          c.cardBg,
        )}
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        {/* Top accent bar with animated shimmer */}
        <div className={cn('relative h-[3px] w-full overflow-hidden bg-gradient-to-r', c.accentBar)}>
          <div className="turnoguard-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>

        <div className="p-8 text-center space-y-7">

          {/* ── Icon area ── */}
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              'turnoguard-icon relative flex size-[72px] items-center justify-center rounded-[20px] ring-1',
              c.iconBg, c.iconRing,
            )}>
              <Icon className={cn('size-8', c.iconColor)} />
              {/* Pulse ring */}
              <span className={cn('absolute inset-0 rounded-[20px] ring-1 animate-ping opacity-30', c.iconRing)} />
            </div>

            {/* Status badge */}
            <span className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full border',
              c.badgeBg,
            )}>
              <span className={cn('size-1.5 rounded-full', c.pulseDot)} />
              Acceso restringido
            </span>
          </div>

          {/* ── Texts ── */}
          <div className="space-y-2.5">
            <h1 className={cn('text-[26px] font-bold tracking-tight', c.titleColor)}>
              {title}
            </h1>
            <p className="text-sm font-medium text-white/70">
              {subtitle}
            </p>
            <p className="text-[13px] text-white/45 leading-relaxed max-w-xs mx-auto">
              {description}
            </p>
          </div>

          {actions && (
            <>
              <div className="h-px bg-white/5 mx-4" />
              <div>{actions}</div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .turnoguard-root {
          animation: tg-fade-in 0.4s ease both;
        }
        @keyframes tg-fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }

        .turnoguard-card {
          animation: tg-slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both;
        }
        @keyframes tg-slide-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .turnoguard-orb {
          pointer-events: none;
        }
        .turnoguard-orb-1 {
          width: 480px; height: 480px;
          top: -140px; left: -100px;
          animation: tg-float1 9s ease-in-out infinite;
        }
        .turnoguard-orb-2 {
          width: 360px; height: 360px;
          bottom: -80px; right: -80px;
          animation: tg-float2 11s ease-in-out infinite;
        }
        @keyframes tg-float1 {
          0%,100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(30px, 20px) scale(1.05); }
        }
        @keyframes tg-float2 {
          0%,100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-20px, -25px) scale(1.04); }
        }

        .turnoguard-icon {
          animation: tg-icon-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
        }
        @keyframes tg-icon-in {
          from { opacity: 0; transform: scale(0.5) rotate(-12deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        .turnoguard-shimmer {
          animation: tg-shimmer 3s ease-in-out 1s infinite;
        }
        @keyframes tg-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// ── Helper: Botón de Refresh ───────────────────────────────────────────────────

function RefreshButton({ onRefresh, label, variant = 'outline' }) {
  const base = 'flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all active:scale-[0.98]';
  const styles = {
    outline: 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90',
    ghost:   'text-white/50 hover:text-white/80 hover:bg-white/5',
  };

  return (
    <button onClick={onRefresh} className={cn(base, styles[variant])}>
      <RefreshCw className="size-3.5" />
      {label}
    </button>
  );
}
