import { motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Monitor, Wifi, WifiOff, ArrowRight, CheckCircle2, XCircle, Globe } from 'lucide-react';
import {
  ServiceSaveKommerzConfig,
  ServiceGetKommerzConfig,
  ServiceTestLocalServerConnection,
} from '../../../../wailsjs/go/main/App';
import { useActivation } from '@/providers/ActivationProvider';
import { toast } from 'sonner';
import logo from '@/assets/Softi.png';

export function LocalServerSetupPage() {
  const navigate = useNavigate();
  const { setLocalServerURL } = useActivation();
  const [serverURL, setServerURL] = useState('http://');
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'ok' | 'error'
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTest = async () => {
    if (!serverURL || serverURL === 'http://') {
      toast.error('Ingresa la URL del Servidor Local');
      return;
    }
    setTesting(true);
    setConnectionStatus(null);
    try {
      const result = await ServiceTestLocalServerConnection(serverURL);
      if (result?.success) {
        setConnectionStatus('ok');
        toast.success('Conexión exitosa al Servidor Local');
      } else {
        setConnectionStatus('error');
        toast.error(result?.message || 'No se pudo conectar al Servidor Local');
      }
    } catch (err) {
      setConnectionStatus('error');
      toast.error('Error: ' + String(err));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (connectionStatus !== 'ok') {
      toast.error('Primero verifica la conexión al Servidor Local');
      return;
    }
    setSaving(true);
    try {
      const current = await ServiceGetKommerzConfig();
      await ServiceSaveKommerzConfig({
        ...(current || {}),
        localServerUrl: serverURL,
      });
      // Actualizar contexto en memoria para que DeviceGuard deje pasar
      setLocalServerURL(serverURL);
      toast.success('Conexión al Servidor Local configurada');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error('Error al guardar: ' + String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left — Form ─────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center w-full lg:w-[480px] xl:w-[520px] shrink-0 px-8 py-12 bg-background">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 size-96 rounded-full bg-emerald-500/5 blur-3xl" />
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
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Wifi className="size-5" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">
                Configuración de Red
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Conectar al Servidor Local
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresa la dirección IP del Servidor Local en tu red para conectar esta Caja.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* URL field */}
            <div className="space-y-1.5">
              <label htmlFor="serverURL" className="text-sm font-medium text-foreground">
                URL del Servidor Local
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="serverURL"
                  type="url"
                  placeholder="http://192.168.1.10:8989"
                  value={serverURL}
                  onChange={(e) => {
                    setServerURL(e.target.value);
                    setConnectionStatus(null);
                  }}
                  className="w-full rounded-lg border border-border bg-bg-subtle pl-9 pr-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Formato: http://&lt;IP del servidor&gt;:8989
              </p>
            </div>

            {/* Connection status badge */}
            {connectionStatus && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  connectionStatus === 'ok'
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-error/10 text-error border border-error/20'
                }`}
              >
                {connectionStatus === 'ok' ? (
                  <><CheckCircle2 className="size-4" /> Servidor Local alcanzable ✓</>
                ) : (
                  <><XCircle className="size-4" /> No se pudo conectar</>
                )}
              </motion.div>
            )}

            {/* Test button */}
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition disabled:opacity-50"
            >
              {testing ? (
                <><div className="size-4 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" /> Probando conexión...</>
              ) : (
                <><Wifi className="size-4" /> Probar Conexión</>
              )}
            </button>

            {/* Save button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={connectionStatus !== 'ok' || saving}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            >
              {saving ? (
                <><div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Guardando...</>
              ) : (
                <>Guardar y Continuar <ArrowRight className="size-4" /></>
              )}
            </button>
          </div>

          {/* Info tip */}
          <div className="rounded-xl border border-border bg-bg-subtle p-4">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">¿Dónde está el Servidor Local?</span><br />
              En el equipo configurado como Servidor Local, ve a <strong>Ajustes → Configuración del Dispositivo</strong> para ver su dirección IP.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 pt-2 border-t border-border">
            <img src={logo} alt="Softi" className="h-8 w-auto opacity-60" />
          </div>
        </motion.div>
      </div>

      {/* ── Right — Visual ──────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700">
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
              <Server className="size-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-3">
              Red local,<br />operación rápida.
            </h2>
            <p className="text-lg text-white/70 max-w-md">
              Al conectarte al Servidor Local de tu red, operas con datos en tiempo real sin
              depender de Internet.
            </p>
          </motion.div>
        </div>

        {/* Network animation */}
        <div className="absolute top-1/2 right-20 -translate-y-1/2 flex flex-col items-center gap-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: [0, 1, 0], x: [20, 0, 20] }}
              transition={{ duration: 2, delay: i * 0.6, repeat: Infinity }}
              className="flex items-center gap-3"
            >
              <Monitor className="size-6 text-white/40" />
              <WifiOff className="size-4 text-white/20" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
