import { useState, createContext, useContext, useEffect, useCallback } from 'react';
import {
  ServiceVerifyLicense,
  ServiceActivateLicense,
  ServiceObtenerOperacionSucursal,
  ServiceObtenerValorInventario,
  ServiceGetKommerzConfig,
  ServiceTestLocalServerConnection,
} from '../../wailsjs/go/main/App';

const ActivationContext = createContext(undefined);

export const ActivationProvider = ({ children }) => {
  const [license, setLicense]                 = useState(null);
  const [store, setStore]                     = useState(null);
  const [empresa, setEmpresa]                 = useState(null);
  const [operation, setOperation]             = useState(null);
  const [isValid, setIsValid]                 = useState(false);
  const [isStoreOpen, setIsStoreOpen]         = useState(false);
  const [valorInventario, setValorInventario] = useState(0);
  const [deviceRole, setDeviceRole]           = useState(null);   // null = no cargado aún
  const [localServerURL, setLocalServerURL]   = useState('');
  const [isInitialized, setIsInitialized]     = useState(false);

  // ── Inicialización ─────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Leer configuración del dispositivo
        const cfg = await ServiceGetKommerzConfig();

        // Sin rol → marcar como inicializado sin más lógica
        // El DeviceGuard (dentro del router) se encarga de redirigir
        if (!cfg?.role) {
          setIsInitialized(true);
          return;
        }

        setDeviceRole(cfg.role);

        // 2. Modo Caja: verificar conectividad
        if (cfg.role === 'caja') {
          setLocalServerURL(cfg.localServerUrl || '');
          if (cfg.localServerUrl) {
            try {
              const ping = await ServiceTestLocalServerConnection(cfg.localServerUrl);
              setIsValid(!!ping?.success);
              if (ping?.success && ping?.data?.branchName) {
                setLicense({ sucursal: { nombreSucursal: ping.data.branchName } });
              }
            } catch {
              setIsValid(false);
            }
          }
          setIsInitialized(true);
          return;
        }

        // 3. Modo Servidor Local: verificar licencia
        const lic = await ServiceVerifyLicense();
        if (lic?.success && lic?.data) {
          setIsValid(true);
          setLicense(lic.data);

          const storeRes = await ServiceObtenerOperacionSucursal(
            lic.data.sucursal.licencia.licenciaKey,
          );
          if (storeRes?.success && storeRes?.data) {
            setEmpresa(storeRes.data.empresa);
            setIsStoreOpen(storeRes.data.operaciones?.length > 0);
            setOperation(storeRes.data.operaciones?.[0] || null);
            setStore(storeRes.data.sucursal);
          }

          const invRes = await ServiceObtenerValorInventario();
          if (invRes?.success) {
            setValorInventario(invRes.data?.valorInventario ?? invRes.data ?? 0);
          }
        }
      } catch (error) {
        console.error('[ActivationProvider] Error de inicialización:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    init();
  }, []);

  // ── Funciones de licencia (Servidor Local) ─────────────────────────────────
  const verifyLicense = useCallback(async () => {
    try {
      const result = await ServiceVerifyLicense();
      setIsValid(result.success);
      setLicense(result.data);
      return result.success;
    } catch {
      setIsValid(false);
      return false;
    }
  }, []);

  const activateLicense = useCallback(async (licenseKey) => {
    try {
      const result = await ServiceActivateLicense(licenseKey);
      setIsValid(result.success);
      setLicense(result.data);
      return result.success;
    } catch {
      setIsValid(false);
      return false;
    }
  }, []);

  const storeStatus = useCallback(async () => {
    try {
      const result = await ServiceObtenerOperacionSucursal(
        license.sucursal.licencia.licenciaKey,
      );
      if (result.success) {
        setEmpresa(result.data.empresa);
        setIsStoreOpen(result.data.operaciones.length > 0);
        setOperation(result.data.operaciones[0]);
        setStore(result.data.sucursal);
        return result.data.operaciones.length > 0;
      }
      return false;
    } catch {
      setIsStoreOpen(false);
      return false;
    }
  }, [license]);

  const getInventoryValue = useCallback(async () => {
    try {
      const result = await ServiceObtenerValorInventario();
      if (result.data === null) { setValorInventario(0); return 0; }
      setValorInventario(result.data);
      return result.data.valorInventario;
    } catch {
      setValorInventario(0);
      return 0;
    }
  }, []);

  return (
    <ActivationContext.Provider
      value={{
        license, empresa, store, operation,
        verifyLicense, activateLicense,
        isValid, isStoreOpen, storeStatus,
        valorInventario, getInventoryValue,
        // Rol del dispositivo
        deviceRole, localServerURL,
        // Setters para actualizar en memoria desde las páginas de setup
        setDeviceRole, setLocalServerURL,
        isInitialized,
        isCaja: deviceRole === 'caja',
        isLocalServer: deviceRole === 'servidor_local',
      }}
    >
      {children}
    </ActivationContext.Provider>
  );
};

export const useActivation = () => {
  const ctx = useContext(ActivationContext);
  if (!ctx) throw new Error('useActivation must be used within ActivationProvider');
  return ctx;
};
