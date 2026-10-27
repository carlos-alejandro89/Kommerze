export function useReportsService() {
  const generarProductosVendidos = (fechaInicio, fechaFin, sucursalID) =>
    window.go.main.App.ServiceGenerateSoldProductsReport(
      fechaInicio,
      fechaFin,
      Number(sucursalID || 0),
    );

  const generarFormatoAuditoria = (request) =>
    window.go.main.App.ServiceGenerateAuditReport(request);

  const generarUtilidad = (fechaInicio, fechaFin, sucursalID) =>
    window.go.main.App.ServiceGenerateProfitReport(fechaInicio, fechaFin, Number(sucursalID || 0));

  return { generarProductosVendidos, generarFormatoAuditoria, generarUtilidad };
}
