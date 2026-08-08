import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Landmark,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { ServiceGetSatRegimenFiscal } from '../../../../wailsjs/go/main/App';

const emptyClient = {
  RazonSocial: '', Correo: '', Telefono: '', Whatsapp: '',
  CreditoMaximo: '0', DiasCredito: '0', Puntos: '0',
};

const newFiscalEntity = () => ({
  localID: crypto.randomUUID(), Guid: '', RegimenID: '', RazonSocial: '', RFC: '',
  CodigoPostal: '', Correo: '', Telefono: '', Whatsapp: '', lookupStatus: 'idle',
});

const inputClass = 'h-11 w-full rounded-2xl border border-[#dce7f6] bg-white/90 px-4 text-sm font-medium text-[#1b3154] shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] outline-none transition-all placeholder:text-[#7790b6] focus:border-blue-300/80 focus:bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[.065] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400/35 dark:focus:bg-white/[.085]';

function Field({ label, icon: Icon, required, prefix, children, ...inputProps }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#334a70] dark:text-slate-300">
        {Icon && <Icon className="size-3.5 text-[#6481ad] dark:text-slate-500" />}
        {label}{required && <span className="text-red-500">*</span>}
      </span>
      {children || <div className="relative">
        {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#6481ad]">{prefix}</span>}
        <input {...inputProps} required={required} className={`${inputClass} ${prefix ? 'pl-9' : ''}`} />
      </div>}
    </label>
  );
}

function SectionTitle({ color = 'bg-blue-600', children, detail }) {
  return <div className="mb-5 flex items-start gap-2.5">
    <span className={cn('mt-0.5 h-5 w-1 rounded-full', color)} />
    <div><h2 className="text-sm font-bold text-foreground">{children}</h2>{detail && <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>}</div>
  </div>;
}

export function ClientFormPage() {
  const navigate = useNavigate();
  const { guid } = useParams();
  const editing = Boolean(guid);
  const [activeTab, setActiveTab] = useState('cliente');
  const [form, setForm] = useState(emptyClient);
  const [entities, setEntities] = useState([]);
  const [useClientForBilling, setUseClientForBilling] = useState(false);
  const [regimens, setRegimens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const lookupTimers = useRef(new Map());
  const lookupRequests = useRef(new Map());

  useEffect(() => () => {
    lookupTimers.current.forEach(timer => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      ServiceGetSatRegimenFiscal(),
      editing ? window.go.main.App.ServiceObtenerCliente(guid) : Promise.resolve(null),
    ]).then(([catalog, client]) => {
      if (!active) return;
      setRegimens(catalog?.data || catalog?.Data || []);
      if (client) {
        setForm({
          RazonSocial: client.RazonSocial || '', Correo: client.Correo || '',
          Telefono: client.Telefono || '', Whatsapp: client.Whatsapp || '',
          CreditoMaximo: String(client.CreditoMaximo || 0), DiasCredito: String(client.DiasCredito || 0),
          Puntos: String(client.Puntos || 0),
        });
        const fiscalEntities = (client.EntidadesFiscales || []).map(entity => ({
          ...entity, localID: entity.Guid || crypto.randomUUID(), RegimenID: entity.RegimenID ? String(entity.RegimenID) : '', lookupStatus: 'linked',
        }));
        setEntities(fiscalEntities);
        const first = fiscalEntities[0];
        setUseClientForBilling(Boolean(first
          && first.RazonSocial === (client.RazonSocial || '')
          && first.Correo === (client.Correo || '')
          && first.Telefono === (client.Telefono || '')
          && first.Whatsapp === (client.Whatsapp || '')));
      }
    }).catch(error => {
      toast.error(error?.message || String(error));
      if (editing) navigate('/clients', { replace: true });
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [editing, guid, navigate]);

  const updateClient = (field, transform = value => value) => event => {
    const value = transform(event.target.value);
    setForm(current => ({ ...current, [field]: value }));
    if (useClientForBilling && ['RazonSocial', 'Correo', 'Telefono', 'Whatsapp'].includes(field)) {
      setEntities(current => current.map((entity, index) => index === 0 ? { ...entity, [field]: value } : entity));
    }
  };
  const updateEntity = (localID, field, transform = value => value) => event => setEntities(current => current.map(entity => entity.localID === localID
    ? { ...entity, [field]: field === 'RFC' ? transform(event.target.value).toUpperCase() : transform(event.target.value) }
    : entity));

  const onlyDigits = value => value.replace(/\D/g, '');
  const normalizeRFC = value => value.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, '').slice(0, 13);

  const scheduleFiscalLookup = (localID, index, value) => {
    const previous = lookupTimers.current.get(localID);
    if (previous) window.clearTimeout(previous);
    if (![12, 13].includes(value.length)) return;
    const timer = window.setTimeout(() => searchFiscalEntity(localID, index, value), 650);
    lookupTimers.current.set(localID, timer);
  };

  const updateEntityRFC = (localID, index) => event => {
    const value = normalizeRFC(event.target.value);
    lookupRequests.current.set(localID, (lookupRequests.current.get(localID) || 0) + 1);
    setEntities(current => current.map(entity => entity.localID === localID
      ? { ...entity, RFC: value, Guid: '', lookupStatus: 'idle' }
      : entity));
    scheduleFiscalLookup(localID, index, value);
  };

  const searchFiscalEntity = async (localID, index, requestedRFC) => {
    const current = entities.find(entity => entity.localID === localID);
    const fiscalRFC = requestedRFC || current?.RFC || '';
    if (![12, 13].includes(fiscalRFC.length)) return;
    const requestID = (lookupRequests.current.get(localID) || 0) + 1;
    lookupRequests.current.set(localID, requestID);
    setEntities(list => list.map(entity => entity.localID === localID ? { ...entity, lookupStatus: 'searching' } : entity));
    try {
      const found = await window.go.main.App.ServiceBuscarEntidadFiscalPorRFC(fiscalRFC);
      if (lookupRequests.current.get(localID) !== requestID) return;
      if (found) {
        setEntities(list => list.map(entity => entity.localID === localID ? {
          ...entity,
          Guid: found.Guid || '', RegimenID: found.RegimenID ? String(found.RegimenID) : '',
          RazonSocial: found.RazonSocial || '', RFC: found.RFC || fiscalRFC,
          CodigoPostal: found.CodigoPostal || '', Correo: found.Correo || '',
          Telefono: found.Telefono || '', Whatsapp: found.Whatsapp || '', lookupStatus: 'found',
        } : entity));
        if (index === 0 && useClientForBilling) setUseClientForBilling(false);
      } else {
        setEntities(list => list.map(entity => entity.localID === localID ? { ...entity, Guid: '', lookupStatus: 'new' } : entity));
      }
    } catch (error) {
      if (lookupRequests.current.get(localID) !== requestID) return;
      setEntities(list => list.map(entity => entity.localID === localID ? { ...entity, lookupStatus: 'error' } : entity));
      toast.error(error?.message || String(error));
    }
  };

  const addEntity = () => {
    setEntities(current => [...current, newFiscalEntity()]);
    setActiveTab('fiscal');
  };
  const removeEntity = localID => {
    if (useClientForBilling && entities[0]?.localID === localID) setUseClientForBilling(false);
    setEntities(current => current.filter(entity => entity.localID !== localID));
  };

  const toggleBillingData = event => {
    const checked = event.target.checked;
    setUseClientForBilling(checked);
    if (!checked) return;
    setEntities(current => {
      const fiscal = current[0] || newFiscalEntity();
      const synchronized = {
        ...fiscal,
        RazonSocial: form.RazonSocial,
        Correo: form.Correo,
        Telefono: form.Telefono,
        Whatsapp: form.Whatsapp,
      };
      return current.length ? [synchronized, ...current.slice(1)] : [synchronized];
    });
  };

  const selectedRegimen = entity => regimens.find(item => String(item.ID ?? item.id) === String(entity.RegimenID));
  const initials = useMemo(() => form.RazonSocial.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'CL', [form.RazonSocial]);

  const submit = async event => {
    event.preventDefault();
    if (entities.some(entity => !['linked', 'found', 'new'].includes(entity.lookupStatus))) {
      setActiveTab('fiscal');
      toast.error('Valida el RFC de cada razón social antes de guardar');
      return;
    }
    setSaving(true);
    try {
      await window.go.main.App.ServiceGuardarCliente({
        Guid: guid || '', ...form,
        CreditoMaximo: Number(form.CreditoMaximo || 0), DiasCredito: Number(form.DiasCredito || 0), Puntos: Number(form.Puntos || 0),
        EntidadesFiscales: entities.map(({ localID, lookupStatus, ...entity }) => ({ ...entity, RegimenID: entity.RegimenID ? Number(entity.RegimenID) : null })),
      });
      toast.success(editing ? 'Cliente actualizado correctamente' : 'Cliente registrado correctamente');
      navigate('/clients');
    } catch (error) {
      toast.error(error?.message || String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="mx-auto w-full max-w-[1320px]">
          <nav className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <button type="button" onClick={() => navigate('/home')} className="transition hover:text-primary">Home</button><span>/</span>
            <button type="button" onClick={() => navigate('/clients')} className="transition hover:text-primary">Clientes</button><span>/</span>
            <span className="text-foreground">{editing ? 'Editar cliente' : 'Nuevo cliente'}</span>
          </nav>

          <header className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400"><Users className="size-6" strokeWidth={1.8} /></div>
              <div><h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h1><p className="mt-0.5 text-xs text-muted-foreground">Información comercial y razones sociales para facturación.</p></div>
            </div>
            <button type="button" onClick={() => navigate('/clients')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-xs font-semibold text-foreground transition hover:bg-muted"><ArrowLeft className="size-4" />Volver a clientes</button>
          </header>

          <div className="mb-4 flex justify-end rounded-2xl border border-white/70 bg-white/55 p-2.5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[.035]">
            <div className="flex rounded-xl border border-border/60 bg-muted/35 p-1">
              {[{ id: 'cliente', label: 'Datos del cliente', icon: UserRound }, { id: 'fiscal', label: 'Datos fiscales', icon: Landmark }].map(tab => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={cn('flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition', activeTab === tab.id ? 'border border-border/60 bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground')}><tab.icon className="size-3.5" />{tab.label}{tab.id === 'fiscal' && <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] text-blue-600">{entities.length}</span>}</button>)}
            </div>
          </div>

          <form id="client-form" onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              {activeTab === 'cliente' && <>
                <section className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                  <SectionTitle>Información general</SectionTitle>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Nombre del cliente" icon={UserRound} required value={form.RazonSocial} onChange={updateClient('RazonSocial')} placeholder="Nombre completo o nombre comercial" disabled={loading} />
                    <Field label="Correo electrónico" icon={Mail} type="email" value={form.Correo} onChange={updateClient('Correo')} placeholder="correo@ejemplo.com" maxLength={150} disabled={loading} />
                    <Field label="Teléfono" icon={Phone} type="tel" inputMode="numeric" pattern="[0-9]*" value={form.Telefono} onChange={updateClient('Telefono', onlyDigits)} placeholder="Número de teléfono" maxLength={30} disabled={loading} />
                    <Field label="WhatsApp" icon={WhatsAppIcon} type="tel" inputMode="numeric" pattern="[0-9]*" value={form.Whatsapp} onChange={updateClient('Whatsapp', onlyDigits)} placeholder="Número de WhatsApp" maxLength={20} disabled={loading} />
                  </div>
                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-blue-200/70 bg-blue-500/[.035] p-4 transition hover:border-blue-300 dark:border-blue-400/15 dark:bg-blue-400/[.035]">
                    <input type="checkbox" checked={useClientForBilling} onChange={toggleBillingData} className="mt-0.5 size-4 rounded border-border text-blue-600 accent-blue-600" />
                    <span className="min-w-0"><span className="block text-xs font-semibold text-foreground">Usar los datos del cliente para facturación</span><span className="mt-1 block text-[11px] leading-5 text-muted-foreground">Se creará o actualizará la primera razón social receptora con el nombre y los datos de contacto del cliente. RFC, régimen y código postal se capturan en Datos fiscales.</span></span>
                  </label>
                </section>
                <section className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                  <SectionTitle color="bg-emerald-500">Información comercial</SectionTitle>
                  <div className="grid gap-5 md:grid-cols-3">
                    <Field label="Límite de crédito" icon={BadgeDollarSign} prefix="$" type="number" min="0" step="0.01" value={form.CreditoMaximo} onChange={updateClient('CreditoMaximo')} disabled={loading} />
                    <Field label="Días de crédito" icon={CalendarDays} type="number" min="0" step="1" value={form.DiasCredito} onChange={updateClient('DiasCredito')} disabled={loading} />
                    <Field label="Puntos" icon={CreditCard} type="number" min="0" step="1" value={form.Puntos} onChange={updateClient('Puntos')} disabled={loading} />
                  </div>
                </section>
              </>}

              {activeTab === 'fiscal' && <section className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                <div className="flex items-start justify-between gap-4">
                  <SectionTitle detail="Agrega únicamente las razones sociales que el cliente utilizará para facturación.">Razones sociales para facturación</SectionTitle>
                  <button type="button" onClick={addEntity} className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-500"><Plus className="size-3.5" />Agregar</button>
                </div>
                {entities.length === 0 ? <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-500/[.025] px-6 py-12 text-center dark:border-blue-400/15">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600"><Landmark className="size-6" /></div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">Sin datos fiscales</h3><p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">Los datos fiscales son opcionales. Puedes registrar una o varias razones sociales receptoras.</p>
                  <button type="button" onClick={addEntity} className="mt-4 text-xs font-semibold text-blue-600 hover:underline">Agregar la primera razón social</button>
                </div> : <div className="space-y-4">{entities.map((entity, index) => <div key={entity.localID} className="overflow-hidden rounded-2xl border border-[#dfe8f5] bg-white/55 dark:border-white/10 dark:bg-white/[.025]">
                  <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-blue-500/[.055] to-transparent px-4 py-3">
                    <div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-600">{index + 1}</span><div><p className="text-xs font-semibold text-foreground">{entity.RazonSocial || `Razón social ${index + 1}`}</p><span className="text-[9px] font-bold tracking-wide text-blue-600">RECEPTOR</span>{entity.lookupStatus === 'found' && <span className="ml-2 text-[9px] font-bold text-emerald-600">ENTIDAD EXISTENTE</span>}{entity.lookupStatus === 'new' && <span className="ml-2 text-[9px] font-bold text-amber-600">NUEVA ENTIDAD</span>}</div></div>
                    <button type="button" onClick={() => removeEntity(entity.localID)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500" title="Eliminar razón social"><Trash2 className="size-3.5" /></button>
                  </div>
                  <div className="grid gap-5 p-4 md:grid-cols-2">
                    <Field label="Razón social" icon={Building2} required value={entity.RazonSocial} onChange={updateEntity(entity.localID, 'RazonSocial')} placeholder="Razón social registrada ante el SAT" disabled={entity.lookupStatus === 'found' || (useClientForBilling && index === 0)} />
                    <Field label="RFC" icon={FileText} required><div className="relative"><input required value={entity.RFC} onChange={updateEntityRFC(entity.localID, index)} onBlur={() => { const timer = lookupTimers.current.get(entity.localID); if (timer) window.clearTimeout(timer); if (['idle', 'error'].includes(entity.lookupStatus)) searchFiscalEntity(entity.localID, index, entity.RFC); }} placeholder="RFC" maxLength={13} className={`${inputClass} pr-11 uppercase`} />{entity.lookupStatus === 'searching' && <LoaderCircle className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-blue-500" />}{['found', 'linked'].includes(entity.lookupStatus) && <CheckCircle2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-emerald-500" />}{entity.lookupStatus === 'new' && <CheckCircle2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-blue-500" />}{entity.lookupStatus === 'error' && <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => searchFiscalEntity(entity.localID, index, entity.RFC)} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10" title="Reintentar validación"><Search className="size-4" /></button>}</div><p className={cn('mt-1.5 text-[10px]', entity.lookupStatus === 'found' || entity.lookupStatus === 'linked' ? 'text-emerald-600' : entity.lookupStatus === 'new' ? 'text-blue-600' : entity.lookupStatus === 'error' ? 'text-red-500' : 'text-muted-foreground')}>{entity.lookupStatus === 'searching' ? 'Consultando RFC…' : entity.lookupStatus === 'found' ? 'Entidad fiscal encontrada' : entity.lookupStatus === 'linked' ? 'Entidad fiscal vinculada' : entity.lookupStatus === 'new' ? 'RFC disponible para nuevo registro' : entity.lookupStatus === 'error' ? 'No fue posible validar; presiona el icono para reintentar' : 'La validación se realizará automáticamente'}</p></Field>
                    <Field label="Régimen fiscal" icon={Landmark} required><select required value={entity.RegimenID} onChange={updateEntity(entity.localID, 'RegimenID')} disabled={entity.lookupStatus === 'found'} className={inputClass}><option value="">Selecciona un régimen</option>{regimens.map(regimen => <option key={regimen.ID ?? regimen.id} value={regimen.ID ?? regimen.id}>{regimen.Clave ?? regimen.clave} — {regimen.Descripcion ?? regimen.descripcion}</option>)}</select></Field>
                    <Field label="Código postal fiscal" icon={MapPin} required inputMode="numeric" pattern="[0-9]*" value={entity.CodigoPostal} onChange={updateEntity(entity.localID, 'CodigoPostal', onlyDigits)} placeholder="Código postal" maxLength={6} disabled={entity.lookupStatus === 'found'} />
                    <Field label="Correo electrónico" icon={Mail} type="email" value={entity.Correo} onChange={updateEntity(entity.localID, 'Correo')} placeholder="facturacion@ejemplo.com" maxLength={150} disabled={entity.lookupStatus === 'found' || (useClientForBilling && index === 0)} />
                    <Field label="Teléfono" icon={Phone} type="tel" inputMode="numeric" pattern="[0-9]*" value={entity.Telefono} onChange={updateEntity(entity.localID, 'Telefono', onlyDigits)} placeholder="Número de teléfono" maxLength={20} disabled={entity.lookupStatus === 'found' || (useClientForBilling && index === 0)} />
                    <Field label="WhatsApp" icon={WhatsAppIcon} type="tel" inputMode="numeric" pattern="[0-9]*" value={entity.Whatsapp} onChange={updateEntity(entity.localID, 'Whatsapp', onlyDigits)} placeholder="Número de WhatsApp" maxLength={20} disabled={entity.lookupStatus === 'found' || (useClientForBilling && index === 0)} />
                  </div>
                </div>)}</div>}
              </section>}
            </div>

            <aside className="h-fit space-y-4">
              <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                <div className="border-b border-border/70 px-5 py-4"><h2 className="text-sm font-bold text-foreground">Resumen del cliente</h2></div>
                <div className="flex items-center gap-3 px-5 py-5"><div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/15 to-violet-500/10 text-sm font-bold text-blue-600">{initials}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{form.RazonSocial || 'Nuevo cliente'}</p><p className="mt-1 text-[11px] text-emerald-600">Cliente activo</p></div></div>
                <div className="space-y-3 border-t border-border/70 px-5 py-4 text-xs">
                  <SummaryRow label="Teléfono" value={form.Telefono || '—'} /><SummaryRow label="Correo" value={form.Correo || '—'} /><SummaryRow label="Crédito" value={Number(form.CreditoMaximo || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} /><SummaryRow label="Plazo" value={`${Number(form.DiasCredito || 0)} días`} /><SummaryRow label="Puntos" value={Number(form.Puntos || 0).toLocaleString('es-MX')} />
                </div>
              </section>
              <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
                <div className="flex items-center justify-between border-b border-border/70 px-5 py-4"><h2 className="text-sm font-bold text-foreground">Datos fiscales</h2><button type="button" onClick={addEntity} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600"><Plus className="size-3" />Agregar</button></div>
                <div className="space-y-2.5 p-4">{entities.map((entity, index) => <button type="button" key={entity.localID} onClick={() => setActiveTab('fiscal')} className="w-full rounded-xl border border-border/65 bg-background/45 p-3 text-left transition hover:border-blue-300/60 hover:bg-blue-500/[.025]"><div className="flex items-center justify-between"><span className="text-[9px] font-bold text-blue-600">RECEPTOR</span>{index === 0 && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-600">PRINCIPAL</span>}</div><p className="mt-1.5 truncate text-xs font-semibold text-foreground">{entity.RazonSocial || `Razón social ${index + 1}`}</p><p className="mt-1 text-[10px] text-muted-foreground">RFC: {entity.RFC || 'Sin capturar'}</p>{selectedRegimen(entity) && <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-muted-foreground">{selectedRegimen(entity).Clave ?? selectedRegimen(entity).clave} — {selectedRegimen(entity).Descripcion ?? selectedRegimen(entity).descripcion}</p>}</button>)}{!entities.length && <p className="py-5 text-center text-[11px] text-muted-foreground">Sin razones sociales registradas.</p>}</div>
                <div className="border-t border-border/70 bg-blue-500/[.035] p-4"><div className="flex gap-2 text-[10px] leading-4 text-[#49699d] dark:text-blue-300/80"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />Un cliente puede utilizar varias razones sociales para facturación.</div></div>
              </section>
            </aside>
          </form>
        </div>
      </div>

      <footer className="shrink-0 border-t border-border/70 bg-background/90 px-5 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-[1320px] justify-end gap-2"><button type="button" onClick={() => navigate('/clients')} className="h-10 rounded-xl border border-border/70 bg-background px-5 text-xs font-semibold text-foreground transition hover:bg-muted">Cancelar</button><button form="client-form" type="submit" disabled={saving || loading} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105 disabled:opacity-50"><Save className="size-4" />{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar cliente'}</button></div></footer>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return <div className="flex items-center justify-between gap-3"><span className="shrink-0 text-muted-foreground">{label}</span><strong className="truncate text-right font-semibold text-foreground">{value}</strong></div>;
}
