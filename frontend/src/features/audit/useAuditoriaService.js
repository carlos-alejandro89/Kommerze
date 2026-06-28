import {
    ServiceObtenerResumenInventario,
    ServiceIniciarAuditoria
} from '../../../wailsjs/go/main/App';

export const useAuditoriaService = () => {
    const obtenerResumenInventario = async () => ServiceObtenerResumenInventario();

    const iniciarAuditoria = async (sucursalGuid, usuarioEncargadoGuid) => {
        return ServiceIniciarAuditoria(sucursalGuid, usuarioEncargadoGuid);
    };

    return {
        obtenerResumenInventario,
        iniciarAuditoria
    }
}

