import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ServiceIniciarAuditoria,
  ServiceVerificarAuditoriasEnCurso,
} from '../../wailsjs/go/main/App';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { useAuth } from './AuthProvider';
import { useActivation } from './ActivationProvider';

const AuditoriaContext = createContext(undefined);

function normalizeAuditoriaData(data) {
  return {
    auditoria: data?.auditoria ?? data?.Auditoria ?? data ?? null,
    productos: data?.productos ?? data?.Productos ?? [],
  };
}

export function AuditoriaProvider({ children }) {
  const { user } = useAuth();
  const { isInitialized, isLocalServer } = useActivation();

  const [auditoriaActiva, setAuditoriaActiva] = useState(null);
  const [productosAuditoria, setProductosAuditoria] = useState([]);
  const [auditoriaLoading, setAuditoriaLoading] = useState(true);
  const [auditoriaError, setAuditoriaError] = useState(null);

  const applyAuditoriaResponse = useCallback((res) => {
    if (!res?.success || !res?.data) {
      setAuditoriaActiva(null);
      setProductosAuditoria([]);
      return false;
    }

    const { auditoria, productos } = normalizeAuditoriaData(res.data);
    setAuditoriaActiva(auditoria);
    setProductosAuditoria(productos);
    return true;
  }, []);

  const refreshAuditoria = useCallback(async () => {
    if (!user || !isLocalServer) {
      setAuditoriaActiva(null);
      setProductosAuditoria([]);
      setAuditoriaLoading(false);
      return null;
    }

    setAuditoriaLoading(true);
    setAuditoriaError(null);

    try {
      const res = await ServiceVerificarAuditoriasEnCurso();
      applyAuditoriaResponse(res);
      return res;
    } catch (err) {
      console.error('[AuditoriaProvider] Error verificando auditoria:', err);
      setAuditoriaError(err);
      setAuditoriaActiva(null);
      setProductosAuditoria([]);
      return null;
    } finally {
      setAuditoriaLoading(false);
    }
  }, [applyAuditoriaResponse, isLocalServer, user]);

  const iniciarAuditoria = useCallback(async (sucursalGuid, usuarioEncargadoGuid) => {
    setAuditoriaLoading(true);
    setAuditoriaError(null);

    try {
      const res = await ServiceIniciarAuditoria(sucursalGuid, usuarioEncargadoGuid);
      applyAuditoriaResponse(res);
      return res;
    } catch (err) {
      console.error('[AuditoriaProvider] Error iniciando auditoria:', err);
      setAuditoriaError(err);
      throw err;
    } finally {
      setAuditoriaLoading(false);
    }
  }, [applyAuditoriaResponse]);

  useEffect(() => {
    if (!isInitialized) return;
    refreshAuditoria();
  }, [isInitialized, refreshAuditoria]);

  useEffect(() => {
    if (!user || !isLocalServer) return;

    const unsub = EventsOn('auditoria_conteo_actualizado', (data) => {
      const guidProducto = data?.Producto?.Guid ?? data?.producto?.guid ?? data?.guidNivel;
      const conteo = data?.Conteo ?? data?.conteo;
      if (!guidProducto || conteo == null) return;

      setProductosAuditoria((prev) => prev.map((producto) => {
        const productoGuid = producto.nivelGuid ?? producto.Guid ?? producto.guid;
        if (productoGuid !== guidProducto) return producto;

        return {
          ...producto,
          ConteoFisico: conteo,
          conteoFisico: conteo,
        };
      }));
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isLocalServer, user]);

  return (
    <AuditoriaContext.Provider
      value={{
        auditoriaActiva,
        productosAuditoria,
        auditoriaLoading,
        auditoriaError,
        existeAuditoria: Boolean(auditoriaActiva),
        refreshAuditoria,
        iniciarAuditoria,
      }}
    >
      {children}
    </AuditoriaContext.Provider>
  );
}

export function useAuditoria() {
  const ctx = useContext(AuditoriaContext);
  if (!ctx) throw new Error('useAuditoria must be used within AuditoriaProvider');
  return ctx;
}
