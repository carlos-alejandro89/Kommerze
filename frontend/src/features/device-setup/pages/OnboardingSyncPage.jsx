import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, CloudDownload, Loader2, RefreshCw, XCircle } from 'lucide-react';
import {
  SyncLineas, SyncMarcas, SyncEmpaques, SyncReglasConversionProducto, SyncSatProductos, SyncSatUnidadesMedida,
  SyncProductos, SyncSatFormasPago, SyncSatMetodosPago, SyncSatUsosCfdi,
  SyncSatRegimenFiscal, SyncNivelesEmpaque, SyncEmpresas, SyncSucursales,
  SyncPerfiles, SyncUsuarios, SyncTiposPedido, SyncTiposAutorizacion,
  SyncEstatus, SyncRolesFiscales, SyncClientes,
} from '../../../../wailsjs/go/main/App';

const CATALOGS = [
  ['Regímenes fiscales', SyncSatRegimenFiscal], ['Formas de pago', SyncSatFormasPago],
  ['Métodos de pago', SyncSatMetodosPago], ['Usos CFDI', SyncSatUsosCfdi],
  ['Claves SAT de productos', SyncSatProductos], ['Líneas', SyncLineas], ['Marcas', SyncMarcas],
  ['Unidades de medida SAT', SyncSatUnidadesMedida], ['Empaques', SyncEmpaques],
  ['Perfiles', SyncPerfiles], ['Roles fiscales', SyncRolesFiscales], ['Tipos de pedido', SyncTiposPedido],
  ['Tipos de autorización', SyncTiposAutorizacion], ['Estatus', SyncEstatus],
  ['Empresas', SyncEmpresas], ['Usuarios', SyncUsuarios], ['Clientes y datos fiscales', SyncClientes],
  ['Sucursales', SyncSucursales], ['Productos', SyncProductos], ['Niveles de empaque', SyncNivelesEmpaque],
  ['Reglas de conversión', SyncReglasConversionProducto],
];

export function OnboardingSyncPage() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [items, setItems] = useState(() => CATALOGS.map(([name]) => ({ name, status: 'pending' })));
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async () => {
    setRunning(true); setError('');
    setItems(CATALOGS.map(([name]) => ({ name, status: 'pending' })));
    for (let index = 0; index < CATALOGS.length; index += 1) {
      const [name, sync] = CATALOGS[index];
      setItems((current) => current.map((item, i) => i === index ? { ...item, status: 'running' } : item));
      try {
        await sync();
        setItems((current) => current.map((item, i) => i === index ? { ...item, status: 'done' } : item));
      } catch (reason) {
        const message = `${name}: ${String(reason)}`;
        setItems((current) => current.map((item, i) => i === index ? { ...item, status: 'error' } : item));
        setError(message); setRunning(false); return;
      }
    }
    setRunning(false);
    navigate('/license/activate', { replace: true });
  }, [navigate]);

  useEffect(() => { if (!started.current) { started.current = true; run(); } }, [run]);
  const completed = items.filter((item) => item.status === 'done').length;
  const progress = Math.round((completed / items.length) * 100);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <motion.main initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl rounded-3xl border border-white/60 bg-background/95 p-8 shadow-2xl backdrop-blur-xl">
        <header className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CloudDownload className="size-6" /></div>
          <div><h1 className="text-2xl font-bold tracking-tight">Preparando tu información</h1><p className="mt-1 text-sm text-muted-foreground">Descargamos automáticamente los catálogos necesarios antes de activar la licencia.</p></div>
        </header>
        <div className="my-6"><div className="mb-2 flex justify-between text-xs font-medium"><span>{running ? 'Sincronizando…' : error ? 'Sincronización detenida' : 'Sincronización completa'}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} /></div></div>
        <div className="grid max-h-[430px] grid-cols-1 gap-2 overflow-y-auto pr-2 sm:grid-cols-2">
          {items.map((item) => <div key={item.name} className="flex items-center gap-3 rounded-xl border border-border/70 bg-bg-subtle/60 px-3.5 py-3 text-sm"><StatusIcon status={item.status} /><span className={item.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}>{item.name}</span></div>)}
        </div>
        {error && <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-error/20 bg-error/5 px-4 py-3"><p className="text-sm text-error">{error}</p><button onClick={run} className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><RefreshCw className="size-4" /> Reintentar</button></div>}
        {!error && <p className="mt-5 text-center text-xs text-muted-foreground">Los precios y existencias de la sucursal se descargarán al concluir la activación.</p>}
      </motion.main>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'running') return <Loader2 className="size-4 animate-spin text-primary" />;
  if (status === 'done') return <CheckCircle2 className="size-4 text-success" />;
  if (status === 'error') return <XCircle className="size-4 text-error" />;
  return <span className="size-4 rounded-full border border-border" />;
}
