import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import { toast } from 'sonner';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Mute state in local storage
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('notifications-muted') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('notifications-muted', isMuted);
  }, [isMuted]);

  const toggleMute = () => setIsMuted(prev => !prev);

  const playDing = useCallback(() => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Sine wave gives a smooth bell/ding sound
      oscillator.type = 'sine';
      // Start high frequency and drop it slightly
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5); // Decay
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('AudioContext no soportado o bloqueado', e);
    }
  }, [isMuted]);

  const addNotification = useCallback((type, title, description, timestamp = new Date(), metadata = null) => {
    const newNotif = {
      id: Math.random().toString(36).substring(7),
      type, // 'success', 'error', 'info'
      title,
      description,
      timestamp,
      read: false,
      metadata,
    };

    setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep max 50
    setUnreadCount(prev => prev + 1);
    
    // Play sound
    playDing();

    // Show toast
    if (type === 'success') {
      toast.success(title, { description, duration: 5000 });
    } else if (type === 'error') {
      toast.error(title, { description, duration: 5000 });
    } else {
      toast(title, { description, duration: 5000 });
    }
  }, [playDing]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id && !n.read) {
        setUnreadCount(c => Math.max(0, c - 1));
        return { ...n, read: true };
      }
      return n;
    }));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // ── Global WebSocket Listeners ──
  useEffect(() => {
    const handleCotizacionResuelta = (data) => {
      if (!data) return;
      const isApproved = data.estatus === 'autorizada';
      const title = isApproved ? 'Descuento Autorizado' : 'Descuento Rechazado';
      const description = data.observaciones 
        ? `${data.autorizadoPor || 'Admin'}: ${data.observaciones}`
        : `La solicitud del pedido #${data.pedidoGuid?.slice(0,8)} fue ${data.estatus}.`;
      
      addNotification(isApproved ? 'success' : 'error', title, description);
    };

    const handleNetPayPaymentResponse = (data) => {
      if (!data) return;

      const responseCode = String(data.responseCode ?? data.ResponseCode ?? '');
      const message = data.message ?? data.Message ?? 'Pago aprobado correctamente';

      if (responseCode === '00') {
        toast.success(message);
        return;
      }

      toast.error(message || 'No fue posible aprobar el pago');
    };

    const handleTransferenciaRecibida = (data) => {
      if (!data) return;
      const folio = data.folio ? ` #${data.folio}` : '';
      const unidades = Number(data.unidadesTotales || 0);
      addNotification(
        'info',
        `Nueva transferencia${folio}`,
        unidades > 0
          ? `Una sucursal envió ${unidades.toLocaleString('es-MX')} unidades a esta sucursal.`
          : 'Otra sucursal registró un envío de productos hacia esta sucursal.',
        new Date(),
        { kind: 'transferencia', pedidoGuid: data.pedidoGuid, data },
      );
    };

    const handlePedidoSync = (data) => {
      if (!data || data.success !== false) return;
      const message = data.error || 'No fue posible registrar la transacción en Cloud.';
      addNotification('error', 'Sincronización pendiente', message);
      toast.error(message);
    };

    const unsub = EventsOn('cotizacion_resuelta', handleCotizacionResuelta);
    const unsubNetPay = EventsOn('netpay_payment_response', handleNetPayPaymentResponse);
    const unsubTransferencia = EventsOn('transferencia_recibida', handleTransferenciaRecibida);
    const unsubPedidoSync = EventsOn('sync_status', handlePedidoSync);

    return () => {
      if (typeof unsub === 'function') {
        unsub();
      }
      if (typeof unsubNetPay === 'function') {
        unsubNetPay();
      }
      if (typeof unsubTransferencia === 'function') {
        unsubTransferencia();
      }
      if (typeof unsubPedidoSync === 'function') {
        unsubPedidoSync();
      }
    };
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      isMuted,
      toggleMute,
      addNotification,
      markAllAsRead,
      markAsRead,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
