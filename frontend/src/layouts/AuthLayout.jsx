import { Outlet } from 'react-router-dom';

/**
 * AuthLayout — Full-screen layout for login / license activation.
 * No sidebar. No header. Just the page content.
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen w-full bg-background">
      <Outlet />
    </div>
  );
}
