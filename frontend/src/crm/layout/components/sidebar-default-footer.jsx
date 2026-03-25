import { CircleHelp, UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLayout } from './layout-context';
import { useAuth } from '@/providers/auth-provider';

function DefaultContent() {
  const { user, logout } = useAuth();
  return (
    <div className="shrink-0 border-t border-border flex items-center justify-between h-(--sidebar-footer-height) gap-(--sidebar-space-x) px-(--sidebar-space-x) overflow-hidden transition-all duration-1000 ease-in-out">
      <Button
        variant="ghost"
        className="grow shrink-0 transition-all duration-200 ease-in-out"
      >
        <UserRoundPlus />
        <span>{user.Nombre}</span>
      </Button>

    </div>
  );
}

function CollapsedContent() {
  const { user } = useAuth();
  return (
    <div className="shrink-0 border-t border-border flex flex-col items-center justify-center gap-(--sidebar-space-x) h-(--sidebar-footer-collapsed-height)">
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 shrink-0">
            <UserRoundPlus />
          </Button>
        </TooltipTrigger>
        <TooltipContent align="center" side="right" sideOffset={20}>
          {user.Nombre}
        </TooltipContent>
      </Tooltip>

    </div>
  );
}

export function SidebarDefaultFooter() {
  const { sidebarCollapse } = useLayout();

  return <>{sidebarCollapse ? <CollapsedContent /> : <DefaultContent />}</>;
}
