import { useState, useEffect } from 'react';
import { Save, Server, Shield, Cloud, HardDrive, RefreshCw, Monitor, Globe, RotateCcw, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useActivation } from '@/providers/ActivationProvider';
import {
  ServiceLoadCloudCredentials,
  ServiceSaveCloudCredentials,
  ServiceGetKommerzConfig,
  ServiceSaveKommerzConfig,
  ServiceTestLocalServerConnection,
} from '../../../../wailsjs/go/main/App';

export function SettingsPage() {
  const navigate = useNavigate();
  const { deviceRole, localServerURL: ctxServerURL } = useActivation();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dispositivo');
  // Caja: config de conexión al Servidor Local
  const [serverURL, setServerURL]     = useState(ctxServerURL || '');
  const [connStatus, setConnStatus]   = useState(null);
  const [testingConn, setTestingConn] = useState(false);
  const [savingConn, setSavingConn]   = useState(false);

  useEffect(() => {
    const loadCreds = async () => {
      try {
        const creds = await ServiceLoadCloudCredentials();
        if (creds?.email) { setEmail(creds.email); setPassword(creds.password || ''); }
      } catch { /* no credentials yet */ }
    };
    const loadConfig = async () => {
      try {
        const cfg = await ServiceGetKommerzConfig();
        if (cfg?.localServerUrl) setServerURL(cfg.localServerUrl);
      } catch { /* ignore */ }
    };
    loadCreds();
    loadConfig();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Por favor ingresa correo y contraseña'); return; }
    setIsLoading(true);
    try {
      await ServiceSaveCloudCredentials(email, password);
      toast.success('Credenciales de la Nube guardadas exitosamente');
    } catch (err) {
      toast.error('Error al guardar credenciales: ' + String(err));
    } finally { setIsLoading(false); }
  };

  const handleTestConn = async () => {
    if (!serverURL) { toast.error('Ingresa la URL del Servidor Local'); return; }
    setTestingConn(true); setConnStatus(null);
    try {
      const res = await ServiceTestLocalServerConnection(serverURL);
      setConnStatus(res?.success ? 'ok' : 'error');
      res?.success ? toast.success('Conexión exitosa') : toast.error(res?.message || 'Sin conexión');
    } catch (err) {
      setConnStatus('error'); toast.error(String(err));
    } finally { setTestingConn(false); }
  };

  const handleSaveConn = async () => {
    if (connStatus !== 'ok') { toast.error('Verifica la conexión primero'); return; }
    setSavingConn(true);
    try {
      const current = await ServiceGetKommerzConfig();
      await ServiceSaveKommerzConfig({ ...(current || {}), localServerUrl: serverURL });
      toast.success('URL del Servidor Local actualizada');
    } catch (err) { toast.error(String(err)); }
    finally { setSavingConn(false); }
  };

  const handleReconfigure = async () => {
    if (!confirm('¿Seguro? El dispositivo deberá configurarse nuevamente.')) return;
    try {
      await ServiceSaveKommerzConfig({ role: '' });
      toast.success('Configuración restablecida. Reinicia la aplicación.');
      navigate('/device-setup/role', { replace: true });
    } catch (err) { toast.error(String(err)); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'dispositivo', label: 'Dispositivo', icon: deviceRole === 'caja' ? Monitor : Server },
    { id: 'cloud',       label: 'Nube y Sincronización', icon: Cloud },
    { id: 'local',       label: 'Base de Datos Local',   icon: HardDrive },
    { id: 'security',    label: 'Seguridad',              icon: Shield },
  ];

  const roleLabel      = deviceRole === 'servidor_local' ? 'Servidor Local' : deviceRole === 'caja' ? 'Caja' : 'Sin configurar';
  const roleBadgeColor = deviceRole === 'servidor_local'
    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
    : deviceRole === 'caja'
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : 'bg-muted text-muted-foreground border-border';

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in bg-bg-subtle">

      {/* ── Left Sidebar ─────────────────────────────── */}
      <div className="w-[240px] shrink-0 border-r border-border bg-surface p-5 hidden md:block">
        <h2 className="text-lg font-bold text-foreground mb-6">Ajustes</h2>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Main Content ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* ── DISPOSITIVO TAB ───────────────────────── */}
          {activeTab === 'dispositivo' && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Configuración del Dispositivo</h1>
                <p className="text-sm text-muted-foreground">Rol actual y opciones de red para este equipo.</p>
              </div>

              <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
                {/* Header */}
                <div className="border-b border-border bg-bg-subtle px-6 py-4 flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${deviceRole === 'caja' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                    {deviceRole === 'caja' ? <Monitor className="size-5" /> : <Server className="size-5" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Rol del Dispositivo</h3>
                    <p className="text-xs text-muted-foreground">Configurado durante la instalación inicial</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${roleBadgeColor}`}>
                    {roleLabel}
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  {/* Servidor Local: mostrar IP */}
                  {deviceRole === 'servidor_local' && (
                    <div className="rounded-lg border border-border bg-bg-subtle p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Las Cajas deben conectarse a:</p>
                      <p className="font-mono text-sm text-foreground">http://&lt;IP de este equipo&gt;:8989</p>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Ejecuta <code className="bg-muted px-1 rounded">hostname -I</code> en la terminal para ver tu IP local.
                      </p>
                    </div>
                  )}

                  {/* Caja: cambiar URL del Servidor Local */}
                  {deviceRole === 'caja' && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">URL del Servidor Local</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                          type="url"
                          value={serverURL}
                          onChange={(e) => { setServerURL(e.target.value); setConnStatus(null); }}
                          placeholder="http://192.168.1.10:8989"
                          className="w-full rounded-lg border border-border bg-bg-subtle pl-9 pr-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                        />
                      </div>
                      {connStatus === 'ok'    && <p className="text-xs text-success">✓ Servidor Local alcanzable</p>}
                      {connStatus === 'error' && <p className="text-xs text-error">✗ No se pudo conectar</p>}
                      <div className="flex gap-2">
                        <button onClick={handleTestConn} disabled={testingConn}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-subtle px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition disabled:opacity-50">
                          {testingConn ? <RefreshCw className="size-3 animate-spin" /> : <Wifi className="size-3" />}
                          Probar
                        </button>
                        <button onClick={handleSaveConn} disabled={connStatus !== 'ok' || savingConn}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-40">
                          {savingConn ? <RefreshCw className="size-3 animate-spin" /> : <Save className="size-3" />}
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reconfigurar */}
                  <div className="pt-2 border-t border-border">
                    <button onClick={handleReconfigure}
                      className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-error hover:bg-error/10 transition">
                      <RotateCcw className="size-3.5" />
                      Reconfigurar dispositivo
                    </button>
                    <p className="text-[11px] text-muted-foreground mt-1 ml-1">
                      Restablece el rol y reinicia el proceso de configuración.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── CLOUD TAB ────────────────────────────── */}
          {activeTab === 'cloud' && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Configuración de la Nube</h1>
                <p className="text-sm text-muted-foreground">
                  Administra la conexión y credenciales para sincronizar tu POS con el Sistema Central de Kommerze.
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
                      <label htmlFor="email" className="text-sm font-medium text-foreground">Correo Electrónico Central</label>
                      <input id="email" type="email" placeholder="usuario@sistema-central.com"
                        value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading}
                        className="w-full rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="password" className="text-sm font-medium text-foreground">Contraseña de API</label>
                      <input id="password" type="password" placeholder="••••••••••••"
                        value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
                        className="w-full rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50" />
                      <p className="text-xs text-muted-foreground mt-1">Esta contraseña se almacena localmente de forma segura.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-border">
                    <button type="submit" disabled={isLoading}
                      className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-60 shadow-sm">
                      {isLoading ? <><RefreshCw className="size-4 animate-spin" />Guardando...</> : <><Save className="size-4" />Guardar Credenciales</>}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-xl border border-warning/20 bg-warning/5 p-5 flex items-start gap-3">
                <Shield className="size-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Privacidad y Seguridad</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kommerze POS sincroniza datos de ventas e inventario a través de un túnel seguro (TLS 1.3).
                    No compartas las credenciales de API con personal no autorizado.
                  </p>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
