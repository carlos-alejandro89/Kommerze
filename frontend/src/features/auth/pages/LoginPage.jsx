import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Eye,
  EyeOff,
  Package,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import logo from '@/assets/Softi.png';
import backgroundPos from '@/assets/background-pos4.jpg';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { verifyLicense, storeStatus, empresa, getInventoryValue, isCaja } = useActivation();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: 'admin@kommerze.com',
    password: 'admin123',
  });

  useEffect(() => {
    // En modo Caja, la licencia la valida el Servidor Local; no verificar aquí.
    if (isCaja) return;
    const checkLicense = async () => {
      const ok = await verifyLicense();
      if (!ok) navigate('/license/activate', { replace: true });
    };
    checkLicense();
  }, [isCaja]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!empresa) storeStatus().catch(() => {});
    await login(formData.username, formData.password);
    await getInventoryValue().catch(() => {});
    setLoading(false);
    navigate('/home', { replace: true });
  };

  const featureItems = [
    {
      icon: Package,
      title: 'Inventarios',
      description: 'Control total de tus productos',
    },
    {
      icon: Users,
      title: 'Clientes y CRM',
      description: 'Gestiona relaciones y fideliza clientes',
    },
    {
      icon: BarChart3,
      title: 'Reportes',
      description: 'Decisiones basadas en informacion',
    },
    {
      icon: RefreshCw,
      title: 'Sincronizacion',
      description: 'Todo actualizado en tiempo real',
    },
  ];

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#eef5ff]">
      {/* ── Left Panel — Form ──────────────────────────── */}
      <div className="relative flex w-full shrink-0 flex-col items-center justify-center overflow-hidden bg-[#f5f8fc] px-8 py-12 dark:bg-background lg:w-[480px] xl:w-[520px]">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(219,234,254,0.82),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(224,242,254,0.72),transparent_30%),linear-gradient(135deg,rgba(248,250,252,0.96),rgba(239,246,255,0.9),rgba(248,250,252,0.98))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(30,64,175,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94),rgba(15,23,42,0.98))]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative z-[var(--z-layer-raised)] w-full max-w-sm space-y-8"
        >
          {/* Logo & Brand */}
          <div className="space-y-2">
            <div className="mb-6 flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
                <ShieldCheck className="size-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
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
                className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
            <img src={logo} alt="Softi" className="h-10 w-auto opacity-70" />
            <div className="flex gap-4">
              <a href="#" className="text-[11px] text-muted-foreground transition-colors hover:text-foreground">
                Estado del sistema
              </a>
              <a href="#" className="text-[11px] text-muted-foreground transition-colors hover:text-foreground">
                Privacidad
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Right Panel — Visual ───────────────────────── */}
      <div className="relative hidden flex-1 overflow-hidden lg:flex">
        <img
          src={backgroundPos}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-right-bottom"
        />

        <div className="relative z-[var(--z-layer-raised)] flex w-full flex-col justify-between px-14 py-14 xl:px-[72px]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-[14vh] max-w-[560px]"
          >
            <h2 className="max-w-[440px] text-[38px] font-bold leading-[1.12] tracking-normal text-[#061a4d] xl:text-[44px]">
              Todo tu negocio,{' '}
              <span className="text-primary">simplificado.</span>
            </h2>
            <p className="mt-5 max-w-[430px] text-[17px] font-medium leading-7 text-[#26375f]">
              Administra ventas, inventario, clientes y operaciones desde un solo lugar.
            </p>
          </motion.div>

          <div className="grid max-w-4xl grid-cols-4 rounded-2xl border border-white/55 bg-white/62 px-4 py-3.5 shadow-[0_18px_46px_-36px_rgba(15,23,42,0.42)] backdrop-blur-xl">
            {featureItems.map((item, index) => (
              <div
                key={item.title}
                className="flex min-w-0 items-center gap-2.5 px-3 first:pl-0 last:pr-0"
              >
                <item.icon className="size-6 shrink-0 text-[#586886]" strokeWidth={1.9} />
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold leading-tight text-[#061a4d]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium leading-snug text-[#5f6f8e]">
                    {item.description}
                  </p>
                </div>
                {index < featureItems.length - 1 && (
                  <span className="ml-auto hidden h-9 w-px shrink-0 bg-slate-200 xl:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
