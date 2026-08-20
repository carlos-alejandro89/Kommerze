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
    <main className="relative min-h-screen overflow-hidden bg-[#001b4c] p-3 sm:p-5 lg:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(30,120,255,.62),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(1,74,178,.42),transparent_42%),linear-gradient(135deg,#043d95_0%,#001d51_45%,#001238_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom_right,transparent,black,transparent)]" />

      <section className="relative mx-auto grid min-h-[calc(100vh-24px)] max-w-[1600px] gap-5 sm:min-h-[calc(100vh-40px)] lg:min-h-[calc(100vh-56px)] lg:grid-cols-[minmax(400px,37%)_1fr] xl:gap-8">
        <div className="relative z-10 flex items-center justify-center overflow-hidden rounded-[24px] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_64px_-34px_rgba(0,7,31,.68)] sm:px-10 lg:px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="w-full max-w-[370px]"
          >
            <img
              src="/media/kommerze-logo-horizontal.png"
              alt="Kommerze"
              className="mb-7 h-auto w-[166px] max-w-[56%] object-contain object-left"
            />

            <div className="mb-7">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Acceso al sistema
              </p>
              <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.025em] text-[#071a43] sm:text-[30px]">
                Bienvenido de nuevo
              </h1>
              <p className="mt-2.5 max-w-sm text-[13px] leading-[1.6] text-slate-500">
                Ingresa tus credenciales para continuar con la operación de tu negocio.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-[12px] font-medium text-[#203457]">
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
                    className="h-[48px] w-full rounded-[10px] border border-slate-200/90 bg-white pl-10.5 pr-3.5 text-[13px] font-normal text-[#10234b] outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-blue-200 focus:border-primary/80 focus:ring-3 focus:ring-primary/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-[12px] font-medium text-[#203457]">
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
                    className="h-[48px] w-full rounded-[10px] border border-slate-200/90 bg-white pl-10.5 pr-11 text-[13px] font-normal text-[#10234b] outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-blue-200 focus:border-primary/80 focus:ring-3 focus:ring-primary/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex h-[49px] w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#075be8] to-[#0b76f0] px-5 text-[13px] font-semibold text-white shadow-[0_12px_24px_-16px_rgba(0,91,232,.85)] transition hover:-translate-y-px hover:shadow-[0_15px_26px_-16px_rgba(0,91,232,.72)] focus:outline-none focus:ring-3 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
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

            <div className="mt-7 flex items-center justify-center gap-1.5 text-[10.5px] font-normal text-slate-400">
              <ShieldCheck className="size-3.5 text-emerald-500" strokeWidth={1.8} />
              Acceso seguro a Kommerze POS
            </div>
          </motion.div>
        </div>

        <div className="relative hidden min-h-0 overflow-hidden rounded-[26px] border border-white/10 lg:block">
          <img
            src={loginStore}
            alt="Atención a cliente en una tienda de pinturas"
            className="absolute inset-0 h-full w-full object-cover object-center"
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
