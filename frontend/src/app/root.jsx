import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import { ActivationProvider } from '@/providers/ActivationProvider';
import { SettingsProvider } from '@/providers/SettingsProvider';
import { router } from './router';

/**
 * Root — wraps all global providers and the router.
 * Dark mode is handled natively via Tailwind v4 + CSS tokens.
 */
export function Root() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ActivationProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" />
        </ActivationProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
