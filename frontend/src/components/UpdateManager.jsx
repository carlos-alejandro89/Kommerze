import { useEffect, useState } from 'react';
import { Download, RefreshCw, Rocket, ShieldCheck } from 'lucide-react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const updateAPI = () => window.go?.main?.App;

const stageLabel = {
  downloading: 'Descargando actualización…',
  verifying: 'Verificando integridad…',
  launching: 'Preparando instalación…',
};

function formatBytes(value) {
  if (!value || value < 1) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** exponent).toFixed(exponent > 1 ? 1 : 0)} ${units[exponent]}`;
}

export function UpdateManager() {
  const [update, setUpdate] = useState(null);
  const [progress, setProgress] = useState(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const availableOff = EventsOn('update-available', setUpdate);
    const progressOff = EventsOn('update-progress', setProgress);
    const errorOff = EventsOn('update-error', (message) => setError(String(message || 'No se pudo instalar la actualización.')));
    updateAPI()?.ServiceGetAvailableUpdate?.().then((value) => value && setUpdate(value)).catch(() => {});
    return () => {
      availableOff?.();
      progressOff?.();
      errorOff?.();
    };
  }, []);

  const install = async () => {
    setInstalling(true);
    setError('');
    setProgress({ stage: 'downloading', percentage: 0, downloaded: 0, total: update?.size || 0 });
    try {
      await updateAPI()?.ServiceInstallAvailableUpdate();
    } catch (installError) {
      setError(String(installError?.message || installError || 'No se pudo instalar la actualización.'));
      setInstalling(false);
    }
  };

  const percentage = Math.max(0, Math.min(100, Number(progress?.percentage || 0)));
  return (
    <AlertDialog open={Boolean(update)} onOpenChange={(open) => !open && !installing && !update?.mandatory && setUpdate(null)}>
      <AlertDialogContent className="max-w-md overflow-hidden p-0">
        <div className="bg-gradient-to-br from-blue-50 to-white px-6 pt-6 pb-5 dark:from-blue-950/40 dark:to-background">
          <AlertDialogHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300">
              <Rocket className="size-6" />
            </div>
            <AlertDialogTitle>Actualización disponible</AlertDialogTitle>
            <AlertDialogDescription>
              Kommerze {update?.version} está disponible{update?.size ? ` · ${formatBytes(update.size)}` : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <div className="space-y-4 px-6 py-5">
          {update?.releaseNotes?.length > 0 && (
            <ul className="space-y-2 text-sm text-foreground">
              {update.releaseNotes.map((note) => (
                <li key={note} className="flex gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}

          {installing && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium">{stageLabel[progress?.stage] || 'Preparando actualización…'}</span>
                <span className="text-muted-foreground">{Math.round(percentage)}%</span>
              </div>
              <Progress value={percentage} />
              {progress?.total > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatBytes(progress.downloaded)} de {formatBytes(progress.total)}
                </p>
              )}
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

          <p className="text-xs leading-relaxed text-muted-foreground">
            El instalador se descargará por una conexión segura y se verificará antes de ejecutarse. Kommerze se cerrará cuando la instalación esté lista.
          </p>
        </div>

        <AlertDialogFooter className="border-t px-6 py-4">
          {!update?.mandatory && (
            <Button variant="outline" disabled={installing} onClick={() => setUpdate(null)}>
              Más tarde
            </Button>
          )}
          <Button disabled={installing} onClick={install}>
            {installing ? <RefreshCw className="size-4 animate-spin" /> : <Download className="size-4" />}
            {installing ? 'Actualizando…' : 'Actualizar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
