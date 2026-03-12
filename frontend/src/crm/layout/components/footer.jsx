import React from 'react';
import { cn } from '@/lib/utils';
import logo from '@/assets/Softi.png';

export function Footer({ className }) {
  return (
    <footer className={cn("flex items-center justify-between h-(--footer-height) px-6 bg-background", className)}>
      <div className="text-[11px] text-muted-foreground">
        Softi © {new Date().getFullYear()}

      </div>
      <div className="flex gap-4">
        <a href="#" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">System Status</a>
        <a href="#" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">Privacy</a>
      </div>
    </footer>
  );
}
