import { useEffect, useState } from 'react';
import { ServiceGetWebSocketStatus } from '../../wailsjs/go/main/App';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { cn } from '@/lib/utils';

export function WebSocketStatusIndicator({ className }) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    ServiceGetWebSocketStatus()
      .then(value => { if (active) setConnected(Boolean(value)); })
      .catch(() => { if (active) setConnected(false); });

    const unsubscribe = EventsOn('websocket:status', status => {
      if (active) setConnected(Boolean(status?.connected));
    });

    return () => {
      active = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const description = connected ? 'WebSocket conectado' : 'WebSocket desconectado';

  return (
    <span
      className={cn('relative inline-flex size-2 shrink-0 rounded-full', connected ? 'bg-emerald-500' : 'bg-slate-400', className)}
      title={description}
      aria-label={description}
      role="status"
    >
      {connected && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-70" />}
    </span>
  );
}
