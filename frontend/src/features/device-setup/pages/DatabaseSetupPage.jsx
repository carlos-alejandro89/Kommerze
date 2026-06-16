import { motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Server,
} from 'lucide-react';
import { ServiceTestDBConnection, ServiceSaveDBConfig, ServiceRestartApp } from '../../../../wailsjs/go/main/App';
import { toast } from 'sonner';
import logo from '@/assets/Softi.png';

const SSL_MODES = ['disable', 'require', 'verify-ca', 'verify-full'];
const TIMEZONES = [
  'America/Mexico_City',
  'America/Tijuana',
  'America/Cancun',
  'America/Chihuahua',
  'America/Mazatlan',
  'America/Monterrey',
  'America/Hermosillo',
];

const defaultForm = {
  host: '127.0.0.1',
  port: '5432',
  user: 'postgres',
  password: '',
  name: 'kommerze_db',
  sslMode: 'disable',
  timeZone: 'America/Mexico_City',
};

export function DatabaseSetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'ok' | 'error'
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setConnectionStatus(null); // resetear estado al editar
  };

  const handleTest = async () => {
    setTesting(true);
    setConnectionStatus(null);
    try {
      const result = await ServiceTestDBConnection(
        form.host,
        form.port,
        form.user,
        form.password,
        form.name,
        form.sslMode,
        form.timeZone,
      );
      if (result?.success) {
        setConnectionStatus('ok');
        toast.success('Conexión exitosa a PostgreSQL');
      } else {
        setConnectionStatus('error');
        toast.error(result?.message || 'No se pudo conectar a la base de datos');
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
      toast.error('Primero verifica la conexión a la base de datos');
      return;
    }
    setSaving(true);
    try {
      await ServiceSaveDBConfig(
        form.host,
        form.port,
        form.user,
        form.password,
        form.name,
        form.sslMode,
        form.timeZone,
      );
      setRestarting(true);
      await new Promise((r) => setTimeout(r, 1500));
      ServiceRestartApp(); // cierra la app → usuario la reabre con config completa
    } catch (err) {
      toast.error('Error al guardar: ' + String(err));
      setSaving(false);
    }
  };

  // Pantalla de reinicio
  if (restarting) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background gap-6">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-500/15">
          <div className="size-8 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        </div>
        <div className="text-center px-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Configuración guardada</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            La aplicación se cerrará. Ábrela nuevamente para continuar con la activación de licencia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left — Form ─────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center w-full lg:w-[520px] shrink-0 px-8 py-12 bg-background overflow-y-auto">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 size-96 rounded-full bg-indigo-500/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-sm space-y-7"
        >
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                <Database className="size-5" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">
                Base de Datos
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Configurar conexión a PostgreSQL
            </h1>
            <p className="text-sm text-muted-foreground">
              Revisa y ajusta los parámetros de conexión. Los valores por defecto funcionan con una instalación estándar de PostgreSQL.
            </p>
          </div>

          {/* Form fields */}
          <div className="space-y-4">

            {/* Host + Puerto en la misma fila */}
            <div className="grid grid-cols-[1fr_5.5rem] gap-3">
              <Field label="Host" id="dbHost" value={form.host} onChange={handleChange('host')} placeholder="127.0.0.1" />
              <Field label="Puerto" id="dbPort" value={form.port} onChange={handleChange('port')} placeholder="5432" />
            </div>

            {/* Usuario */}
            <Field label="Usuario" id="dbUser" value={form.user} onChange={handleChange('user')} placeholder="postgres" />

            {/* Contraseña */}
            <div className="space-y-1.5">
              <label htmlFor="dbPassword" className="text-sm font-medium text-foreground">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="dbPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sin contraseña"
                  value={form.password}
                  onChange={handleChange('password')}
                  className="w-full rounded-lg border border-border bg-bg-subtle pr-9 pl-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Nombre BD */}
            <Field label="Nombre de la base de datos" id="dbName" value={form.name} onChange={handleChange('name')} placeholder="kommerze_db" />

            {/* SSL Mode */}
            <div className="grid grid-cols-[1fr_1fr] gap-3">
              <div className="space-y-1.5">
                <label htmlFor="dbSslMode" className="text-sm font-medium text-foreground">
                  Modo SSL
                </label>
                <div className="relative">
                  <select
                    id="dbSslMode"
                    value={form.sslMode}
                    onChange={handleChange('sslMode')}
                    className="w-full appearance-none rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 pr-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer"
                  >
                    {SSL_MODES.map((m) => (
                      <option key={m} value={m} className="bg-background text-foreground">
                        {m}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* TimeZone */}
              <div className="space-y-1.5">
                <label htmlFor="dbTimeZone" className="text-sm font-medium text-foreground">
                  Zona Horaria
                </label>
                <div className="relative">
                  <select
                    id="dbTimeZone"
                    value={form.timeZone}
                    onChange={handleChange('timeZone')}
                    className="w-full appearance-none rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 pr-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz} className="bg-background text-foreground">
                        {tz.split('/')[1]?.replace('_', ' ') || tz}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
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
                  <><CheckCircle2 className="size-4" /> Conexión exitosa ✓</>
                ) : (
                  <><XCircle className="size-4" /> No se pudo conectar</>
                )}
              </motion.div>
            )}

            {/* Test button */}
            <button
              type="button"
              id="btn-test-db"
              onClick={handleTest}
              disabled={testing}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition disabled:opacity-50"
            >
              {testing ? (
                <><div className="size-4 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" /> Probando conexión...</>
              ) : (
                <><Database className="size-4" /> Probar Conexión</>
              )}
            </button>

            {/* Save button */}
            <button
              type="button"
              id="btn-save-db"
              onClick={handleSave}
              disabled={connectionStatus !== 'ok' || saving}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <><div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Guardando...</>
              ) : (
                <>Guardar y Continuar <ArrowRight className="size-4" /></>
              )}
            </button>
          </div>

          <div className="flex flex-col items-center gap-2 pt-2 border-t border-border">
            <img src={logo} alt="Softi" className="h-8 w-auto opacity-60" />
          </div>
        </motion.div>
      </div>

      {/* ── Right — Visual ──────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-700">
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
              Datos locales,<br />operación segura.
            </h2>
            <p className="text-lg text-white/70 max-w-md">
              Kommerze almacena toda la información de ventas e inventario en tu propia base de datos PostgreSQL. Tus datos, bajo tu control.
            </p>
          </motion.div>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-1/2 right-20 -translate-y-1/2 flex flex-col items-center gap-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 2.5, delay: i * 0.7, repeat: Infinity }}
              className="size-3 rounded-full bg-white/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Campo de formulario reutilizable ─────────────────────────────────────────
function Field({ label, id, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
      />
    </div>
  );
}
