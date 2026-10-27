import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';

function parseLocalDate(value) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(value) {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  return value?.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) || '';
}

export function ReportDateRangePicker({ from, to, onChange }) {
  const selected = useMemo(() => ({ from: parseLocalDate(from), to: parseLocalDate(to) }), [from, to]);
  const [month, setMonth] = useState(() => selected.from || new Date());

  const select = (range) => {
    onChange({ from: toISODate(range?.from), to: toISODate(range?.to) });
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        <CalendarDays className="size-4 text-primary" /> Rango de fechas
      </div>
      <div className="w-full max-w-[350px] rounded-2xl border border-[#dfe7f2] bg-muted/15 p-1">
        <div className="flex h-9 items-center justify-between px-2 pt-1">
          <button type="button" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground" aria-label="Mes anterior">
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-[12px] font-semibold capitalize text-foreground">
            {month.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground" aria-label="Mes siguiente">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <Calendar
          mode="range"
          locale={es}
          month={month}
          onMonthChange={setMonth}
          hideNavigation
          selected={selected}
          onSelect={select}
          className="w-full px-3 pb-3 pt-0"
          classNames={{
            months: 'w-full',
            month: 'w-full',
            month_grid: 'w-full table-fixed border-collapse',
            month_caption: 'hidden',
            weekday: 'h-8 w-auto p-0 text-center text-xs font-medium text-muted-foreground/80',
            day: 'group h-9 w-auto px-0 py-px text-center text-sm',
            range_middle: 'range-middle [&>button]:!bg-blue-100 [&>button]:!text-blue-800 dark:[&>button]:!bg-blue-400/20 dark:[&>button]:!text-blue-200',
          }}
        />
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        {selected.from ? `${formatDate(selected.from)}${selected.to ? ` — ${formatDate(selected.to)}` : ''}` : 'Selecciona una fecha inicial y una final'}
      </p>
    </div>
  );
}
