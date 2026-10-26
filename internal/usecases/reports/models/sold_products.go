package models

type SoldProductRow struct {
	Codigo   string
	Producto string
	Empaque  string
	Cantidad float64
}

type SoldProductsReport struct {
	FechaInicio    string
	FechaFin       string
	Empresa        string
	Sucursal       string
	GeneradoEn     string
	Productos      []SoldProductRow
	TotalProductos int
	TotalUnidades  float64
}

type SoldProductsReportOutput struct {
	Report    SoldProductsReport
	PDFBase64 string
	FileName  string
}

type AuditReportRequest struct {
	SucursalID    uint
	LineasIDs     []uint
	MarcasIDs     []uint
	ConExistencia bool
}

type AuditReportRow struct {
	Linea      string
	Marca      string
	Codigo     string
	Producto   string
	Empaque    string
	Existencia float64
}

type AuditReport struct {
	Empresa        string
	Sucursal       string
	FechaImpresion string
	ConExistencia  bool
	Productos      []AuditReportRow
	TotalProductos int
}

type AuditReportOutput struct {
	Report    AuditReport
	PDFBase64 string
	FileName  string
}
