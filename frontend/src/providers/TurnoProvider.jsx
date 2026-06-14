/**
 * TurnoProvider — Context global para el estado del turno del cajero.
 *
 * Expone:
 *   turnoActivo:   OperacionCajero | null  — null si no hay turno abierto
 *   jornadaActiva: boolean                 — si hay jornada de sucursal activa
 *   turnoLoading:  boolean                 — cargando estado inicial
 *   refreshTurno:  () => Promise<void>     — re-consultar manualmente (tras apertura)
 *
 * Estrategia de detección de cierres (sin polling):
 *   - En Modo Servidor Local: app.go emite "turno:cerrado" / "jornada:cerrada"
 *     vía runtime.EventsEmit después de cada cierre exitoso. También hace
 *     BroadcastToClients para notificar a las Cajas conectadas.
 *   - En Modo Caja: CajaProxy.listenWS recibe el broadcast WebSocket del Servidor
 *     Local y lo reemite localmente con runtime.EventsEmit → este mismo EventsOn
 *     lo captura. Latencia < 50ms, sin ningún costo de polling.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ServiceObtenerOperacionCajeroActiva,
  ServiceObtenerOperacionSucursalActiva,
} from '../../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import { useAuth } from './AuthProvider';
import { useActivation } from './ActivationProvider';

const TurnoContext = createContext(undefined);

export function TurnoProvider({ children }) {
  const { user }  = useAuth();
  const { store } = useActivation();

  // Extraer IDs primitivos — evita rerenders en cadena.
  // SucursalID viene del store (ActivationProvider): el modelo Usuario no tiene ese campo.
  const userID     = user?.ID ?? user?.id ?? 0;
  const sucursalID = store?.ID ?? store?.id ?? 0;

  const [turnoActivo, setTurnoActivo]     = useState(undefined); // undefined = no cargado aún
  const [jornadaActiva, setJornadaActiva] = useState(false);
  const [turnoLoading, setTurnoLoading]   = useState(true);

  const fetchTurno = useCallback(async () => {
    if (!userID) {
      setTurnoActivo(null);
      setJornadaActiva(false);
      setTurnoLoading(false);
      return;
    }

    try {
      // Consultar turno del cajero
      const resCajero = await ServiceObtenerOperacionCajeroActiva(userID);
      const turno = resCajero?.success && resCajero?.data ? resCajero.data : null;
      setTurnoActivo(turno);

      // Consultar jornada de sucursal.
      // Funciona en ambos modos:
      //   Servidor Local → BD directa (OperacionesSucursalService)
      //   Caja           → proxy HTTP a /local/sucursal/operacion/activa (CajaProxy)
      if (sucursalID) {
        const resSucursal = await ServiceObtenerOperacionSucursalActiva(sucursalID);
        setJornadaActiva(!!(resSucursal?.success && resSucursal?.data));
      } else {
        // Sin sucursalID conocido: inferir de si hay turno activo
        setJornadaActiva(!!turno);
      }
    } catch (e) {
      console.error('[TurnoProvider] Error al consultar turno:', e);
      setTurnoActivo(null);
      setJornadaActiva(false);
    } finally {
      setTurnoLoading(false);
    }
  }, [userID, sucursalID]);

  // ── Carga inicial ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userID) {
      setTurnoActivo(null);
      setJornadaActiva(false);
      setTurnoLoading(false);
      return;
    }
    setTurnoLoading(true);
    fetchTurno();
  }, [userID, fetchTurno]);

  // ── Suscripción a eventos Wails (reemplaza el polling) ───────────────────────
  // Los eventos son emitidos por app.go vía runtime.EventsEmit al cerrar operaciones.
  // En Modo Caja, CajaProxy.listenWS recibe el broadcast WebSocket del Servidor Local
  // y lo reemite localmente con runtime.EventsEmit → este handler los captura igual.
  // Resultado: detección de cierres en tiempo real, sin costo de polling.
  useEffect(() => {
    if (!userID) return;

    EventsOn('turno:cerrado',   () => fetchTurno());
    EventsOn('jornada:cerrada', () => fetchTurno());

    return () => {
      EventsOff('turno:cerrado');
      EventsOff('jornada:cerrada');
    };
  }, [userID, fetchTurno]);

  return (
    <TurnoContext.Provider
      value={{
        turnoActivo,
        jornadaActiva,
        turnoLoading,
        refreshTurno: fetchTurno,
      }}
    >
      {children}
    </TurnoContext.Provider>
  );
}

export function useTurno() {
  const ctx = useContext(TurnoContext);
  if (!ctx) throw new Error('useTurno must be used within TurnoProvider');
  return ctx;
}
