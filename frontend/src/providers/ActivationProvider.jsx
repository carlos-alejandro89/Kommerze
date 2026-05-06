import { useState, createContext, useContext, useEffect } from 'react';
import {
  ServiceVerifyLicense,
  ServiceActivateLicense,
  ServiceObtenerOperacionSucursal,
  ServiceObtenerValorInventario,
} from '../../wailsjs/go/main/App';

const ActivationContext = createContext(undefined);

export const ActivationProvider = ({ children }) => {
  const [license, setLicense]               = useState(null);
  const [store, setStore]                   = useState(null);
  const [empresa, setEmpresa]               = useState(null);
  const [operation, setOperation]           = useState(null);
  const [isValid, setIsValid]               = useState(false);
  const [isStoreOpen, setIsStoreOpen]       = useState(false);
  const [valorInventario, setValorInventario] = useState(0);

  // Automatically load activation state on mount
  useEffect(() => {
    const init = async () => {
      try {
        const lic = await ServiceVerifyLicense();
        if (lic?.success && lic?.data) {
          setIsValid(true);
          setLicense(lic.data);
          
          const storeRes = await ServiceObtenerOperacionSucursal(lic.data.sucursal.licencia.licenciaKey);
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
        console.error('Failed to initialize activation state:', error);
      }
    };
    init();
  }, []);

  const verifyLicense = async () => {
    try {
      const result = await ServiceVerifyLicense();
      setIsValid(result.success);
      setLicense(result.data);
      return result.success;
    } catch {
      setIsValid(false);
      return false;
    }
  };

  const activateLicense = async (licenseKey) => {
    try {
      const result = await ServiceActivateLicense(licenseKey);
      setIsValid(result.success);
      setLicense(result.data);
      return result.success;
    } catch {
      setIsValid(false);
      return false;
    }
  };

  const storeStatus = async () => {
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
  };

  const getInventoryValue = async () => {
    try {
      const result = await ServiceObtenerValorInventario();
      if (result.data === null) { setValorInventario(0); return 0; }
      setValorInventario(result.data);
      return result.data.valorInventario;
    } catch {
      setValorInventario(0);
      return 0;
    }
  };

  return (
    <ActivationContext.Provider
      value={{
        license, empresa, store, operation,
        verifyLicense, activateLicense,
        isValid, isStoreOpen, storeStatus,
        valorInventario, getInventoryValue,
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
