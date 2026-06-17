import { RefreshCw, Server, Cpu } from 'lucide-react';
import { useActivation } from '@/providers/ActivationProvider';
import { cn } from '@/lib/utils';

/**
 * HomeStatusBar — Barra inferior de estado del sistema.
 * Usa tokens del design system para adaptarse al tema.
 */
export function HomeStatusBar() {
  const { isCaja } = useActivation();

  return (
    <footer className="flex h-9 items-center justify-between px-6 shrink-0 border-t border-border bg-surface">
      {/* Sync status */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <RefreshCw className="size-3 shrink-0" strokeWidth={2.5} />
        <span className="text-[11px]">Último sync hace 5 min</span>
      </div>

      {/* Modo */}
      <div className="flex items-center gap-1.5">
        {isCaja ? (
          <Cpu className="size-3 text-warning shrink-0" strokeWidth={2.5} />
        ) : (
          <Server className="size-3 text-success shrink-0" strokeWidth={2.5} />
        )}
        <span className={cn(
          'text-[11px] font-medium',
          isCaja ? 'text-warning' : 'text-success',
        )}>
          Modo: {isCaja ? 'Caja' : 'Servidor Local'}
        </span>
      </div>

      {/* Shortcuts */}
      <div className="flex items-center gap-3 text-muted-foreground">
        {[
          { key: 'F1',  label: 'Ayuda' },
          { key: 'F5',  label: 'Actualizar' },
          { key: 'F12', label: 'POS' },
        ].map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1 text-[10px]">
            <kbd className="rounded px-1 py-0.5 bg-muted border border-border font-mono text-[9px] text-muted-foreground">
              {key}
            </kbd>
            {label}
          </span>
        ))}
      </div>
    </footer>
  );
}
