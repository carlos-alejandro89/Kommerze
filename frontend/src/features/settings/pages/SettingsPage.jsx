import { useState, useEffect } from 'react';
import { Save, Server, Shield, Cloud, HardDrive, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cloud');

  useEffect(() => {
    const loadCreds = async () => {
      try {
        if (window.go?.main?.App?.ServiceLoadCloudCredentials) {
          const creds = await window.go.main.App.ServiceLoadCloudCredentials();
          if (creds && creds.email) {
            setEmail(creds.email);
            setPassword(creds.password || '');
          }
        }
      } catch (err) {
        console.log('No existing credentials found or error loading them');
      }
    };
    loadCreds();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor ingresa correo y contraseña');
      return;
    }

    setIsLoading(true);
    try {
      if (window.go?.main?.App?.ServiceSaveCloudCredentials) {
        await window.go.main.App.ServiceSaveCloudCredentials(email, password);
        toast.success('Credenciales de la Nube guardadas exitosamente');
      } else {
        toast.error('La función de guardado no está disponible (Wails no detectado)');
      }
    } catch (err) {
      toast.error('Error al guardar credenciales: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'cloud', label: 'Nube y Sincronización', icon: Cloud },
    { id: 'local', label: 'Base de Datos Local', icon: HardDrive },
    { id: 'security', label: 'Seguridad', icon: Shield },
  ];

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in bg-bg-subtle">
      
      {/* ── Left Sidebar Settings Menu ────────────────── */}
      <div className="w-[240px] shrink-0 border-r border-border bg-surface p-5 hidden md:block">
        <h2 className="text-lg font-bold text-foreground mb-6">Ajustes</h2>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Main Content Area ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-2xl mx-auto space-y-8">
          
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Configuración de la Nube</h1>
            <p className="text-sm text-muted-foreground">
              Administra la conexión y credenciales para sincronizar tu Punto de Venta local con el Sistema Central de Kommerze.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
            <div className="border-b border-border bg-bg-subtle px-6 py-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Server className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Credenciales de Sincronización</h3>
                <p className="text-xs text-muted-foreground">Requerido para obtener catálogos y subir ventas</p>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    Correo Electrónico Central
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="usuario@sistema-central.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Contraseña de API
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Esta contraseña se almacena localmente de forma segura.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-60 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Guardar Credenciales
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-5 flex items-start gap-3">
            <Shield className="size-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground">Privacidad y Seguridad</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Kommerze POS sincroniza datos de ventas e inventario a través de un túnel seguro (TLS 1.3). Asegúrate de no compartir las credenciales de API con personal no autorizado.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
