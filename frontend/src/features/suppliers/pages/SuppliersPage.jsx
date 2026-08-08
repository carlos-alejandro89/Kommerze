import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileSearch,
  FileText,
  Handshake,
  Landmark,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { ServiceGetSatRegimenFiscal } from '../../../../wailsjs/go/main/App';

const emptyForm = {
  EntidadGuid: '', RegimenID: '', RazonSocial: '', RFC: '', CodigoPostal: '',
  Correo: '', Telefono: '', Whatsapp: '',
};

const inputClass = 'h-11 w-full rounded-2xl border border-[#dce7f6] bg-white/90 px-4 text-sm font-medium text-[#1b3154] shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] outline-none transition placeholder:text-[#7790b6] focus:border-blue-300/80 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50/80 disabled:text-muted-foreground dark:border-white/10 dark:bg-white/[.065] dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-white/[.025]';

function Field({ label, icon: Icon, required, children, ...props }) {
  return <label className="block min-w-0"><span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#334a70] dark:text-slate-300">{Icon && <Icon className="size-3.5 text-[#6481ad] dark:text-slate-500" />}{label}{required && <span className="text-red-500">*</span>}</span>{children || <input {...props} required={required} className={inputClass} />}</label>;
}

export function SuppliersPage() {
  const navigate = useNavigate();
  const [rfc, setRFC] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('idle');
  const [regimens, setRegimens] = useState([]);
  const [saving, setSaving] = useState(false);
  const lookupTimer = useRef(null);
  const lookupRequest = useRef(0);

  useEffect(() => {
    ServiceGetSatRegimenFiscal().then(result => setRegimens(result?.data || result?.Data || [])).catch(error => toast.error(error?.message || String(error)));
    return () => { if (lookupTimer.current) window.clearTimeout(lookupTimer.current); };
  }, []);

  const normalizeRFC = value => value.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, '').slice(0, 13);
  const onlyDigits = value => value.replace(/\D/g, '');
  const editable = status === 'new';
  const found = status === 'found' || status === 'registered';

  const changeRFC = event => {
    const value = normalizeRFC(event.target.value);
    lookupRequest.current += 1;
    if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    setRFC(value);
    setStatus('idle');
    setForm({ ...emptyForm, RFC: value });
    if ([12, 13].includes(value.length)) {
      lookupTimer.current = window.setTimeout(() => searchRFC(value), 650);
    }
  };

  const searchRFC = async requestedRFC => {
    const value = typeof requestedRFC === 'string' ? requestedRFC : rfc;
    if (![12, 13].includes(value.length)) return;
    const requestID = ++lookupRequest.current;
    setStatus('searching');
    try {
      const entity = await window.go.main.App.ServiceBuscarEntidadFiscalProveedor(value);
      if (lookupRequest.current !== requestID) return;
      if (entity) {
        setForm({
          EntidadGuid: entity.Guid || '', RegimenID: entity.RegimenID ? String(entity.RegimenID) : '',
          RazonSocial: entity.RazonSocial || '', RFC: entity.RFC || value,
          CodigoPostal: entity.CodigoPostal || '', Correo: entity.Correo || '',
          Telefono: entity.Telefono || '', Whatsapp: entity.Whatsapp || '',
        });
        setStatus(entity.EsProveedor ? 'registered' : 'found');
      } else {
        setForm({ ...emptyForm, RFC: value });
        setStatus('new');
      }
    } catch (error) {
      if (lookupRequest.current !== requestID) return;
      setStatus('error');
      toast.error(error?.message || String(error));
    }
  };

  const reset = () => {
    lookupRequest.current += 1;
    if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    setRFC(''); setForm(emptyForm); setStatus('idle');
  };
  const update = (field, transform = value => value) => event => setForm(current => ({ ...current, [field]: transform(event.target.value) }));

  const submit = async event => {
    event.preventDefault();
    if (!['new', 'found'].includes(status)) return;
    setSaving(true);
    try {
      await window.go.main.App.ServiceGuardarProveedor({
        ...form,
        RegimenID: form.RegimenID ? Number(form.RegimenID) : null,
      });
      toast.success(found ? 'El rol PROVEEDOR fue agregado a la entidad fiscal' : 'Proveedor registrado correctamente');
      reset();
    } catch (error) {
      toast.error(error?.message || String(error));
    } finally {
      setSaving(false);
    }
  };

  return <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden">
    <div className="flex-1 overflow-y-auto p-5 lg:p-6">
      <div className="mx-auto w-full max-w-[1320px]">
        <nav className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground"><button type="button" onClick={() => navigate('/home')} className="transition hover:text-primary">Home</button><span>/</span><span className="text-foreground">Proveedores</span></nav>
        <header className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
          <div className="flex items-center gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400"><Handshake className="size-6" strokeWidth={1.8} /></div><div><h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">Alta de proveedores</h1><p className="mt-0.5 text-xs text-muted-foreground">Busca la entidad por RFC antes de registrar su rol fiscal como proveedor.</p></div></div>
          <button type="button" onClick={() => navigate('/home')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-xs font-semibold text-foreground transition hover:bg-muted"><ArrowLeft className="size-4" />Volver al inicio</button>
        </header>

        <form id="supplier-form" onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
              <div className="mb-5 flex items-start gap-2.5"><span className="mt-0.5 h-5 w-1 rounded-full bg-orange-500" /><div><h2 className="text-sm font-bold text-foreground">Validación de RFC</h2><p className="mt-0.5 text-[11px] text-muted-foreground">La búsqueda evita duplicar una razón social registrada previamente como receptor u otro rol fiscal.</p></div></div>
              <div className="flex flex-col gap-3 sm:flex-row"><div className="flex-1"><div className="relative"><FileSearch className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#6481ad]" /><input value={rfc} onChange={changeRFC} onBlur={() => { if (lookupTimer.current) window.clearTimeout(lookupTimer.current); if (['idle', 'error'].includes(status)) searchRFC(rfc); }} placeholder="Ingresa el RFC" maxLength={13} className={`${inputClass} pl-11 pr-11 uppercase tracking-wide`} />{status === 'searching' && <LoaderCircle className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-blue-500" />}{['found', 'registered'].includes(status) && <CheckCircle2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-emerald-500" />}{status === 'new' && <CheckCircle2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-blue-500" />}{status === 'error' && <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => searchRFC(rfc)} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10" title="Reintentar validación"><Search className="size-4" /></button>}</div><p className={cn('mt-1.5 text-[10px]', ['found', 'registered'].includes(status) ? 'text-emerald-600' : status === 'new' ? 'text-blue-600' : status === 'error' ? 'text-red-500' : 'text-muted-foreground')}>{status === 'searching' ? 'Consultando RFC…' : status === 'found' ? 'Entidad fiscal encontrada' : status === 'registered' ? 'Proveedor previamente registrado' : status === 'new' ? 'RFC disponible para nuevo registro' : status === 'error' ? 'No fue posible validar; presiona el icono para reintentar' : 'La validación se realizará automáticamente al completar 12 o 13 caracteres'}</p></div>{status !== 'idle' && <button type="button" onClick={reset} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-4 text-xs font-semibold text-muted-foreground hover:bg-muted"><RotateCcw className="size-4" />Limpiar</button>}</div>
            </section>

            {status === 'idle' ? <section className="rounded-2xl border border-dashed border-[#cedaea] bg-white/35 px-6 py-14 text-center dark:border-white/10 dark:bg-white/[.02]"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600"><FileSearch className="size-6" /></div><h2 className="mt-4 text-sm font-semibold text-foreground">Comienza consultando el RFC</h2><p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-muted-foreground">Los datos fiscales se habilitarán únicamente después de comprobar si la entidad ya existe.</p></section> : <section className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
              <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-start gap-2.5"><span className={cn('mt-0.5 h-5 w-1 rounded-full', found ? 'bg-emerald-500' : 'bg-blue-600')} /><div><h2 className="text-sm font-bold text-foreground">Datos fiscales del proveedor</h2><p className="mt-0.5 text-[11px] text-muted-foreground">{found ? 'Entidad fiscal existente; sus datos se muestran únicamente como referencia.' : 'No encontramos coincidencias. Captura los datos para crear la entidad fiscal.'}</p></div></div><span className={cn('rounded-full border px-2.5 py-1 text-[9px] font-bold', found ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : 'border-blue-500/20 bg-blue-500/10 text-blue-600')}>{found ? 'ENTIDAD ENCONTRADA' : 'NUEVA ENTIDAD'}</span></div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Razón social" icon={Building2} required value={form.RazonSocial} onChange={update('RazonSocial')} placeholder="Razón social registrada ante el SAT" disabled={!editable} />
                <Field label="RFC" icon={FileText} required value={form.RFC} disabled />
                <Field label="Régimen fiscal" icon={Landmark} required><select required value={form.RegimenID} onChange={update('RegimenID')} disabled={!editable} className={inputClass}><option value="">Selecciona un régimen</option>{regimens.map(regimen => <option key={regimen.ID ?? regimen.id} value={regimen.ID ?? regimen.id}>{regimen.Clave ?? regimen.clave} — {regimen.Descripcion ?? regimen.descripcion}</option>)}</select></Field>
                <Field label="Código postal fiscal" icon={MapPin} required inputMode="numeric" pattern="[0-9]*" maxLength={6} value={form.CodigoPostal} onChange={update('CodigoPostal', onlyDigits)} placeholder="Código postal" disabled={!editable} />
                <Field label="Correo electrónico" icon={Mail} type="email" value={form.Correo} onChange={update('Correo')} placeholder="facturacion@proveedor.com" disabled={!editable} />
                <Field label="Teléfono" icon={Phone} type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={20} value={form.Telefono} onChange={update('Telefono', onlyDigits)} placeholder="Número de teléfono" disabled={!editable} />
                <Field label="WhatsApp" icon={WhatsAppIcon} type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={20} value={form.Whatsapp} onChange={update('Whatsapp', onlyDigits)} placeholder="Número de WhatsApp" disabled={!editable} />
              </div>
            </section>}
          </div>

          <aside className="h-fit overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="border-b border-border/70 px-5 py-4"><h2 className="text-sm font-bold text-foreground">Resumen del registro</h2></div>
            <div className="px-5 py-6 text-center"><div className={cn('mx-auto flex size-14 items-center justify-center rounded-2xl', status === 'registered' ? 'bg-amber-500/10 text-amber-600' : 'bg-orange-500/10 text-orange-600')}><Handshake className="size-6" /></div><p className="mt-3 truncate text-sm font-bold text-foreground">{form.RazonSocial || 'Nuevo proveedor'}</p><p className="mt-1 text-xs text-muted-foreground">{form.RFC || 'RFC pendiente de validar'}</p></div>
            <div className="space-y-3 border-t border-border/70 px-5 py-4 text-xs"><Summary label="Rol fiscal" value="PROVEEDOR" /><Summary label="Entidad fiscal" value={found ? 'Existente' : status === 'new' ? 'Nueva' : 'Pendiente'} /><Summary label="Régimen" value={form.RegimenID ? (regimens.find(item => String(item.ID ?? item.id) === String(form.RegimenID))?.Clave ?? 'Seleccionado') : '—'} /></div>
            {status === 'found' && <Info tone="success">La entidad ya existe. Al guardar solamente agregaremos la relación con el rol PROVEEDOR.</Info>}
            {status === 'new' && <Info>El RFC no existe. Se creará una nueva entidad fiscal con el rol PROVEEDOR.</Info>}
            {status === 'registered' && <Info tone="warning">Esta entidad fiscal ya se encuentra registrada como proveedor.</Info>}
          </aside>
        </form>
      </div>
    </div>
    <footer className="shrink-0 border-t border-border/70 bg-background/90 px-5 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-[1320px] justify-end gap-2"><button type="button" onClick={() => navigate('/home')} className="h-10 rounded-xl border border-border/70 bg-background px-5 text-xs font-semibold text-foreground hover:bg-muted">Cancelar</button><button form="supplier-form" type="submit" disabled={saving || !['new', 'found'].includes(status)} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105 disabled:opacity-45"><Save className="size-4" />{saving ? 'Guardando…' : found ? 'Agregar rol de proveedor' : 'Guardar proveedor'}</button></div></footer>
  </div>;
}

function Summary({ label, value }) { return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{label}</span><strong className="truncate text-right text-foreground">{value}</strong></div>; }
function Info({ children, tone = 'info' }) { return <div className={cn('border-t p-4 text-[10px] leading-5', tone === 'success' ? 'border-emerald-500/15 bg-emerald-500/[.045] text-emerald-700 dark:text-emerald-300' : tone === 'warning' ? 'border-amber-500/15 bg-amber-500/[.05] text-amber-700 dark:text-amber-300' : 'border-blue-500/15 bg-blue-500/[.04] text-[#49699d] dark:text-blue-300')}><div className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />{children}</div></div>; }
