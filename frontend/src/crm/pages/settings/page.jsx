import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function SettingsPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load existing credentials on mount
    const loadCreds = async () => {
      try {
        if (window.go?.main?.App?.ServiceLoadCloudCredentials) {
          const creds = await window.go.main.App.ServiceLoadCloudCredentials();
          if (creds && creds.email) {
            setEmail(creds.email);
            // We usually don't populate password for security, but we can if we want
            setPassword(creds.password || '');
          }
        }
      } catch (err) {
        // Ignorar error si no hay archivo de configuración todavía
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

  return (
    <div className="p-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Configuración de la Nube</CardTitle>
          <CardDescription>
            Ingresa las credenciales para sincronizar tu Punto de Venta con el Sistema Central.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Tu contraseña central"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Credenciales'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
