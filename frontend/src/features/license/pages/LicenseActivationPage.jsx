import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Monitor, Fingerprint, CheckCircle } from 'lucide-react';
import { ServiceGetMachineID, ServiceActivateLicense } from '../../../../wailsjs/go/main/App';
import { toast } from 'sonner';
import logo from '@/assets/Softi.png';

export function LicenseActivationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    licenseKey: 'KMZ-STD-23DK-320A',
    deviceName: '',
    machineId: '',
  });

  useEffect(() => {
    ServiceGetMachineID()
      .then((id) => setFormData(prev => ({ ...prev, machineId: id })))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ServiceActivateLicense(formData);
      toast.success('Licencia activada correctamente');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error('No se pudo activar la licencia: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { icon: Fingerprint, label: 'Verificando hardware', done: !!formData.machineId },
    { icon: KeyRound,    label: 'Validando licencia',   done: false },
    { icon: CheckCircle, label: 'Activación completa',  done: false },
  ];

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left — Form ────────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center w-full lg:w-[480px] xl:w-[520px] shrink-0 px-8 py-12 bg-background">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 size-96 rounded-full bg-warning/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-sm space-y-8"
        >
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex size-9 items-center justify-center rounded-xl bg-warning text-white shadow-lg shadow-warning/30">
                <KeyRound className="size-5" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">
                Activación de Licencia
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Activar Kommerze POS
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tu clave de licencia para habilitar el sistema.
            </p>
          </div>

          {/* Progress steps */}
          <div className="flex gap-2">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className={`flex size-8 items-center justify-center rounded-full border-2 transition-colors ${
                  step.done
                    ? 'border-success bg-success/10 text-success'
                    : 'border-border bg-bg-subtle text-muted-foreground'
                }`}>
                  <step.icon className="size-3.5" />
                </div>
                <span className="text-[10px] text-center text-muted-foreground leading-tight">
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="licenseKey" className="text-sm font-medium text-foreground">
                Clave de Licencia
              </label>
              <input
                id="licenseKey"
                type="text"
                placeholder="KMZ-XXX-XXXX-XXXX"
                disabled={loading}
                value={formData.licenseKey}
                onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value })}
                className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="deviceName" className="text-sm font-medium text-foreground">
                Nombre del Dispositivo
              </label>
              <div className="relative">
                <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="deviceName"
                  type="text"
                  placeholder="Ej: Caja 1 — Mostrador"
                  disabled={loading}
                  value={formData.deviceName}
                  onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                  className="w-full rounded-lg border border-border bg-bg-subtle pl-9 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="machineId" className="text-sm font-medium text-foreground">
                ID del Equipo
              </label>
              <div className="relative">
                <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="machineId"
                  type="text"
                  readOnly
                  value={formData.machineId || 'Detectando...'}
                  className="w-full rounded-lg border border-border bg-muted/50 pl-9 pr-3.5 py-2.5 text-sm font-mono text-muted-foreground cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Detectado automáticamente · No modificable
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.machineId}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Activando licencia...</span>
                </>
              ) : (
                'Activar Licencia'
              )}
            </button>
          </form>

          <div className="flex flex-col items-center gap-2 pt-4 border-t border-border">
            <img src={logo} alt="Softi" className="h-10 w-auto opacity-70" />
          </div>
        </motion.div>
      </div>

      {/* ── Right — Visual ──────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(oklch(100% 0 0 / 0.1) 1px, transparent 1px), linear-gradient(90deg, oklch(100% 0 0 / 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 flex flex-col justify-end p-14 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="mb-8 flex size-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <KeyRound className="size-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-3">
              Licencia segura<br />y verificada.
            </h2>
            <p className="text-lg text-white/70 max-w-md">
              Tu licencia vincula este equipo de forma única al sistema Kommerze con criptografía de extremo a extremo.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
