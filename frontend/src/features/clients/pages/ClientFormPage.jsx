import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Mail,
  Phone,
  Save,
  UserRound,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { ServiceListarClientes } from '../../../../wailsjs/go/main/App';

const emptyForm = {
  RazonSocial: '',
  RFC: '',
  Correo: '',
  Telefono: '',
  CreditoMaximo: '0',
  DiasCredito: '0',
};

const inputClass = 'h-11 w-full rounded-2xl border border-[#dce7f6] bg-white/90 px-4 text-sm font-medium text-[#1b3154] shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] outline-none transition-all placeholder:text-[#7790b6] focus:border-blue-300/80 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/[.065] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400/35 dark:focus:bg-white/[.085]';

function Field({ label, icon: Icon, required, prefix, children, ...inputProps }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#334a70] dark:text-slate-300">
        {Icon && <Icon className="size-3.5 text-[#6481ad] dark:text-slate-500" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children || (
        <div className="relative">
          {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#6481ad]">{prefix}</span>}
          <input {...inputProps} required={required} className={`${inputClass} ${prefix ? 'pl-9' : ''}`} />
        </div>
      )}
    </label>
  );
}

export function ClientFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { guid } = useParams();
  const editing = Boolean(guid);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!editing) return;
    const supplied = location.state?.client;
    if (supplied?.Guid === guid) {
      setForm({
        RazonSocial: supplied.RazonSocial || '',
        RFC: supplied.RFC || '',
        Correo: supplied.Correo || '',
        Telefono: supplied.Telefono || '',
        CreditoMaximo: String(supplied.CreditoMaximo || 0),
        DiasCredito: String(supplied.DiasCredito || 0),
      });
      setLoading(false);
      return;
    }

    ServiceListarClientes()
      .then(clients => {
        const client = (clients || []).find(item => item.Guid === guid);
        if (!client) throw new Error('Cliente no encontrado');
        setForm({
          RazonSocial: client.RazonSocial || '',
          RFC: client.RFC || '',
          Correo: client.Correo || '',
          Telefono: client.Telefono || '',
          CreditoMaximo: String(client.CreditoMaximo || 0),
          DiasCredito: String(client.DiasCredito || 0),
        });
      })
      .catch(error => {
        toast.error(error?.message || 'No se pudo cargar el cliente');
        navigate('/clients', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [editing, guid, location.state, navigate]);

  const update = field => event => setForm(current => ({ ...current, [field]: event.target.value }));

  const submit = event => {
    event.preventDefault();
    toast.info(`Formulario de ${editing ? 'edición' : 'alta'} validado. El guardado se habilitará en la siguiente etapa.`);
  };

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="mx-auto w-full max-w-[1320px]">
          <nav className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <button type="button" onClick={() => navigate('/home')} className="transition hover:text-primary">Home</button>
            <span>/</span>
            <button type="button" onClick={() => navigate('/clients')} className="transition hover:text-primary">Clientes</button>
            <span>/</span>
            <span className="text-foreground">{editing ? 'Editar cliente' : 'Nuevo cliente'}</span>
          </nav>

          <header className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="size-6" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">{editing ? 'Actualiza la información del cliente seleccionado.' : 'Registra la información general y comercial del cliente.'}</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/clients')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-xs font-semibold text-foreground transition hover:bg-muted">
              <ArrowLeft className="size-4" />
              Volver a clientes
            </button>
          </header>

          <form id="client-form" onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                <div className="mb-5 flex items-center gap-2">
                  <span className="h-5 w-1 rounded-full bg-blue-600" />
                  <h2 className="text-sm font-bold text-foreground">Información general</h2>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Nombre o razón social" icon={Building2} required value={form.RazonSocial} onChange={update('RazonSocial')} placeholder="Ingresa el nombre o razón social" disabled={loading} />
                  <Field label="RFC" icon={FileText} value={form.RFC} onChange={update('RFC')} placeholder="Ingresa el RFC" maxLength={20} disabled={loading} />
                  <Field label="Correo electrónico" icon={Mail} type="email" value={form.Correo} onChange={update('Correo')} placeholder="correo@ejemplo.com" maxLength={150} disabled={loading} />
                  <Field label="Teléfono" icon={Phone} type="tel" value={form.Telefono} onChange={update('Telefono')} placeholder="Número de teléfono" maxLength={30} disabled={loading} />
                </div>
              </section>

              <section className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                <div className="mb-5 flex items-center gap-2">
                  <span className="h-5 w-1 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-bold text-foreground">Información comercial</h2>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Límite de crédito" icon={BadgeDollarSign} prefix="$" type="number" min="0" step="0.01" value={form.CreditoMaximo} onChange={update('CreditoMaximo')} disabled={loading} />
                  <Field label="Días de crédito" icon={CalendarDays} type="number" min="0" step="1" value={form.DiasCredito} onChange={update('DiasCredito')} placeholder="Ej. 30" disabled={loading} />
                </div>
              </section>
            </div>

            <aside className="h-fit overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
              <div className="border-b border-border/70 px-5 py-4"><h2 className="text-sm font-bold text-foreground">Resumen</h2></div>
              <div className="flex flex-col items-center px-5 py-7 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/15 to-violet-500/10 text-blue-600 dark:text-blue-400">
                  <UserRound className="size-7" />
                </div>
                <p className="mt-3 max-w-full truncate text-sm font-bold text-foreground">{form.RazonSocial || 'Nuevo cliente'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{form.RFC || 'RFC sin capturar'}</p>
              </div>
              <div className="space-y-3 border-t border-border/70 px-5 py-4">
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Crédito</span><strong className="text-foreground">${Number(form.CreditoMaximo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></div>
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Plazo</span><strong className="text-foreground">{Number(form.DiasCredito || 0)} días</strong></div>
              </div>
              <div className="border-t border-border/70 bg-blue-500/[.045] p-4">
                <div className="flex gap-2.5 text-[11px] leading-5 text-[#49699d] dark:text-blue-300/80">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  Este formulario todavía no modifica la base de datos.
                </div>
              </div>
            </aside>
          </form>
        </div>
      </div>

      <footer className="shrink-0 border-t border-border/70 bg-background/90 px-5 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1320px] justify-end gap-2">
          <button type="button" onClick={() => navigate('/clients')} className="h-10 rounded-xl border border-border/70 bg-background px-5 text-xs font-semibold text-foreground transition hover:bg-muted">Cancelar</button>
          <button form="client-form" type="submit" className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105">
            <Save className="size-4" />
            {editing ? 'Validar cambios' : 'Validar cliente'}
          </button>
        </div>
      </footer>
    </div>
  );
}
