/**
 * TurnoProvider — Context global para el estado del turno del cajero.
 *
 * Expone:
 *   turnoActivo:   OperacionCajero | null  — null si no hay turno abierto
 *   jornadaActiva: boolean                 — si hay jornada de sucursal activa
 *   turnoLoading:  boolean                 — cargando estado inicial
 *   refreshTurno:  () => Promise<void>     — re-consultar (tras apertura/cierre)
 *
 * Estrategia:
 *   - Se inicializa al montar el AppLayout (con el user ya autenticado).
 *   - Hace refresh automático cada 2 minutos para detectar cierres externos.
 *   - El userID lo toma de AuthProvider (opción 1 del plan).
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  ServiceObtenerOperacionCajeroActiva,
  ServiceObtenerOperacionSucursalActiva,
} from '../../wailsjs/go/main/App';
import { useAuth } from './AuthProvider';
import { useActivation } from './ActivationProvider';

const TurnoContext = createContext(undefined);

const REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos

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
  const intervalRef = useRef(null);

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

      // Consultar jornada de sucursal (solo si tenemos sucursalID)
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
  }, [userID, sucursalID]); // ← primitivos estables, no el objeto user

  // Carga inicial + refresh periódico
  useEffect(() => {
    if (!userID) {
      setTurnoActivo(null);
      setJornadaActiva(false);
      setTurnoLoading(false);
      return;
    }

    setTurnoLoading(true);
    fetchTurno();

    // Refresh automático cada 2 min
    intervalRef.current = setInterval(fetchTurno, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
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
