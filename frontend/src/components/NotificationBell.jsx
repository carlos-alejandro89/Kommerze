import React from 'react';
import { Bell, Check, Trash2, Volume2, VolumeX, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/providers/NotificationProvider';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    isMuted, 
    toggleMute, 
    markAllAsRead, 
    markAsRead, 
    clearAll 
  } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground lg:in-data-[sidebar-collapsed]:hidden!">
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-background text-[8px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        className="w-80 p-0 overflow-hidden rounded-xl border border-border shadow-xl"
        side="bottom"
        align="end"
        sideOffset={7}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">Notificaciones</span>
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} nuevas
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                toggleMute();
              }}
              title={isMuted ? "Activar sonido" : "Silenciar sonido"}
            >
              {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
              title="Marcar todas como leídas"
            >
              <Check className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[300px] overflow-y-auto divide-y divide-border/50 bg-background">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <Bell className="size-5 text-muted-foreground/50" />
              </div>
              <p className="text-xs font-medium text-foreground">No hay notificaciones</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Aquí aparecerán las autorizaciones y mensajes del sistema.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const Icon = notif.type === 'success' ? CheckCircle2 : notif.type === 'error' ? XCircle : Info;
              const color = notif.type === 'success' ? 'text-emerald-500' : notif.type === 'error' ? 'text-red-500' : 'text-blue-500';
              const bg = notif.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10' : notif.type === 'error' ? 'bg-red-50 dark:bg-red-500/10' : 'bg-blue-50 dark:bg-blue-500/10';

              return (
                <div 
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/50 cursor-pointer",
                    !notif.read && "bg-slate-50/50 dark:bg-zinc-800/30"
                  )}
                >
                  <div className={cn("mt-0.5 shrink-0 h-7 w-7 rounded-full flex items-center justify-center", bg, color)}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-0.5">
                      <p className={cn(
                        "text-xs font-semibold truncate",
                        !notif.read ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {notif.title}
                      </p>
                      <span className="text-[9px] text-muted-foreground shrink-0 whitespace-nowrap">
                        {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                      {notif.description}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="shrink-0 h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t border-border bg-slate-50 dark:bg-zinc-800/50 text-center">
            <Button 
              variant="ghost" 
              className="w-full h-8 text-[11px] font-medium text-muted-foreground hover:text-red-500"
              onClick={(e) => {
                e.preventDefault();
                clearAll();
              }}
            >
              <Trash2 className="size-3 mr-1.5" />
              Limpiar notificaciones
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
