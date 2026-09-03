import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Cloud, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { ServiceConfigureCloud, ServiceGetKommerzConfig } from '../../../../wailsjs/go/main/App';
import { toast } from 'sonner';
import logo from '@/assets/Softi.png';

const DEFAULT_API_URL = 'https://kommerze-cloud-api.developers-lab.com';

export function CloudSetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ cloudEmail: '', cloudPassword: '', cloudApiUrl: DEFAULT_API_URL });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ServiceGetKommerzConfig().then((cfg) => setForm((current) => ({
      cloudEmail: cfg?.cloudEmail || current.cloudEmail,
      cloudPassword: cfg?.cloudPassword || current.cloudPassword,
      cloudApiUrl: cfg?.cloudApiUrl || current.cloudApiUrl,
    }))).catch(() => {});
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await ServiceConfigureCloud(form.cloudEmail, form.cloudPassword, form.cloudApiUrl);
      if (!result?.success) throw new Error(result?.message || result?.errors?.join(', ') || 'Conexión rechazada');
      toast.success('Conexión Cloud establecida');
      navigate('/device-setup/sync', { replace: true });
    } catch (error) {
      toast.error(String(error).replace(/^Error:\s*/, ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="relative flex w-full shrink-0 items-center justify-center overflow-y-auto px-8 py-12 lg:w-[520px]">
        <div className="absolute -right-32 -top-32 size-80 rounded-full bg-primary/5 blur-3xl" />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm space-y-7">
          <div>
            <div className="mb-6 flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Cloud className="size-5" /></div>
              <span className="text-lg font-bold">Conexión Cloud</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Conecta Kommerze Cloud</h1>
            <p className="mt-2 text-sm text-muted-foreground">Usaremos estos datos para descargar los catálogos y mantener la operación sincronizada.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field id="cloudApiUrl" label="API Cloud" type="url" value={form.cloudApiUrl} onChange={(value) => setForm({ ...form, cloudApiUrl: value })} placeholder="https://api.ejemplo.com" />
            <Field id="cloudEmail" label="Correo Cloud" type="email" value={form.cloudEmail} onChange={(value) => setForm({ ...form, cloudEmail: value })} placeholder="correo@empresa.com" />
            <div className="space-y-1.5">
              <label htmlFor="cloudPassword" className="text-sm font-medium">Contraseña Cloud</label>
              <div className="relative">
                <input id="cloudPassword" required disabled={loading} type={showPassword ? 'text' : 'password'} value={form.cloudPassword} onChange={(e) => setForm({ ...form, cloudPassword: e.target.value })} className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-105 disabled:opacity-50">
              {loading ? <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Validando conexión...</> : <>Conectar y continuar <ArrowRight className="size-4" /></>}
            </button>
          </form>
          <div className="flex justify-center border-t border-border pt-4"><img src={logo} alt="Softi" className="h-8 w-auto opacity-60" /></div>
        </motion.div>
      </div>
      <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-sky-950 via-blue-900 to-primary lg:flex">
        <div className="relative z-10 flex flex-col justify-end p-14 text-white">
          <div className="mb-8 flex size-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><ShieldCheck className="size-8" /></div>
          <h2 className="text-4xl font-bold tracking-tight">Tu operación,<br />siempre conectada.</h2>
          <p className="mt-3 max-w-md text-lg text-white/70">Validaremos el acceso antes de guardar la configuración y comenzar la sincronización inicial.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, placeholder, type }) {
  return <div className="space-y-1.5"><label htmlFor={id} className="text-sm font-medium">{label}</label><input id={id} type={type} required value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" /></div>;
}
