import { useEffect, useState } from 'react';
import { CalendarDays, SlidersHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportDateRangePicker } from './ReportDateRangePicker';

export function ReportDateFilterDialog({ open, onOpenChange, from, to, title, description, loading, onApply }) {
  const [draft, setDraft] = useState({ from, to });

  useEffect(() => {
    if (open) setDraft({ from, to });
  }, [from, open, to]);

  const apply = () => {
    if (!draft.from || !draft.to) return;
    onApply(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-[760px]">
        <DialogHeader className="border-b border-border/70 px-6 py-5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><SlidersHorizontal className="size-5" /></div>
            <div><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></div>
          </div>
        </DialogHeader>
        <div className="grid gap-6 px-6 py-5 md:grid-cols-[350px_1fr]">
          <ReportDateRangePicker from={draft.from} to={draft.to} onChange={setDraft} />
          <div className="flex flex-col justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground"><CalendarDays className="size-4 text-primary" /> Periodo seleccionado</div>
              <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">El reporte incluirá únicamente la información comprendida entre la fecha inicial y final seleccionadas.</div>
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-border/70 bg-muted/20 px-6 py-4">
          <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-foreground transition hover:bg-muted">Cancelar</button>
          <button type="button" onClick={apply} disabled={loading || !draft.from || !draft.to} className="h-10 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">Generar reporte</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
