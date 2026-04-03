import { useState, createContext, useContext } from "react";
import { ActivationContext } from "./activation-context";
import { ServiceVerifyLicense, ServiceActivateLicense, ServiceObtenerOperacionSucursal } from '../../wailsjs/go/main/App';

export const ActivationProvider = ({ children }) => {
    const [license, setLicense] = useState(null);
    const [store, setStore] = useState(null);
    const [empresa, setEmpresa] = useState(null);
    const [operation, setOperation] = useState(null);
    const [isValid, setIsValid] = useState(false);
    const [isStoreOpen, setIsStoreOpen] = useState(false);

    const verifyLicense = async () => {
        try {
            const result = await ServiceVerifyLicense();
            setIsValid(result.success);
            setLicense(result.data);
            return result.success;
        } catch (error) {
            setIsValid(false);
            return false;
        }
    }

    const activateLicense = async (licenseKey) => {
        try {
            const result = await ServiceActivateLicense(licenseKey);
            setIsValid(result.success);
            setLicense(result.data);
            return result.success;
        } catch (error) {
            setIsValid(false);
            return false;
        }
    }

    const storeStatus = async () => {
        try {
            console.log("iniciando servicio de estatus de tienda");
            const result = await ServiceObtenerOperacionSucursal(license.LicenseKey);
            setEmpresa(result.data.empresa);
            setIsStoreOpen(result.data.operaciones.length > 0);
            setOperation(result.data.operaciones[0]);
            setStore(result.data.sucursal);
            return result.data.operaciones.length > 0;
        } catch (error) {
            console.error("Error al obtener el estado de la sucursal", error);
            setIsStoreOpen(false);
            return false;
        }
    }

    const value = {
        license,
        empresa,
        store,
        operation,
        verifyLicense,
        isValid,
        isStoreOpen,
        storeStatus,
    };

    return (
        <ActivationContext.Provider value={value}>
            {children}
        </ActivationContext.Provider>
    );
};

export const useActivation = () => {
    const context = useContext(ActivationContext);
    if (!context) {
        throw new Error("useActivation must be used within an ActivationProvider");
    }
    return context;
}