import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import logo from '@/assets/Softi.png';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { verifyLicense, storeStatus, empresa, getInventoryValue } = useActivation();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: 'admin@kommerze.com',
    password: 'admin123',
  });

  useEffect(() => {
    const checkLicense = async () => {
      const ok = await verifyLicense();
      if (!ok) navigate('/license/activate', { replace: true });
    };
    checkLicense();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!empresa) storeStatus().catch(() => {});
    await login(formData.username, formData.password);
    await getInventoryValue().catch(() => {});
    setLoading(false);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left Panel — Form ──────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center w-full lg:w-[480px] xl:w-[520px] shrink-0 px-8 py-12 bg-background">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 size-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-accent-500/5 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-sm space-y-8"
        >
          {/* Logo & Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
                <ShieldCheck className="size-5" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">
                Kommerze POS
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Bienvenido de vuelta
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Colaborador ID
              </label>
              <input
                id="username"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="usuario@empresa.com"
                disabled={loading}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                PIN / Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  disabled={loading}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                'Acceder al Sistema'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="flex flex-col items-center gap-2 pt-4 border-t border-border">
            <img src={logo} alt="Softi" className="h-10 w-auto opacity-70" />
            <div className="flex gap-4">
              <a href="#" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                Estado del sistema
              </a>
              <a href="#" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                Privacidad
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Right Panel — Visual ───────────────────────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(oklch(100% 0 0 / 0.1) 1px, transparent 1px), linear-gradient(90deg, oklch(100% 0 0 / 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Floating orbs */}
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 size-64 rounded-full bg-white/5 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-primary/20 blur-3xl"
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end p-14 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Stats row */}
            <div className="flex gap-8 mb-10">
              {[
                { label: 'Ventas hoy', value: '$42,850' },
                { label: 'Operaciones', value: '34' },
                { label: 'Ticket promedio', value: '$1,245' },
              ].map((stat) => (
                <div key={stat.label} className="space-y-0.5">
                  <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-sm text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>

            <h2 className="text-4xl font-bold tracking-tight mb-3 leading-tight">
              Gestiona tu punto<br />de venta con poder.
            </h2>
            <p className="text-lg text-white/70 max-w-md leading-relaxed">
              Ventas, inventario, clientes e historial — todo en tiempo real desde una sola pantalla.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
