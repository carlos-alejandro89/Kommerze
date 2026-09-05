import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChartNoAxesCombined,
  CloudCog,
  Eye,
  EyeOff,
  LockKeyhole,
  PackageSearch,
  ShieldCheck,
  ShoppingCart,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useActivation } from '@/providers/ActivationProvider';
import loginStore from '@/assets/login-tienda-pinturas.png';

const loginBenefits = [
  {
    icon: ShoppingCart,
    title: 'Punto de venta',
    description: 'Agiliza cada operación y brinda una mejor atención.',
  },
  {
    icon: PackageSearch,
    title: 'Inventario en tiempo real',
    description: 'Mantén el control de existencias y movimientos.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Información para decidir',
    description: 'Consulta resultados reales de tu operación.',
  },
  {
    icon: CloudCog,
    title: 'Sincronización segura',
    description: 'Tu información disponible cuando la necesitas.',
  },
];

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
    if (isCaja) return;
    const checkLicense = async () => {
      const ok = await verifyLicense();
      if (!ok) navigate('/license/activate', { replace: true });
    };
    checkLicense();
  }, [isCaja, navigate, verifyLicense]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    if (!empresa) storeStatus().catch(() => {});
    await login(formData.username, formData.password);
    await getInventoryValue().catch(() => {});
    setLoading(false);
    navigate('/home', { replace: true });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#001b4c] p-2 sm:p-3 lg:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(30,120,255,.62),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(1,74,178,.42),transparent_42%),linear-gradient(135deg,#043d95_0%,#001d51_45%,#001238_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom_right,transparent,black,transparent)]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-16px)] w-full overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-[0_28px_80px_-36px_rgba(0,7,31,.75)] sm:min-h-[calc(100vh-24px)] lg:min-h-[calc(100vh-32px)]">
        <div className="relative z-10 flex w-full shrink-0 items-center justify-center overflow-x-hidden overflow-y-auto bg-white px-7 py-10 sm:px-9 lg:w-[560px] lg:px-10 xl:w-[600px]">
          <div className="pointer-events-none absolute -right-32 -top-32 size-80 rounded-full bg-primary/5 blur-3xl" />
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="relative w-full max-w-[420px]"
          >
            <img
              src="/media/kommerze-logo-horizontal.png"
              alt="Kommerze"
              className="mb-6 h-auto w-[150px] max-w-[52%] object-contain object-left"
            />

            <div className="mb-7 space-y-2">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#071a43]">
                Bienvenido de nuevo
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-slate-500">
                Ingresa tus credenciales para continuar con la operación de tu negocio.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-sm font-medium text-[#203457]">
                  Usuario o correo electrónico
                </label>
                <div className="group relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" strokeWidth={1.7} />
                  <input
                    id="username"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    placeholder="Ingresa tu usuario o correo"
                    disabled={loading}
                    value={formData.username}
                    onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                    className="w-full rounded-lg border border-slate-200/90 bg-slate-50/80 py-2.5 pl-10.5 pr-3.5 text-sm font-normal text-[#10234b] outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-blue-200 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-[#203457]">
                  Contraseña
                </label>
                <div className="group relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" strokeWidth={1.7} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    disabled={loading}
                    value={formData.password}
                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    className="w-full rounded-lg border border-slate-200/90 bg-slate-50/80 py-2.5 pl-10.5 pr-11 text-sm font-normal text-[#10234b] outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-blue-200 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-[#12244a] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="size-4" strokeWidth={1.7} /> : <Eye className="size-4" strokeWidth={1.7} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#075be8] to-[#0b76f0] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRight className="size-4" strokeWidth={1.8} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-1.5 border-t border-slate-200 pt-4 text-[10.5px] font-normal text-slate-400">
              <ShieldCheck className="size-3.5 text-emerald-500" strokeWidth={1.8} />
              Acceso seguro a Kommerze POS
            </div>
          </motion.div>
        </div>

        <div className="relative hidden min-h-0 flex-1 overflow-hidden lg:block">
          <img
            src={loginStore}
            alt="Atención a cliente en una tienda de pinturas"
            className="absolute inset-0 h-full w-full object-cover object-[64%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#001b4c]/20 via-transparent to-[#001438]/28" />
          <motion.div
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.2 }}
            className="absolute left-7 top-7 z-10 max-w-[370px] rounded-xl border border-white/25 bg-[#001b4c]/52 px-5 py-3.5 text-white shadow-[0_14px_34px_-26px_rgba(0,14,48,.8)] backdrop-blur-md xl:left-9 xl:top-9"
          >
            <p className="max-w-[330px] text-[20px] font-semibold leading-[1.2] tracking-[-0.025em] xl:text-[23px]">
              Todo lo que necesitas para hacer{' '}
              <span className="text-[#61b2ff]">crecer tu negocio.</span>
            </p>
            <span className="mt-3 block h-0.5 w-10 rounded-full bg-[#58aaff]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            className="absolute inset-x-4 bottom-4 z-10 grid grid-cols-4 overflow-hidden rounded-2xl border border-[#72a9f5]/24 bg-[#001d50]/88 px-2 py-3.5 shadow-[0_18px_50px_-24px_rgba(0,13,44,.82)] backdrop-blur-xl xl:inset-x-6 xl:bottom-6 xl:px-3 xl:py-4"
          >
            {loginBenefits.map(({ icon: Icon, title, description }, index) => (
              <div
                key={title}
                className={`flex min-w-0 items-center gap-2.5 px-2.5 xl:gap-3.5 xl:px-4 ${index > 0 ? 'border-l border-white/15' : ''}`}
              >
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 xl:size-12 ${index === 3 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-gradient-to-br from-[#1f68cb]/80 to-[#06439e]/80 text-blue-100'}`}>
                  <Icon className="size-5 xl:size-6" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold leading-tight text-white xl:text-[13px]">
                    {title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[9px] font-medium leading-[1.35] text-blue-100/72 xl:text-[10.5px]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </main>
  );
}
