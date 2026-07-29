import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Check, CircleCheckBig, ClipboardCopy, PackagePlus, Store, Truck, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

const money = (value) => Number(value || 0).toLocaleString('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

export function ProductRequestConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const confirmation = location.state?.confirmation;
  const [isPulsing, setIsPulsing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsPulsing(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!confirmation) {
    return (
      <div className="flex h-[calc(100vh-56px)] flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">No hay una solicitud recién confirmada para mostrar.</p>
        <button type="button" onClick={() => navigate('/products')} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
          Ir a Productos
        </button>
      </div>
    );
  }

  const isTransfer = confirmation.requestType === 'transferencia';
  const prefix = isTransfer ? 'TRP' : 'BAM';
  const folio = `${prefix}-${String(confirmation.folio || 0).padStart(6, '0')}`;
  const typeLabel = isTransfer ? 'Transferencia a sucursal' : 'Baja de mercancía';
  const TypeIcon = isTransfer ? Truck : Trash2;

  const copyFolio = async () => {
    await navigator.clipboard.writeText(folio);
    toast.success('Folio copiado');
  };

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center px-6 py-10 text-center md:py-14">
        <div className="relative mb-6 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full bg-[#0BC33F]/25 transition-opacity duration-500 ${isPulsing ? 'animate-ping opacity-75' : 'opacity-0'}`} />
          <div className="relative z-[var(--z-layer-raised)] flex size-24 items-center justify-center rounded-full border border-[#0BC33F]/30 bg-[#0BC33F]/10 shadow-[0_0_40px_rgba(11,195,63,0.3)]">
            <CircleCheckBig className="size-12 text-[#0BC33F] animate-[popScale_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]" />
          </div>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-foreground">¡Solicitud creada con éxito!</h1>
        <p className="mb-7 mt-2 text-lg font-medium text-muted-foreground">
          El movimiento fue registrado y las existencias se actualizaron correctamente.
        </p>

        <button type="button" onClick={copyFolio} className="mb-9 flex items-center gap-3 rounded-full border border-primary/20 bg-primary px-5 py-2.5 font-mono text-sm font-bold tracking-widest text-primary-foreground shadow-sm transition hover:brightness-105">
          FOLIO: #{folio}
          <ClipboardCopy className="size-4" />
        </button>

        <div className="mb-9 grid w-full max-w-3xl gap-5 text-left md:grid-cols-2">
          <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl border border-[#002366]/50 bg-gradient-to-br from-[#002366] to-[#001233] p-7 text-white shadow-[0_8px_30px_rgba(0,35,102,0.2)]">
            <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white opacity-[0.03] blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 size-24 rounded-full bg-blue-400 opacity-[0.05] blur-xl" />
            <span className="relative text-[10px] font-bold uppercase tracking-widest text-blue-200/60">Valor total estimado</span>
            <span className="relative mt-2 text-4xl font-black leading-none tracking-tighter tabular-nums text-white drop-shadow-sm">
              {money(confirmation.totalValue)}
            </span>
            <div className="relative mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <SmallValue label="Productos" value={confirmation.itemCount} />
              <SmallValue label="Unidades" value={Number(confirmation.totalUnits || 0).toLocaleString('es-MX')} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Detalle de la solicitud</span>
            <div className="mt-5 space-y-4">
              <DetailRow icon={TypeIcon} label="Tipo de solicitud" value={typeLabel} />
              <DetailRow icon={Store} label="Sucursal de origen" value={confirmation.originBranch?.Nombre || confirmation.originBranch?.nombre || 'Sucursal actual'} />
              {isTransfer && (
                <DetailRow icon={Truck} label="Sucursal destino" value={confirmation.destinationBranch?.NombreSucursal || 'Sucursal seleccionada'} />
              )}
              <DetailRow icon={Check} label="Estado" value={isTransfer ? 'En Tránsito' : 'Completada'} success />
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-3xl flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => navigate('/products')} className="group relative flex h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#002366] to-[#001233] text-xs font-black uppercase tracking-wider text-white shadow-[0_8px_30px_rgba(0,35,102,0.2)] transition active:scale-[.98]">
            <PackagePlus className="relative z-10 size-4" />
            <span className="relative z-10">Nueva solicitud</span>
            <span className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
          </button>
          <button type="button" onClick={() => navigate('/home')} className="h-11 flex-1 rounded-xl border border-border/70 bg-background px-5 text-xs font-semibold text-foreground transition hover:bg-muted">
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}

function SmallValue({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200/55">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-white">{value}</p>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, success = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${success ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600 dark:text-blue-300'}`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-semibold ${success ? 'text-emerald-600' : 'text-foreground'}`}>{value}</p>
      </div>
    </div>
  );
}
