import { motion } from 'motion/react';
import { Server, Monitor, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ServiceSaveKommerzConfig, ServiceRestartApp } from '../../../../wailsjs/go/main/App';
import { useActivation } from '@/providers/ActivationProvider';
import { toast } from 'sonner';
import logo from '@/assets/Softi.png';

const roles = [
  {
    id: 'servidor_local',
    icon: Server,
    color: 'indigo',
    title: 'Servidor Local',
    subtitle: 'Nodo principal de la sucursal',
    description:
      'Este dispositivo gestiona la base de datos, sincroniza con la nube y permite que las Cajas de tu red se conecten.',
    features: [
      'Base de datos PostgreSQL local',
      'Sincronización con la nube',
      'Activación de licencia de sucursal',
      'Expone API para las Cajas (:8989)',
    ],
    gradient: 'from-indigo-500/20 to-indigo-600/10',
    border: 'border-indigo-500/40',
    iconBg: 'bg-indigo-500/15 text-indigo-400',
    checkColor: 'text-indigo-400',
    selectedBorder: 'border-indigo-500',
    selectedGlow: 'shadow-indigo-500/20',
    next: '/license/activate',
  },
  {
    id: 'caja',
    icon: Monitor,
    color: 'emerald',
    title: 'Caja',
    subtitle: 'Punto de venta',
    description:
      'Este dispositivo opera como terminal de venta. Se conecta al Servidor Local de tu red para operar.',
    features: [
      'Sin base de datos local',
      'Datos en tiempo real del Servidor',
      'Login por cajero',
      'Operación en red LAN',
    ],
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/40',
    iconBg: 'bg-emerald-500/15 text-emerald-400',
    checkColor: 'text-emerald-400',
    selectedBorder: 'border-emerald-500',
    selectedGlow: 'shadow-emerald-500/20',
    next: '/device-setup/local-server',
  },
];

export function DeviceRolePage() {
  const navigate = useNavigate();
  const { setDeviceRole } = useActivation();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    const role = roles.find((r) => r.id === selected);
    try {
      await ServiceSaveKommerzConfig({ role: selected });
      setDeviceRole(selected);

      if (selected === 'servidor_local') {
        // El backend necesita reiniciarse para conectar a BD e inicializar LicenseService
        setRestarting(true);
        setLoading(false);
        await new Promise((r) => setTimeout(r, 1500));
        ServiceRestartApp(); // void — cierra la app, el usuario la reabre
      } else {
        // Caja: no necesita reinicio, el proxy es stateless
        toast.success(`Rol configurado: ${role.title}`);
        navigate(role.next, { replace: true });
      }
    } catch (err) {
      toast.error('Error al guardar la configuración: ' + String(err));
      setRestarting(false);
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de reinicio en progreso
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden px-4 py-12">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 size-80 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-80 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-4xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <img src={logo} alt="Kommerze" className="h-10 w-auto mx-auto mb-6 opacity-80" />
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
            ¿Cuál es la función de este dispositivo?
          </h1>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Esta configuración se realiza una sola vez y determina cómo opera este equipo
            dentro de la red Kommerze.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {roles.map((role, i) => {
            const isSelected = selected === role.id;
            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelected(role.id)}
                className={`
                  relative text-left rounded-2xl border-2 p-6 transition-all duration-200 cursor-pointer
                  bg-gradient-to-br ${role.gradient}
                  ${isSelected
                    ? `${role.selectedBorder} shadow-xl ${role.selectedGlow}`
                    : `${role.border} hover:border-opacity-70`
                  }
                `}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 size-5 rounded-full bg-current flex items-center justify-center"
                    style={{ color: role.color === 'indigo' ? '#6366f1' : '#10b981' }}
                  >
                    <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}

                {/* Icon */}
                <div className={`flex size-12 items-center justify-center rounded-xl mb-4 ${role.iconBg}`}>
                  <role.icon className="size-6" />
                </div>

                {/* Text */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-foreground">{role.title}</h2>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{role.subtitle}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{role.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-1.5">
                  {role.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`size-1.5 rounded-full bg-current ${role.checkColor}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.button>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <button
            onClick={handleContinue}
            disabled={!selected || loading}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white
              shadow-lg shadow-primary/25 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-primary/40
              transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>
                Continuar
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
