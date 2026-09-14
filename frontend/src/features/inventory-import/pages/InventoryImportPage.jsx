import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileJson,
  HardDrive,
  ListX,
  Loader2,
  PackageCheck,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const MAX_PREVIEW_LENGTH = 900;
const formatExistence = (value) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric)
    ? numeric.toLocaleString('es-MX', { maximumFractionDigits: 6 })
    : String(value ?? 0);
};

async function guardarInventarioJSON(nombreArchivo, contenido) {
  const service = window?.go?.main?.App?.ServiceGuardarInventarioJSON;
  if (typeof service !== 'function') {
    throw new Error('El binding de Wails aun no esta disponible. Ejecuta wails dev para regenerarlo.');
  }
  return service(nombreArchivo, contenido);
}

export function InventoryImportPanel({ formId = 'inventory-import-form', onStateChange, showSubmitAction = true }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    onStateChange?.({ canSubmit: Boolean(file && content), isSaving });
  }, [content, file, isSaving, onStateChange]);

  const preview = useMemo(() => {
    if (!content) return '';
    return content.length > MAX_PREVIEW_LENGTH
      ? `${content.slice(0, MAX_PREVIEW_LENGTH)}...`
      : content;
  }, [content]);

  const handleFile = async (selectedFile) => {
    setError('');
    setResult(null);
    setDetailsOpen(false);

    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.json')) {
      setFile(null);
      setContent('');
      setError('Selecciona un archivo con extension .json');
      return;
    }

    try {
      const text = await selectedFile.text();
      JSON.parse(text);
      setFile(selectedFile);
      setContent(text);
    } catch (err) {
      setFile(null);
      setContent('');
      setError(err?.message || 'El archivo no contiene un JSON valido');
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleSave = async (event) => {
    event?.preventDefault();
    if (!file || !content) {
      setError('Selecciona un archivo JSON antes de guardar');
      return;
    }

    setIsSaving(true);
    setError('');
    setResult(null);

    try {
      const response = await guardarInventarioJSON(file.name, content);
      if (!response?.success) {
        throw new Error(response?.message || response?.errors?.[0] || 'No fue posible guardar el archivo');
      }
      setResult(response.data);
    } catch (err) {
      setError(err?.message || 'No fue posible guardar el archivo');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form id={formId} onSubmit={handleSave} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden rounded-[1.35rem] border-white/65 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]">
            <CardContent className="p-4">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex min-h-[260px] w-full flex-col items-center justify-center rounded-[1.15rem] border border-dashed px-6 text-center transition',
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/25 bg-white/45 hover:border-primary/45 hover:bg-white/70 dark:bg-white/[0.035]'
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UploadCloud className="size-7" strokeWidth={1.8} />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">
                  Selecciona o arrastra tu JSON
                </h2>
                <p className="mt-2 max-w-md text-sm font-medium leading-6 text-muted-foreground">
                  El archivo se valida antes de enviarlo y se guarda como copia local para procesamiento posterior.
                </p>
              </button>

              {preview && (
                <div className="mt-4 overflow-hidden rounded-[1.15rem] border border-white/65 bg-slate-950 text-slate-100 shadow-sm dark:border-white/10">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <FileJson className="size-4 text-primary" />
                      {file?.name}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {file ? `${Math.ceil(file.size / 1024)} KB` : ''}
                    </span>
                  </div>
                  <pre className="max-h-[260px] overflow-auto p-4 text-xs leading-5">
                    {preview}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <aside className="flex flex-col gap-3">
            <Card className="rounded-[1.35rem] border-white/65 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <HardDrive className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Guardar en disco</h2>
                    <p className="text-xs font-medium text-muted-foreground">Backend local</p>
                  </div>
                </div>

                {showSubmitAction ? (
                  <Button type="submit" className="mt-4 w-full gap-2" disabled={!file || isSaving}>
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                    {isSaving ? 'Importando…' : 'Importar inventario'}
                  </Button>
                ) : (
                  <p className="mt-4 text-xs font-medium leading-5 text-muted-foreground">
                    Selecciona un archivo válido y utiliza el botón fijo al pie para iniciar la importación.
                  </p>
                )}
              </CardContent>
            </Card>

            {error && (
              <div className="rounded-[1.15rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/45 dark:text-red-300">
                <div className="flex gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {result && (
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="w-full rounded-[1.15rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-900/60 dark:bg-emerald-950/45 dark:text-emerald-300 dark:hover:bg-emerald-950/65"
              >
                <div className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0">
                    <p>Archivo guardado e inventario importado</p>
                    {result.import && (
                      <p className="mt-1 text-xs opacity-85">
                        {result.import.insertados ?? 0} insertados · {result.import.actualizados ?? 0} actualizados · {result.import.omitidos ?? 0} omitidos
                      </p>
                    )}
                    <p className="mt-1 break-all text-xs opacity-80">{result.path}</p>
                    <p className="mt-2 text-[10px] font-semibold opacity-75">Haz clic para consultar el detalle</p>
                  </div>
                </div>
              </button>
            )}
          </aside>

          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-h-[86vh] w-[min(920px,94vw)] max-w-none overflow-hidden rounded-2xl p-0">
              <DialogHeader className="border-b border-border/70 px-6 py-5 text-left">
                <div className="flex items-start gap-3 pr-8">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <ListX className="size-5" />
                  </div>
                  <div>
                    <DialogTitle>Resultado de la importación</DialogTitle>
                    <DialogDescription className="mt-1">
                      Consulta los registros omitidos y el motivo por el que no fueron procesados.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid border-b border-border/70 bg-background sm:grid-cols-2 min-[820px]:grid-cols-4">
                <ImportMetric icon={UploadCloud} label="Insertados" description="Nuevos productos" value={result?.import?.insertados} tone="blue" />
                <ImportMetric icon={RefreshCw} label="Actualizados" description="Registros existentes" value={result?.import?.actualizados} tone="emerald" bordered />
                <ImportMetric icon={ListX} label="Omitidos" description="Sin procesar" value={result?.import?.omitidos} tone="amber" bordered />
                <ImportMetric icon={PackageCheck} label="Con existencia" description="Productos importados" value={result?.import?.productosConExistencia} tone="violet" bordered />
              </div>

              <div className="max-h-[480px] overflow-y-auto px-6 py-5">
                {result?.import?.registrosOmitidos?.length ? (
                  <div className="space-y-2">
                    {result.import.registrosOmitidos.map((record, index) => (
                      <div key={`${record.codigo || 'fila'}-${record.fila || index}`} className="flex items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/55 px-4 py-3 dark:border-amber-400/15 dark:bg-amber-400/[.05]">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-700 dark:text-amber-300">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">{record.codigo || `Fila ${record.fila}`}</p>
                          <p className="mt-0.5 break-words text-[11px] leading-4 text-muted-foreground">{record.motivo}</p>
                        </div>
                        <div className="shrink-0 border-l border-amber-200/70 pl-4 text-right dark:border-amber-400/15">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Existencia</p>
                          <p className="mt-0.5 text-xs font-bold tabular-nums text-foreground">{formatExistence(record.existencia)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : result?.import?.errores?.length ? (
                  <div className="space-y-2">
                    {result.import.errores.map((message, index) => (
                      <div key={`${message}-${index}`} className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/55 px-4 py-3 dark:border-amber-400/15 dark:bg-amber-400/[.05]">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-700 dark:text-amber-300">{index + 1}</span>
                        <p className="break-words text-xs leading-5 text-foreground">{message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
                    <p className="mt-3 text-sm font-semibold text-foreground">No se omitieron registros</p>
                    <p className="mt-1 text-xs text-muted-foreground">Todos los elementos del archivo fueron procesados.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
    </form>
  );
}

function ImportMetric({ icon: Icon, label, description, value, tone, bordered }) {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };
  return (
    <div className={cn('flex min-h-[96px] items-center gap-3 px-5 py-4', bordered && 'border-t border-border/60 sm:border-l sm:border-t-0 sm:[&:nth-child(3)]:border-l-0 min-[820px]:[&:nth-child(3)]:border-l')}>
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', colors[tone])}>
        <Icon className="size-4.5" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none tabular-nums text-foreground">{value ?? 0}</p>
        <p className="mt-1.5 text-[11px] font-semibold text-foreground/80">{label}</p>
        <p className="mt-0.5 whitespace-normal text-[10px] leading-4 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function InventoryImportPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-full overflow-hidden bg-[#f5f8fc] px-6 py-5 dark:bg-background">
      <div className="kommerze-gradient-bg pointer-events-none absolute inset-0" />
      <div className="relative z-[var(--z-layer-base)] mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-foreground">Importar JSON de inventario</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Carga y valida un archivo de inventario.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/home')}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        </header>
        <InventoryImportPanel />
      </div>
    </div>
  );
}
