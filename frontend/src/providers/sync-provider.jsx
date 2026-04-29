import React, { createContext, useContext, useEffect } from 'react';
import { EventsOn } from '../wailsjs/runtime/runtime'; // Ajusta la ruta a tu carpeta wailsjs
import { toast } from 'react-hot-toast'; // O tu librería de notificaciones favorita

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {

    useEffect(() => {
        // Escuchamos el evento que viene desde el Repository de Go
        const unsubscribe = EventsOn("sync_status", (data) => {
            console.log("Evento de sincronización recibido:", data);

            if (data.success) {
                toast.success(`Pedido #${data.pedidoID} sincronizado correctamente`, {
                    duration: 4000,
                    position: 'bottom-right',
                });
            } else {
                toast.error(`Error al sincronizar pedido #${data.pedidoID}: ${data.error}`, {
                    duration: 6000,
                });
            }
        });

        // Limpieza al desmontar el provider
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    return (
        <SyncContext.Provider value={{}}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => useContext(SyncContext);