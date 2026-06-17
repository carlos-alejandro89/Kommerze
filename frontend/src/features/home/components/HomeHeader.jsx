import { Store, User, Clock } from 'lucide-react';
import { useActivation } from '@/providers/ActivationProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useState } from 'react';

/**
 * HomeHeader — Barra superior fija de la pantalla principal.
 * Muestra: Logo + Branding | Sucursal/Terminal (centro) | Fecha/Hora + Usuario (derecha)
 */
export function HomeHeader() {
  const { store, operation, license } = useActivation();
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());

  // Actualizar hora cada segundo
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const storeName = store?.Nombre ?? license?.sucursal?.nombreSucursal ?? 'Kommerze POS';
  const terminalName = operation?.Nombre ?? 'Terminal 01';
  const userName = user?.Nombre ?? user?.CorreoElectronico ?? 'Usuario';

  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

  // Iniciales del usuario para avatar
  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <header className="flex h-14 items-center justify-between px-6 shrink-0 border-b border-white/[0.07]">
      {/* ── Logo / Brand ── */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/40">
          <Store className="size-4 text-indigo-400" strokeWidth={2} />
        </div>
        <span className="text-sm font-bold text-white tracking-tight">Kommerze</span>
        <span className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">POS</span>
      </div>

      {/* ── Sucursal / Terminal (centro) ── */}
      <div className="flex flex-col items-center">
        <p className="text-[13px] font-semibold text-white leading-tight">{storeName}</p>
        <p className="text-[11px] text-white/40 leading-tight">{terminalName}</p>
      </div>

      {/* ── Fecha/Hora + Usuario ── */}
      <div className="flex items-center gap-4">
        {/* Clock */}
        <div className="flex items-center gap-1.5 text-white/50">
          <Clock className="size-3.5 shrink-0" strokeWidth={2} />
          <div className="text-right">
            <p className="text-sm font-semibold text-white leading-none">{timeStr}</p>
            <p className="text-[10px] text-white/40 leading-none capitalize">{dateStr}</p>
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.07] px-3 py-1.5">
          <div className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/30 text-[10px] font-bold text-indigo-300 shrink-0">
            {initials || <User className="size-3.5" />}
          </div>
          <span className="text-[12px] font-medium text-white/80 max-w-[120px] truncate">{userName}</span>
        </div>
      </div>
    </header>
  );
}
