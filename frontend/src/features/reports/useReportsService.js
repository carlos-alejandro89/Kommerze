export function useReportsService() {
  const generarProductosVendidos = (fechaInicio, fechaFin, sucursalID) =>
    window.go.main.App.ServiceGenerateSoldProductsReport(
      fechaInicio,
      fechaFin,
      Number(sucursalID || 0),
    );

  const generarFormatoAuditoria = (request) =>
    window.go.main.App.ServiceGenerateAuditReport(request);

  return { generarProductosVendidos, generarFormatoAuditoria };
}
