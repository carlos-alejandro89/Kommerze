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

  const buscarProductosKardex = (search = '') =>
    window.go.main.App.ServiceSearchKardexProducts(search);

  const generarKardex = (request) =>
    window.go.main.App.ServiceGenerateKardexReport(request);

  const actualizarStockDiario = (sucursalID) =>
    window.go.main.App.ServiceRefreshTodayStock(Number(sucursalID || 0));

  return { generarProductosVendidos, generarFormatoAuditoria, generarUtilidad, buscarProductosKardex, generarKardex, actualizarStockDiario };
}
