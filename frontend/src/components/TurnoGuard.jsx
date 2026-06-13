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
import { AlertTriangle, Lock, Wallet, RefreshCw, ShieldAlert } from 'lucide-react';
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
    <BlockScreen
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
    <BlockScreen
      variant="warning"
      icon={Lock}
      title="Turno No Iniciado"
      subtitle="No tienes un turno de caja abierto."
      description="Debes aperturar tu turno antes de operar el punto de venta. Registra el fondo de apertura para comenzar a vender."
      actions={
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/caja/apertura')}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] px-6 py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-amber-600/30"
          >
            <Wallet className="size-4" />
            Abrir Turno
          </button>
          <RefreshButton onRefresh={onRefresh} label="Ya lo abrí, actualizar" variant="ghost" />
        </div>
      }
    />
  );
}

// ── Base: BlockScreen ─────────────────────────────────────────────────────────

function BlockScreen({ variant, icon: Icon, title, subtitle, description, actions }) {
  const colors = {
    danger: {
      bg:      'from-rose-950/60 to-rose-900/30',
      ring:    'ring-rose-500/20',
      iconBg:  'bg-rose-500/15',
      icon:    'text-rose-400',
      badge:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
      title:   'text-rose-100',
    },
    warning: {
      bg:      'from-amber-950/50 to-amber-900/20',
      ring:    'ring-amber-500/20',
      iconBg:  'bg-amber-500/15',
      icon:    'text-amber-400',
      badge:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
      title:   'text-amber-100',
    },
  }[variant];

  return (
    <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-bg-subtle p-4 animate-fade-in">
      <div
        className={cn(
          'w-full max-w-lg rounded-2xl border bg-gradient-to-b shadow-2xl overflow-hidden',
          'dark:border-white/5 border-black/5',
          colors.ring,
        )}
      >
        {/* Top accent bar */}
        <div
          className={cn(
            'h-1 w-full',
            variant === 'danger' ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-amber-600 to-amber-400',
          )}
        />

        <div className={cn('p-8 text-center space-y-6 bg-gradient-to-b', colors.bg)}>
          {/* Icon */}
          <div className={cn('mx-auto flex size-20 items-center justify-center rounded-2xl ring-1', colors.iconBg, colors.ring)}>
            <Icon className={cn('size-9', colors.icon)} />
          </div>

          {/* Texts */}
          <div className="space-y-2">
            <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border', colors.badge)}>
              <AlertTriangle className="size-3" />
              Acceso restringido
            </span>
            <h1 className={cn('text-2xl font-bold', colors.title)}>{title}</h1>
            <p className="text-sm font-medium text-foreground/80">{subtitle}</p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {description}
            </p>
          </div>

          {/* Actions */}
          <div>{actions}</div>
        </div>
      </div>
    </div>
  );
}

// ── Helper: Botón de Refresh ───────────────────────────────────────────────────

function RefreshButton({ onRefresh, label, variant = 'outline' }) {
  const base = 'flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all active:scale-[0.98]';
  const styles = {
    outline: 'border border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground',
    ghost:   'text-muted-foreground hover:text-foreground hover:bg-muted',
  };

  return (
    <button onClick={onRefresh} className={cn(base, styles[variant])}>
      <RefreshCw className="size-3.5" />
      {label}
    </button>
  );
}
