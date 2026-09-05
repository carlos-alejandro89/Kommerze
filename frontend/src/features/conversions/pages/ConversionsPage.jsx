import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, History, Plus, Repeat2 } from 'lucide-react';

export function ConversionsPage() {
  const navigate = useNavigate();
  return <div className="mx-auto flex min-h-full w-full max-w-[1380px] flex-col gap-5 p-5 lg:p-6">
    <nav className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><button onClick={() => navigate('/home')}>Home</button><span>/</span><span className="text-foreground">Conversiones</span></nav>
    <header className="flex flex-col justify-between gap-4 rounded-2xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] dark:border-white/10 dark:bg-white/[.04] sm:flex-row sm:items-center">
      <div className="flex items-center gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600"><Repeat2 className="size-6" /></div><div><h1 className="text-xl font-bold">Conversiones</h1><p className="mt-1 text-xs text-muted-foreground">Consulta los movimientos realizados entre presentaciones.</p></div></div>
      <div className="flex gap-2"><button onClick={() => navigate('/home')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 px-4 text-xs font-semibold"><ArrowLeft className="size-4" /> Volver</button><button onClick={() => navigate('/conversions/new')} className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"><Plus className="size-4" /> Nueva conversión</button></div>
    </header>
    <section className="flex min-h-[430px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] dark:border-white/10 dark:bg-white/[.04]">
      <div className="border-b border-border/70 px-5 py-4"><h2 className="text-sm font-semibold">Historial de conversiones</h2><p className="mt-1 text-[11px] text-muted-foreground">Aquí se mostrarán las conversiones registradas.</p></div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><div className="flex size-14 items-center justify-center rounded-2xl bg-primary/8 text-primary"><History className="size-6" /></div><p className="mt-4 text-sm font-semibold">Aún no hay historial disponible</p><p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">En esta primera etapa se actualizan las existencias, pero todavía no se almacena una bitácora de conversiones.</p><button onClick={() => navigate('/conversions/new')} className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"><Plus className="size-4" /> Nueva conversión <ArrowRight className="size-4" /></button></div>
    </section>
  </div>;
}
