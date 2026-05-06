import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { MAIN_NAV } from '@/config/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';

/** Toggle dark mode by adding/removing the `dark` class on <html> */
function useDarkMode() {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains('dark')
      || window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('kommerze-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, setDark];
}

export function Header({ onMenuToggle }) {
  const { user } = useAuth();
  const location = useLocation();
  const [dark, setDark] = useDarkMode();
  const [searchOpen, setSearchOpen] = useState(false);

  // Resolve current page title from route
  const currentNav = MAIN_NAV.find(n => location.pathname.startsWith(n.path));
  const pageTitle = currentNav?.title ?? 'Kommerze POS';

  // User initials avatar
  const initials = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'US';

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      {/* Menu toggle (mobile & desktop) */}
      <button
        onClick={onMenuToggle}
        className="flex size-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="size-4 text-foreground" />
      </button>

      {/* Page title */}
      <h1 className="text-sm font-semibold text-foreground truncate flex-1">
        {pageTitle}
      </h1>

      {/* ── Right Actions ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(v => !v)}
          className={cn(
            'flex size-8 items-center justify-center rounded-lg transition-colors',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            searchOpen && 'bg-muted text-foreground',
          )}
          aria-label="Buscar"
        >
          <Search className="size-4" />
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDark(v => !v)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Cambiar tema"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* Notifications */}
        <button className="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Bell className="size-4" />
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-danger" />
        </button>

        {/* Avatar */}
        <div className="ml-1 flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white select-none">
          {initials}
        </div>
      </div>

      {/* ── Search bar (expandable) ───────────────────────── */}
      {searchOpen && (
        <div className="absolute top-14 left-0 right-0 z-30 border-b border-border bg-surface px-4 py-2.5 animate-slide-up">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar productos, tickets, clientes..."
              className="w-full rounded-lg border border-border bg-bg-subtle pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>
        </div>
      )}
    </header>
  );
}
