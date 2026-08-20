import { useState, useEffect } from 'react';
import {
  Save, Server, Shield, Cloud, HardDrive, RefreshCw,
  Monitor, Globe, RotateCcw, Wifi, Copy, Check,
  ReceiptText, Mail, Plus, Trash2, Bold, Printer,
  ArrowLeft, Settings, PackagePlus, ImageIcon, MapPin, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useActivation } from '@/providers/ActivationProvider';
import { DialogAlert } from '@/components/common/dialog-alert';
import { InventoryImportPanel } from '@/features/inventory-import/pages/InventoryImportPage';
import {
  ServiceLoadCloudCredentials,
  ServiceSaveCloudCredentials,
  ServiceGetKommerzConfig,
  ServiceSaveKommerzConfig,
  ServiceTestLocalServerConnection,
  ServiceGetLocalIP,
  ServiceTestPrintReceipt,
} from '../../../../wailsjs/go/main/App';

const normalizeReceiptConfig = (receipt) => {
  const { logo: _logo, ...config } = receipt;
  return {
    ...config,
    legends: [],
    legendGroups: (receipt.legendGroups || [])
      .map(group => ({ text: group.text.trim(), bold: Boolean(group.bold) }))
      .filter(group => group.text),
  };
};

const receiptLogoAPI = () => window?.go?.main?.App;

const settingsInputClass = 'h-11 w-full rounded-2xl border border-[#dce7f6] bg-white/90 px-4 text-sm font-medium text-[#1b3154] shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] outline-none transition-all placeholder:text-[#7790b6] focus:border-blue-300/80 focus:bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[.065] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400/35 dark:focus:bg-white/[.085]';
const settingsTextareaClass = 'w-full resize-y rounded-2xl border border-[#dce7f6] bg-white/90 px-4 py-3 text-sm font-medium text-[#1b3154] shadow-[0_12px_32px_-25px_rgba(32,74,138,.46)] outline-none transition-all placeholder:text-[#7790b6] focus:border-blue-300/80 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/[.065] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400/35 dark:focus:bg-white/[.085]';
const settingsLabelClass = 'text-xs font-semibold text-[#334a70] dark:text-slate-300';
const settingsPanelClass = 'overflow-hidden rounded-2xl border border-white/70 bg-white/65 shadow-[0_18px_45px_-35px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]';
const settingsPanelHeaderClass = 'flex items-center gap-3 border-b border-[#e5edf8]/80 bg-gradient-to-r from-blue-500/[.065] via-blue-500/[.025] to-transparent px-6 py-4 dark:border-white/10 dark:from-blue-400/[.09] dark:via-blue-400/[.025]';
const settingsInsetClass = 'rounded-2xl border border-[#e3ebf7]/90 bg-white/55 p-4 shadow-[0_10px_30px_-27px_rgba(30,64,120,.42)] dark:border-white/10 dark:bg-white/[.035]';
const DEFAULT_CLOUD_API_URL = 'https://kommerze-cloud-api.developers-lab.com';

export function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { deviceRole, localServerURL: ctxServerURL } = useActivation();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [cloudAPIURL, setCloudAPIURL] = useState(DEFAULT_CLOUD_API_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'dispositivo');
  const [inventoryImportState, setInventoryImportState] = useState({ canSubmit: false, isSaving: false });

  // Caja: config de conexión al Servidor Local
  const [serverURL, setServerURL]     = useState(ctxServerURL || '');
  const [connStatus, setConnStatus]   = useState(null);
  const [testingConn, setTestingConn] = useState(false);
  const [savingConn, setSavingConn]   = useState(false);
  const [localIP, setLocalIP]         = useState('');
  const [alertOpen, setAlertOpen]     = useState(false);
  const [copiedIP, setCopiedIP]       = useState(false);
  const [receipt, setReceipt] = useState({
    businessName: 'KOMMERZE',
    logo: '',
    showLogo: false,
    showBranchName: true,
    showBranchAddress: true,
    showBranchPhone: true,
    showBranchEmail: true,
    legendGroups: [
      { text: 'Gracias por su compra', bold: true },
      { text: '¡Vuelva pronto!', bold: false },
    ],
    printerAddress: '', printerPaperWidthMm: 80, printerPaperCut: true, printerOpenDrawer: false,
    smtpHost: '', smtpPort: '587', smtpUser: '', smtpPassword: '', smtpFrom: '',
  });
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState(false);

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
        setCloudAPIURL(cfg?.cloudApiUrl || DEFAULT_CLOUD_API_URL);
        if (cfg?.receipt) {
          const configuredGroups = cfg.receipt.legendGroups?.length
            ? cfg.receipt.legendGroups
            : (cfg.receipt.legends || []).filter(Boolean).map(text => ({ text, bold: false }));
          setReceipt(prev => ({
            ...prev,
            ...cfg.receipt,
            printerPaperWidthMm: cfg.receipt.printerPaperWidthMm === 58 ? 58 : 80,
            printerPaperCut: cfg.receipt.printerPaperCut ?? true,
            printerOpenDrawer: cfg.receipt.printerOpenDrawer ?? false,
            legendGroups: configuredGroups.length ? configuredGroups : prev.legendGroups,
          }));
        }
        const logoService = receiptLogoAPI()?.ServiceLoadReceiptLogo;
        if (typeof logoService === 'function') {
          const logo = await logoService();
          if (logo) setReceipt(value => ({ ...value, logo }));
        }
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
    if (!email || !password || !cloudAPIURL.trim()) { toast.error('Completa la URL, correo y contraseña'); return; }
    try {
      const parsed = new URL(cloudAPIURL.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      toast.error('Ingresa una URL válida para el API de Kommerze Cloud');
      return;
    }
    setIsLoading(true);
    try {
      const current = await ServiceGetKommerzConfig();
      await ServiceSaveKommerzConfig({ ...(current || {}), cloudApiUrl: cloudAPIURL.trim().replace(/\/+$/, '') });
      await ServiceSaveCloudCredentials(email, password);
      toast.success('Configuración de la Nube guardada. Reinicia Kommerze para aplicar la nueva URL.');
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

  const handleSaveReceipt = async (e) => {
    e.preventDefault();
    setSavingReceipt(true);
    try {
      const current = await ServiceGetKommerzConfig();
      const normalizedReceipt = normalizeReceiptConfig(receipt);
      const logoService = receiptLogoAPI()?.ServiceSaveReceiptLogo;
      if (typeof logoService !== 'function') throw new Error('El servicio de logotipo no está disponible. Reinicia Wails.');
      await logoService(receipt.logo || '');
      await ServiceSaveKommerzConfig({ ...(current || {}), receipt: normalizedReceipt });
      setReceipt(value => ({ ...normalizedReceipt, logo: value.logo }));
      const successMessage = activeTab === 'correo'
        ? 'Configuración de correo SMTP guardada'
        : activeTab === 'impresora'
          ? 'Configuración de impresora guardada'
          : 'Configuración del ticket guardada';
      toast.success(successMessage);
    } catch (err) {
      toast.error('No se pudo guardar: ' + String(err));
    } finally { setSavingReceipt(false); }
  };

  const handleTestPrinter = async () => {
    const normalizedReceipt = normalizeReceiptConfig(receipt);
    if (!normalizedReceipt.printerAddress?.trim()) {
      toast.error('Configura la dirección de la miniprinter antes de realizar la prueba');
      return;
    }
    setTestingPrinter(true);
    try {
      const current = await ServiceGetKommerzConfig();
      const logoService = receiptLogoAPI()?.ServiceSaveReceiptLogo;
      if (typeof logoService !== 'function') throw new Error('El servicio de logotipo no está disponible. Reinicia Wails.');
      await logoService(receipt.logo || '');
      await ServiceSaveKommerzConfig({ ...(current || {}), receipt: normalizedReceipt });
      setReceipt(value => ({ ...normalizedReceipt, logo: value.logo }));
      await ServiceTestPrintReceipt(normalizedReceipt);
      toast.success('Ticket de prueba enviado a la miniprinter');
    } catch (err) {
      toast.error('No se pudo imprimir el ticket de prueba: ' + String(err));
    } finally {
      setTestingPrinter(false);
    }
  };

  const updateLegendGroup = (index, changes) => {
    setReceipt(prev => ({
      ...prev,
      legendGroups: (prev.legendGroups || []).map((group, groupIndex) =>
        groupIndex === index ? { ...group, ...changes } : group),
    }));
  };

  const addLegendGroup = () => {
    setReceipt(prev => ({
      ...prev,
      legendGroups: [...(prev.legendGroups || []), { text: '', bold: false }],
    }));
  };

  const removeLegendGroup = (index) => {
    setReceipt(prev => ({
      ...prev,
      legendGroups: (prev.legendGroups || []).filter((_, groupIndex) => groupIndex !== index),
    }));
  };

  // ── Tabs config ────────────────────────────────────────────────────────────

  const allTabs = [
    { id: 'dispositivo', label: 'Dispositivo',           icon: deviceRole === 'caja' ? Monitor : Server },
    { id: 'recibos',     label: 'Ticket',                icon: ReceiptText },
    { id: 'impresora',   label: 'Impresora',             icon: Printer },
    { id: 'correo',      label: 'Correo SMTP',           icon: Mail },
    { id: 'cloud',       label: 'Nube y Sincronización', icon: Cloud,     serverOnly: true },
    { id: 'inventario',  label: 'Importar inventario',   icon: PackagePlus, serverOnly: true },
    { id: 'local',       label: 'Base de Datos Local',   icon: HardDrive, serverOnly: true },
    { id: 'security',    label: 'Seguridad',              icon: Shield,    serverOnly: true },
  ];
  const tabs = deviceRole === 'caja' ? allTabs.filter(t => !t.serverOnly) : allTabs;

  const roleLabel      = deviceRole === 'servidor_local' ? 'Servidor Local' : deviceRole === 'caja' ? 'Caja' : 'Sin configurar';
  const roleBadgeColor = deviceRole === 'servidor_local'
    ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400'
    : deviceRole === 'caja'
    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
    : 'bg-muted text-muted-foreground border-border';

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden animate-fade-in">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 pt-5 lg:px-6 lg:pt-6">
        <div className="mx-auto max-w-[1320px]">
          <nav className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <button type="button" onClick={() => navigate('/home')} className="transition hover:text-primary">Home</button>
            <span>/</span>
            <span className="text-foreground">Configuración</span>
          </nav>

          <header className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_14px_38px_-31px_rgba(20,54,110,.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.04]">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Settings className="size-6" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">Configuración</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">Configura el dispositivo, tickets y servicios de Kommerze.</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/home')} className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-xs font-semibold text-foreground transition hover:bg-muted">
              <ArrowLeft className="size-4" />
              Volver al inicio
            </button>
          </header>

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <div className="mt-4 flex justify-end rounded-2xl border border-white/70 bg-white/55 p-2.5 shadow-[0_12px_34px_-29px_rgba(30,64,120,.4)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[.035]">
            <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border/60 bg-muted/35 p-1" role="tablist">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all',
                      isActive
                        ? 'border border-border/60 bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
                    )}
                  >
                    <tab.icon className="size-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="mx-auto max-w-[1320px] space-y-8">

          {/* ── DISPOSITIVO ──────────────────────────────────────────────── */}
          {activeTab === 'dispositivo' && (
            <>
              <p className="text-sm text-muted-foreground">
                Rol actual y opciones de red para este equipo.
              </p>

              <div className={settingsPanelClass}>
                {/* Header de sección */}
                <div className={settingsPanelHeaderClass}>
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
                    <div className={settingsInsetClass}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Las Cajas deben conectarse a:</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="rounded-xl border border-blue-100/80 bg-blue-50/70 px-3 py-2 font-mono text-sm text-[#1b3154] dark:border-blue-400/15 dark:bg-blue-400/[.07] dark:text-blue-200">
                          {localIP ? `http://${localIP}:8989` : 'http://<IP de este equipo>:8989'}
                        </p>
                        <button
                          onClick={handleCopyIP}
                          disabled={!localIP}
                          className="flex size-9 items-center justify-center rounded-xl border border-[#dce7f6] bg-white/80 text-[#6481ad] shadow-sm transition-colors hover:border-blue-300/70 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/[.06] dark:text-slate-400 dark:hover:bg-blue-400/10 dark:hover:text-blue-300"
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
                      <label className={settingsLabelClass}>URL del Servidor Local</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                          type="url"
                          value={serverURL}
                          onChange={(e) => { setServerURL(e.target.value); setConnStatus(null); }}
                          placeholder="http://192.168.1.10:8989"
                          className={cn(settingsInputClass, 'pl-10 font-mono')}
                        />
                      </div>
                      {connStatus === 'ok'    && <p className="text-xs text-success">✓ Servidor Local alcanzable</p>}
                      {connStatus === 'error' && <p className="text-xs text-danger">✗ No se pudo conectar</p>}
                      <div className="flex gap-2">
                        <button onClick={handleTestConn} disabled={testingConn}
                          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#dce7f6] bg-white/75 px-3 text-xs font-semibold text-[#334a70] transition hover:border-blue-300/70 hover:bg-blue-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[.05] dark:text-slate-300 dark:hover:bg-blue-400/10">
                          {testingConn ? <RefreshCw className="size-3 animate-spin" /> : <Wifi className="size-3" />}
                          Probar
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

          {activeTab === 'recibos' && (
            <>
              <p className="text-sm text-muted-foreground">
                Personaliza el contenido y las leyendas del ticket.
              </p>
              <form id="settings-ticket-form" onSubmit={handleSaveReceipt} className={settingsPanelClass}>
                <div className={settingsPanelHeaderClass}>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ReceiptText className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Formato del ticket</h3>
                    <p className="text-xs text-muted-foreground">Las leyendas se imprimen después de los datos de la venta</p>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div className="space-y-1.5">
                    <label className={settingsLabelClass}>Nombre comercial</label>
                    <input value={receipt.businessName} onChange={e => setReceipt(v => ({ ...v, businessName: e.target.value }))}
                      placeholder="KOMMERZE" className={settingsInputClass} />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={settingsLabelClass}>Información visible</label>
                      <p className="mt-0.5 text-xs text-muted-foreground">Los datos se obtienen automáticamente de la sucursal y empresa registradas.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { key: 'showLogo', label: 'Logotipo', description: 'Utilizar el logotipo de la empresa', icon: ImageIcon },
                        { key: 'showBranchName', label: 'Nombre de sucursal', description: 'Nombre registrado de la sucursal', icon: ReceiptText },
                        { key: 'showBranchAddress', label: 'Dirección', description: 'Domicilio registrado de la sucursal', icon: MapPin },
                        { key: 'showBranchPhone', label: 'Teléfono', description: 'Teléfono principal de la sucursal', icon: Phone },
                        { key: 'showBranchEmail', label: 'Correo electrónico', description: 'Correo registrado de la sucursal', icon: Mail },
                      ].map(({ key, label, description, icon: Icon }) => (
                        <div key={key} className={cn(settingsInsetClass, 'flex items-center justify-between gap-4')}>
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className={settingsLabelClass}>{label}</p>
                              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(receipt[key])}
                            onClick={() => setReceipt(value => ({ ...value, [key]: !value[key] }))}
                            className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', receipt[key] ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600')}
                          >
                            <span className={cn('absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform', receipt[key] && 'translate-x-5')} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {receipt.showLogo && (
                      <div className={cn(settingsInsetClass, 'flex flex-col gap-4 sm:flex-row sm:items-center')}>
                        <div className="flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-blue-200/80 bg-white/80 dark:border-blue-400/20 dark:bg-white/[.05]">
                          {receipt.logo
                            ? <img src={receipt.logo} alt="Vista previa del logotipo" className="max-h-16 max-w-[136px] object-contain" />
                            : <ImageIcon className="size-7 text-blue-300 dark:text-blue-500/60" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={settingsLabelClass}>Logotipo del ticket</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">PNG o JPG. Si no cargas uno, se utilizará el logotipo registrado en la empresa.</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 text-xs font-semibold text-primary transition hover:bg-primary/10">
                              <ImageIcon className="size-3.5" /> Seleccionar imagen
                              <input
                                type="file"
                                accept="image/png,image/jpeg"
                                className="hidden"
                                onChange={event => {
                                  const file = event.target.files?.[0];
                                  event.target.value = '';
                                  if (!file) return;
                                  if (file.size > 2 * 1024 * 1024) {
                                    toast.error('El logotipo no debe exceder 2 MB');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = () => setReceipt(value => ({ ...value, logo: String(reader.result || '') }));
                                  reader.onerror = () => toast.error('No se pudo leer el logotipo');
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                            {receipt.logo && (
                              <button type="button" onClick={() => setReceipt(value => ({ ...value, logo: '' }))} className="h-9 rounded-xl border border-border/70 px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                                Usar logotipo de empresa
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <label className={settingsLabelClass}>Grupos de leyendas</label>
                        <p className="mt-0.5 text-xs text-muted-foreground">Cada grupo aparecerá separado por una línea en el ticket.</p>
                      </div>
                      <button type="button" onClick={addLegendGroup}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10">
                        <Plus className="size-3.5" />Agregar grupo
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(receipt.legendGroups || []).map((group, index) => (
                        <div key={index} className={settingsInsetClass}>
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#334a70] dark:text-slate-300">Leyenda {index + 1}</span>
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => updateLegendGroup(index, { bold: !group.bold })}
                                aria-pressed={group.bold}
                                title={group.bold ? 'Desactivar negritas' : 'Activar negritas'}
                                className={cn(
                                  'flex size-8 items-center justify-center rounded-lg border transition',
                                  group.bold
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-[#dce7f6] bg-white/75 text-[#6481ad] hover:border-blue-300/70 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:bg-white/[.06] dark:text-slate-400 dark:hover:bg-blue-400/10',
                                )}>
                                <Bold className="size-4" />
                              </button>
                              <button type="button" onClick={() => removeLegendGroup(index)}
                                title="Eliminar grupo"
                                className="flex size-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10">
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                          <textarea rows={3} value={group.text}
                            onChange={e => updateLegendGroup(index, { text: e.target.value })}
                            placeholder="Escribe el contenido de este grupo..."
                            className={cn(
                              settingsTextareaClass,
                              group.bold && 'font-bold',
                            )} />
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Estilo: <strong className="text-foreground">{group.bold ? 'Negritas' : 'Texto normal'}</strong>
                          </p>
                        </div>
                      ))}
                      {(!receipt.legendGroups || receipt.legendGroups.length === 0) && (
                        <div className="rounded-2xl border border-dashed border-blue-200/80 bg-blue-50/35 p-5 text-center text-sm text-[#6178a0] dark:border-blue-400/20 dark:bg-blue-400/[.035] dark:text-slate-400">
                          No hay grupos configurados. El ticket finalizará después de los totales.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </>
          )}

          {activeTab === 'impresora' && (
            <>
              <p className="text-sm text-muted-foreground">
                Configura la conexión y el formato físico de la miniprinter ESC/POS.
              </p>
              <form id="settings-printer-form" onSubmit={handleSaveReceipt} className={settingsPanelClass}>
                <div className={settingsPanelHeaderClass}>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Printer className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Miniprinter ESC/POS</h3>
                    <p className="text-xs text-muted-foreground">Conexión, papel, corte, cajón y prueba de impresión</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-3">
                  <label className="block lg:col-span-2">
                    <span className={`mb-2 block ${settingsLabelClass}`}>Dirección de red</span>
                    <input
                      value={receipt.printerAddress}
                      onChange={e => setReceipt(v => ({ ...v, printerAddress: e.target.value }))}
                      placeholder="192.168.1.50:9100"
                      className={cn(settingsInputClass, 'font-mono')}
                    />
                    <span className="mt-2 block text-xs text-muted-foreground">Modo RAW; normalmente utiliza el puerto 9100.</span>
                  </label>
                  <label className="block">
                    <span className={`mb-2 block ${settingsLabelClass}`}>Ancho del papel</span>
                    <select
                      value={receipt.printerPaperWidthMm}
                      onChange={e => setReceipt(v => ({ ...v, printerPaperWidthMm: Number(e.target.value) }))}
                      className={settingsInputClass}
                    >
                      <option value={80}>80 mm (42 columnas)</option>
                      <option value={58}>58 mm (32 columnas)</option>
                    </select>
                    <span className="mt-2 block text-xs text-muted-foreground">El valor predeterminado es 80 mm.</span>
                  </label>
                  <div className={cn(settingsInsetClass, 'flex items-center justify-between gap-4 lg:col-span-1')}>
                    <div>
                      <p className={settingsLabelClass}>Corte de papel</p>
                      <p className="mt-1 text-xs text-muted-foreground">Realiza un corte parcial al finalizar el ticket.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={receipt.printerPaperCut}
                      onClick={() => setReceipt(v => ({ ...v, printerPaperCut: !v.printerPaperCut }))}
                      className={cn(
                        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                        receipt.printerPaperCut ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600',
                      )}
                    >
                      <span className={cn(
                        'absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition-transform',
                        receipt.printerPaperCut ? 'translate-x-5' : 'translate-x-0',
                      )} />
                    </button>
                  </div>
                  <div className={cn(settingsInsetClass, 'flex items-center justify-between gap-4 lg:col-span-2')}>
                    <div>
                      <p className={settingsLabelClass}>Apertura de cajón</p>
                      <p className="mt-1 text-xs text-muted-foreground">Envía un pulso al cajón conectado a la miniprinter después de imprimir.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={receipt.printerOpenDrawer}
                      onClick={() => setReceipt(v => ({ ...v, printerOpenDrawer: !v.printerOpenDrawer }))}
                      className={cn(
                        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                        receipt.printerOpenDrawer ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600',
                      )}
                    >
                      <span className={cn(
                        'absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition-transform',
                        receipt.printerOpenDrawer ? 'translate-x-5' : 'translate-x-0',
                      )} />
                    </button>
                  </div>
                  <div className="lg:col-span-3">
                    <button
                      type="button"
                      onClick={handleTestPrinter}
                      disabled={testingPrinter || !receipt.printerAddress?.trim()}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {testingPrinter ? <RefreshCw className="size-4 animate-spin" /> : <Printer className="size-4" />}
                      {testingPrinter ? 'Imprimiendo…' : 'Impresión de prueba'}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}

          {activeTab === 'correo' && (
            <>
              <p className="text-sm text-muted-foreground">
                Configura el servidor de correo utilizado para enviar el ticket PDF a tus clientes.
              </p>
              <form id="settings-email-form" onSubmit={handleSaveReceipt} className={settingsPanelClass}>
                <div className={settingsPanelHeaderClass}>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Servidor de correo SMTP</h3>
                    <p className="text-xs text-muted-foreground">Credenciales del remitente para el envío de tickets PDF</p>
                  </div>
                </div>
                <div className="space-y-5 p-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className="block sm:col-span-2">
                      <span className={`mb-2 block ${settingsLabelClass}`}>Servidor SMTP</span>
                      <input value={receipt.smtpHost} onChange={e => setReceipt(v => ({ ...v, smtpHost: e.target.value }))} placeholder="smtp.proveedor.com" className={settingsInputClass} />
                    </label>
                    <label className="block">
                      <span className={`mb-2 block ${settingsLabelClass}`}>Puerto</span>
                      <input value={receipt.smtpPort} onChange={e => setReceipt(v => ({ ...v, smtpPort: e.target.value }))} placeholder="587" className={settingsInputClass} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={`mb-2 block ${settingsLabelClass}`}>Usuario SMTP</span>
                      <input value={receipt.smtpUser} onChange={e => setReceipt(v => ({ ...v, smtpUser: e.target.value }))} placeholder="usuario@empresa.com" className={settingsInputClass} />
                    </label>
                    <label className="block">
                      <span className={`mb-2 block ${settingsLabelClass}`}>Contraseña</span>
                      <input type="password" value={receipt.smtpPassword} onChange={e => setReceipt(v => ({ ...v, smtpPassword: e.target.value }))} placeholder="Contraseña" className={settingsInputClass} />
                    </label>
                    <label className="block sm:col-span-3">
                      <span className={`mb-2 block ${settingsLabelClass}`}>Correo remitente</span>
                      <input type="email" value={receipt.smtpFrom} onChange={e => setReceipt(v => ({ ...v, smtpFrom: e.target.value }))} placeholder="ventas@empresa.com (opcional)" className={settingsInputClass} />
                    </label>
                  </div>
                </div>
              </form>
            </>
          )}

          {/* ── CLOUD ──────────────────────────────────────────────────────── */}
          {activeTab === 'cloud' && (
            <>
              <p className="text-sm text-muted-foreground">
                Administra la conexión y credenciales para sincronizar tu POS con el Sistema Central de Kommerze.
              </p>

              <div className={settingsPanelClass}>
                <div className={settingsPanelHeaderClass}>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Server className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Credenciales de Sincronización</h3>
                    <p className="text-xs text-muted-foreground">Requerido para obtener catálogos y subir ventas</p>
                  </div>
                </div>

                <form id="settings-cloud-form" onSubmit={handleSave} className="p-6 space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="cloud-api-url" className={settingsLabelClass}>URL del API de Kommerze Cloud</label>
                      <div className="relative">
                        <Globe className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7790b6]" />
                        <input id="cloud-api-url" type="url" placeholder={DEFAULT_CLOUD_API_URL}
                          value={cloudAPIURL} onChange={(e) => setCloudAPIURL(e.target.value)} disabled={isLoading}
                          className={`${settingsInputClass} pl-11`} />
                      </div>
                      <p className="text-xs text-muted-foreground">Dirección base usada para autenticación, consultas y sincronización. El cambio se aplica al reiniciar Kommerze.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="email" className={settingsLabelClass}>Correo Electrónico Central</label>
                      <input id="email" type="email" placeholder="usuario@sistema-central.com"
                        value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading}
                        className={settingsInputClass} />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="password" className={settingsLabelClass}>Contraseña de API</label>
                      <input id="password" type="password" placeholder="••••••••••••"
                        value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
                        className={settingsInputClass} />
                      <p className="text-xs text-muted-foreground">Esta contraseña se almacena localmente de forma segura.</p>
                    </div>
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

          {activeTab === 'inventario' && (
            <>
              <p className="text-sm text-muted-foreground">
                Importa productos y existencias desde un archivo JSON validado.
              </p>
              <InventoryImportPanel
                formId="settings-inventory-import-form"
                onStateChange={setInventoryImportState}
                showSubmitAction={false}
              />
            </>
          )}

          {/* ── BASE DE DATOS LOCAL ─────────────────────────────────────────── */}
          {activeTab === 'local' && (
            <>
              <p className="text-sm text-muted-foreground">
                Información sobre la base de datos PostgreSQL local de este Servidor.
              </p>
              <div className={settingsPanelClass}>
                <div className={settingsPanelHeaderClass}>
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
              <div className={settingsPanelClass}>
                <div className={settingsPanelHeaderClass}>
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

      {(activeTab === 'recibos' || activeTab === 'impresora' || activeTab === 'correo' || activeTab === 'cloud' || activeTab === 'inventario' || (activeTab === 'dispositivo' && deviceRole === 'caja')) && (
        <footer className="shrink-0 border-t border-border/70 bg-background/90 px-5 py-3 backdrop-blur-xl lg:px-6">
          <div className="mx-auto flex max-w-[1320px] justify-end">
            {activeTab === 'dispositivo' && deviceRole === 'caja' && (
              <button
                type="button"
                onClick={handleSaveConn}
                disabled={connStatus !== 'ok' || savingConn}
                className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingConn ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                Guardar conexión
              </button>
            )}
            {activeTab === 'recibos' && (
              <button form="settings-ticket-form" type="submit" disabled={savingReceipt} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105 disabled:opacity-60">
                {savingReceipt ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                Guardar configuración del ticket
              </button>
            )}
            {activeTab === 'impresora' && (
              <button form="settings-printer-form" type="submit" disabled={savingReceipt} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105 disabled:opacity-60">
                {savingReceipt ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                Guardar configuración de impresora
              </button>
            )}
            {activeTab === 'correo' && (
              <button form="settings-email-form" type="submit" disabled={savingReceipt} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105 disabled:opacity-60">
                {savingReceipt ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                Guardar correo SMTP
              </button>
            )}
            {activeTab === 'cloud' && (
              <button form="settings-cloud-form" type="submit" disabled={isLoading} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105 disabled:opacity-60">
                {isLoading ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                Guardar credenciales
              </button>
            )}
            {activeTab === 'inventario' && (
              <button form="settings-inventory-import-form" type="submit" disabled={!inventoryImportState.canSubmit || inventoryImportState.isSaving} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0876f9] to-[#075fd1] px-5 text-xs font-semibold text-white shadow-[0_10px_22px_-14px_rgba(8,118,249,.75)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">
                {inventoryImportState.isSaving ? <RefreshCw className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
                {inventoryImportState.isSaving ? 'Importando…' : 'Importar inventario'}
              </button>
            )}
          </div>
        </footer>
      )}

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
