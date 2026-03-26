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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function DefaultContent() {
  const { user, logout } = useAuth();

  return (
    <div className="shrink-0 border-t border-border flex items-center justify-between h-(--sidebar-footer-height) gap-(--sidebar-space-x) px-(--sidebar-space-x) overflow-hidden transition-all duration-1000 ease-in-out">


      <div className="flex items-center gap-2.5 py-1">
        <Avatar className="size-7 rounded-full">
          <AvatarImage src={'/media/avatars/300-2.png'} alt={user.Nombre} className="rounded-full" />
          <AvatarFallback className="rounded-full bg-primary/10 text-primary font-bold text-[10px]">
            {user.Nombre.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-xs hover:text-primary cursor-pointer transition-colors leading-none mb-1">
            {user.Nombre}
          </span>
          <span className="text-[10px] text-muted-foreground leading-none">
            {user.CorreoElectronico}
          </span>
        </div>
      </div>

    </div>
  );
}

function CollapsedContent() {
  const { user } = useAuth();
  return (
    <div className="shrink-0 border-t border-border flex flex-col items-center justify-center gap-(--sidebar-space-x) h-(--sidebar-footer-collapsed-height)">
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <Avatar className="size-7 rounded-full">
            <AvatarImage src={'/media/avatars/300-2.png'} alt={user.Nombre} className="rounded-full" />
            <AvatarFallback className="rounded-full bg-primary/10 text-primary font-bold text-[10px]">
              {user.Nombre.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
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
