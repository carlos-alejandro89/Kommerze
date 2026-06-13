import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TurnoProvider } from '@/providers/TurnoProvider';

/**
 * AppLayout — Protected layout with collapsible sidebar + top header.
 * Dark sidebar (always dark) + light/dark main content area.
 *
 * TurnoProvider envuelve el Outlet para que todas las páginas protegidas
 * (incluyendo el POS) puedan consumir el estado del turno del cajero.
 */
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <TurnoProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* ── Sidebar ──────────────────────────────────────────── */}
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

        {/* ── Main ─────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header onMenuToggle={() => setSidebarOpen(v => !v)} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-bg-subtle">
            <Outlet />
          </main>
        </div>
      </div>
    </TurnoProvider>
  );
}
