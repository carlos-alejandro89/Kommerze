import { useState, useEffect } from 'react';
import {
  Save, Server, Shield, Cloud, HardDrive, RefreshCw,
  Monitor, Globe, RotateCcw, Wifi, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useActivation } from '@/providers/ActivationProvider';
import { DialogAlert } from '@/components/common/dialog-alert';
import {
  ServiceLoadCloudCredentials,
  ServiceSaveCloudCredentials,
  ServiceGetKommerzConfig,
  ServiceSaveKommerzConfig,
  ServiceTestLocalServerConnection,
  ServiceGetLocalIP,
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
  const [localIP, setLocalIP]         = useState('');
  const [alertOpen, setAlertOpen]     = useState(false);
  const [copiedIP, setCopiedIP]       = useState(false);

  useEffect(() => {
    ServiceGetLocalIP().then(setLocalIP).catch(() => {});
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

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCopyIP = () => {
    const url = localIP ? `http://${localIP}:8989` : '';
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedIP(true);
    setTimeout(() => setCopiedIP(false), 2000);
    toast.success('Dirección copiada al portapapeles');
  };

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

  const handleReconfigure = () => setAlertOpen(true);

  const confirmReconfigure = async () => {
    setAlertOpen(false);
    try {
      await ServiceSaveKommerzConfig({ role: '' });
      toast.success('Configuración restablecida. Reinicia la aplicación.');
      navigate('/device-setup/role', { replace: true });
    } catch (err) { toast.error(String(err)); }
  };

  // ── Tabs config ────────────────────────────────────────────────────────────

  const allTabs = [
    { id: 'dispositivo', label: 'Dispositivo',           icon: deviceRole === 'caja' ? Monitor : Server },
    { id: 'cloud',       label: 'Nube y Sincronización', icon: Cloud,     serverOnly: true },
    { id: 'local',       label: 'Base de Datos Local',   icon: HardDrive, serverOnly: true },
    { id: 'security',    label: 'Seguridad',              icon: Shield,    serverOnly: true },
  ];
  const tabs = deviceRole === 'caja' ? allTabs.filter(t => !t.serverOnly) : allTabs;

  const roleLabel      = deviceRole === 'servidor_local' ? 'Servidor Local' : deviceRole === 'caja' ? 'Caja' : 'Sin configurar';
  const roleBadgeColor = deviceRole === 'servidor_local'
    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
    : deviceRole === 'caja'
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : 'bg-muted text-muted-foreground border-border';

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden animate-fade-in bg-bg-subtle">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border bg-surface px-6 pt-6 pb-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-foreground mb-4">Ajustes</h1>

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <div className="flex gap-1" role="tablist">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg',
                    'border border-b-0 transition-all duration-150 relative',
                    isActive
                      ? 'bg-bg-subtle border-border text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60',
                  )}
                  style={isActive ? { marginBottom: '-1px' } : {}}
                >
                  <tab.icon className={cn('size-4', isActive ? 'text-primary' : '')} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* ── DISPOSITIVO ──────────────────────────────────────────────── */}
          {activeTab === 'dispositivo' && (
            <>
              <p className="text-sm text-muted-foreground">
                Rol actual y opciones de red para este equipo.
              </p>

              <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
                {/* Header de sección */}
                <div className="border-b border-border bg-bg-subtle px-6 py-4 flex items-center gap-3">
                  <div className={cn(
                    'flex size-10 items-center justify-center rounded-lg',
                    deviceRole === 'caja'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-indigo-500/15 text-indigo-400',
                  )}>
                    {deviceRole === 'caja' ? <Monitor className="size-5" /> : <Server className="size-5" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Rol del Dispositivo</h3>
                    <p className="text-xs text-muted-foreground">Configurado durante la instalación inicial</p>
                  </div>
                  <span className={cn('text-xs font-semibold px-3 py-1 rounded-full border', roleBadgeColor)}>
                    {roleLabel}
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  {/* Servidor Local: mostrar IP */}
                  {deviceRole === 'servidor_local' && (
                    <div className="rounded-lg border border-border bg-bg-subtle p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Las Cajas deben conectarse a:</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="font-mono text-sm text-foreground bg-muted px-2 py-1 rounded border border-border">
                          {localIP ? `http://${localIP}:8989` : 'http://<IP de este equipo>:8989'}
                        </p>
                        <button
                          onClick={handleCopyIP}
                          disabled={!localIP}
                          className="flex size-7 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                          title="Copiar dirección"
                        >
                          {copiedIP ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        IP local detectada automáticamente. Utiliza esta dirección en las terminales Caja.
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
                      {connStatus === 'error' && <p className="text-xs text-danger">✗ No se pudo conectar</p>}
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
                      className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition">
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

          {/* ── CLOUD ──────────────────────────────────────────────────────── */}
          {activeTab === 'cloud' && (
            <>
              <p className="text-sm text-muted-foreground">
                Administra la conexión y credenciales para sincronizar tu POS con el Sistema Central de Kommerze.
              </p>

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
                      <p className="text-xs text-muted-foreground">Esta contraseña se almacena localmente de forma segura.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-border">
                    <button type="submit" disabled={isLoading}
                      className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-60 shadow-sm">
                      {isLoading
                        ? <><RefreshCw className="size-4 animate-spin" />Guardando...</>
                        : <><Save className="size-4" />Guardar Credenciales</>
                      }
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

          {/* ── BASE DE DATOS LOCAL ─────────────────────────────────────────── */}
          {activeTab === 'local' && (
            <>
              <p className="text-sm text-muted-foreground">
                Información sobre la base de datos PostgreSQL local de este Servidor.
              </p>
              <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
                <div className="border-b border-border bg-bg-subtle px-6 py-4 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <HardDrive className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Base de Datos Local</h3>
                    <p className="text-xs text-muted-foreground">PostgreSQL — administrada por el Servidor Local</p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">
                    La configuración de la base de datos se realiza durante la instalación inicial del Servidor Local.
                    Para cambiar credenciales de BD, ve a <strong className="text-foreground">Configuración de BD</strong> en el setup.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── SEGURIDAD ──────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <>
              <p className="text-sm text-muted-foreground">
                Opciones de seguridad y acceso para el sistema.
              </p>
              <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
                <div className="border-b border-border bg-bg-subtle px-6 py-4 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Shield className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Seguridad del Sistema</h3>
                    <p className="text-xs text-muted-foreground">Gestión de acceso y permisos</p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">
                    Las opciones de seguridad avanzadas estarán disponibles en próximas versiones.
                  </p>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      <DialogAlert
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="Reconfigurar Dispositivo"
        description="¿Seguro? El dispositivo deberá configurarse nuevamente."
        onConfirm={confirmReconfigure}
        onCancel={() => setAlertOpen(false)}
        type="warning"
      />
    </div>
  );
}
