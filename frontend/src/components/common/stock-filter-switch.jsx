export function StockFilterSwitch({ checked, onCheckedChange, className = '' }) {
  return (
    <label className={`flex cursor-pointer select-none items-center gap-2 text-[10px] font-medium text-muted-foreground transition hover:text-foreground ${className}`}>
      <span>Solo con existencia</span>
      <span className={`relative h-4 w-7 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/25'}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={event => onCheckedChange(event.target.checked)}
          className="sr-only"
        />
        <span className={`absolute top-0.5 size-3 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
      </span>
    </label>
  );
}
