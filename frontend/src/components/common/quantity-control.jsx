import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuantityControl({
  value,
  onChange,
  min = 1,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  disabled = false,
  className,
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const inputRef = useRef(null);
  const precision = String(step).split('.')[1]?.length || 0;

  useEffect(() => {
    if (!editing) setInputValue(String(value));
  }, [editing, value]);

  const normalize = (next) => {
    const numeric = Number(next);
    if (!Number.isFinite(numeric)) return null;
    return Number(Math.min(max, Math.max(min, numeric)).toFixed(precision));
  };

  const commit = () => {
    const normalized = normalize(inputValue);
    if (normalized !== null) onChange(normalized);
    else setInputValue(String(value));
    setEditing(false);
  };

  const changeBy = (delta) => {
    const normalized = normalize(Number(value) + delta);
    if (normalized !== null && normalized !== value) onChange(normalized);
  };

  return (
    <div className={cn(
      'flex h-9 items-center rounded-full border border-slate-200/60 bg-slate-50 p-1 dark:border-zinc-700/50 dark:bg-zinc-800/50',
      disabled && 'opacity-50',
      className,
    )}>
      <button
        type="button"
        onClick={() => changeBy(-step)}
        disabled={disabled || Number(value) <= min}
        aria-label="Disminuir cantidad"
        className="flex size-7 items-center justify-center rounded-full font-medium text-slate-600 transition-all hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-zinc-700"
      >
        <Minus className="size-3" />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          min={min}
          max={Number.isFinite(max) ? max : undefined}
          step={step}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') {
              setInputValue(String(value));
              setEditing(false);
            }
          }}
          className="w-12 rounded border border-primary/30 bg-white px-1 py-0.5 text-center text-xs font-bold tabular-nums outline-none focus:ring-1 focus:ring-primary/50 dark:bg-zinc-700"
          autoFocus
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setEditing(true);
            setInputValue(String(value));
            setTimeout(() => inputRef.current?.select(), 20);
          }}
          title="Clic para editar cantidad"
          className="flex w-10 items-center justify-center text-xs font-bold tabular-nums transition-colors hover:text-primary disabled:cursor-not-allowed"
        >
          {value}
        </button>
      )}

      <button
        type="button"
        onClick={() => changeBy(step)}
        disabled={disabled || Number(value) >= max}
        aria-label="Aumentar cantidad"
        className="flex size-7 items-center justify-center rounded-full font-medium text-slate-600 transition-all hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-zinc-700"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}
