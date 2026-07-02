import {
    ServiceObtenerResumenInventario,
    ServiceIniciarAuditoria,
    ServiceVerificarAuditoriasEnCurso
} from '../../../wailsjs/go/main/App';

export const useAuditoriaService = () => {
    const obtenerResumenInventario = async () => ServiceObtenerResumenInventario();

    const iniciarAuditoria = async (sucursalGuid, usuarioEncargadoGuid) => {
        return ServiceIniciarAuditoria(sucursalGuid, usuarioEncargadoGuid);
    };

    const verificarAuditoriaEnCurso = async () => ServiceVerificarAuditoriasEnCurso();

    return {
        obtenerResumenInventario,
        iniciarAuditoria,
        verificarAuditoriaEnCurso
    }
}

