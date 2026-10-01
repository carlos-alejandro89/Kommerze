import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import { ActivationProvider } from '@/providers/ActivationProvider';
import { SettingsProvider } from '@/providers/SettingsProvider';
import { router } from './router';
import { UpdateManager } from '@/components/UpdateManager';
import { CloudConfigProvider } from '@/providers/CloudConfigProvider';

/**
 * Root — wraps all global providers and the router.
 * Dark mode is handled natively via Tailwind v4 + CSS tokens.
 */
export function Root() {
  return (
    <CloudConfigProvider>
      <SettingsProvider>
        <AuthProvider>
          <ActivationProvider>
            <RouterProvider router={router} />
            <UpdateManager />
            <Toaster richColors position="top-right" />
          </ActivationProvider>
        </AuthProvider>
      </SettingsProvider>
    </CloudConfigProvider>
  );
}
