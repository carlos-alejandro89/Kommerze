import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RowActionButton({ label, icon: Icon, onClick, disabled, tone = 'text-primary hover:bg-primary/10' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn('group/action relative flex size-8 items-center justify-center rounded-full transition disabled:opacity-40', tone)}
    >
      <Icon className="size-3.5" />
      <span className="pointer-events-none absolute -top-9 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-950 px-2.5 py-1.5 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100">
        {label}
      </span>
    </button>
  );
}

export function RowActionsMenu({ open, onToggle, disabled, children }) {
  return (
    <div className="relative ml-auto flex w-9 items-center justify-end">
      <div className={cn(
        'absolute right-11 top-1/2 z-40 flex origin-right -translate-y-1/2 items-center gap-2 transition-all duration-200 ease-out',
        open
          ? 'pointer-events-auto translate-x-0 scale-100 opacity-100'
          : 'pointer-events-none translate-x-3 scale-95 opacity-0',
      )}>
        <div className="flex items-center rounded-full border border-border/70 bg-background/95 p-1 shadow-[0_16px_36px_-16px_rgba(20,54,110,.75)] backdrop-blur-xl">
          {children}
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        aria-label={open ? 'Cerrar acciones' : 'Mostrar acciones'}
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-50',
          open
            ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
            : 'text-muted-foreground hover:bg-muted hover:text-primary',
        )}
      >
        <MoreVertical className="size-4" />
      </button>
    </div>
  );
}
