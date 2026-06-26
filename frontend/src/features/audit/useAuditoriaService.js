import {
    ServiceObtenerResumenInventario
} from '../../../wailsjs/go/main/App';

export const useAuditoriaService = () => {
    const obtenerResumenInventario = async () => ServiceObtenerResumenInventario();

    return {
        obtenerResumenInventario
    }
}

