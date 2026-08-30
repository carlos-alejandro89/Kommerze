package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	reportmodels "BitComercio/internal/usecases/reports/models"
	"BitComercio/internal/usecases/reports/renders"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"
)

type FacturacionService struct {
	db     *gorm.DB
	client *http.Client
}

type cfdiEmissionResponse struct {
	Success  bool   `json:"success"`
	Mensaje  string `json:"mensaje"`
	HTTPCode int    `json:"httpCode"`
	Data     struct {
		UUID                string `json:"uuid"`
		FechaTimbrado       string `json:"fechaTimbrado"`
		NoCertificadoSAT    string `json:"noCertificadoSat"`
		NoCertificadoEmisor string `json:"noCertificadoEmisor"`
		SelloSAT            string `json:"selloSat"`
		SelloEmisor         string `json:"selloEmisor"`
		CadenaOriginalSAT   string `json:"cadenaOriginalSat"`
		CFDIXMLBase64       string `json:"cfdiXmlBase64"`
	} `json:"data"`
}

var invoiceFilePartPattern = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

func saveStampedXML(folder, serie string, folio int, invoiceUUID, encoded string) (string, error) {
	folder = strings.TrimSpace(folder)
	if folder == "" {
		return "", fmt.Errorf("configura la Carpeta de facturas en Configuración > Facturación")
	}
	absoluteFolder, err := filepath.Abs(folder)
	if err != nil {
		return "", fmt.Errorf("ruta de facturas inválida: %w", err)
	}
	xmlBytes, err := base64.StdEncoding.DecodeString(strings.TrimSpace(encoded))
	if err != nil {
		return "", fmt.Errorf("el servicio devolvió un XML Base64 inválido: %w", err)
	}
	if len(xmlBytes) == 0 {
		return "", fmt.Errorf("el servicio devolvió un XML timbrado vacío")
	}
	if err := os.MkdirAll(absoluteFolder, 0755); err != nil {
		return "", fmt.Errorf("no se pudo preparar la carpeta de facturas: %w", err)
	}
	fileName := fmt.Sprintf("CFDI-%s-%06d-%s.xml", invoiceFilePartPattern.ReplaceAllString(serie, "_"), folio, invoiceFilePartPattern.ReplaceAllString(invoiceUUID, "_"))
	finalPath := filepath.Join(absoluteFolder, fileName)
	tempFile, err := os.CreateTemp(absoluteFolder, ".cfdi-*.tmp")
	if err != nil {
		return "", fmt.Errorf("no se pudo crear el archivo temporal del CFDI: %w", err)
	}
	tempPath := tempFile.Name()
	cleanup := func() { tempFile.Close(); _ = os.Remove(tempPath) }
	if _, err = tempFile.Write(xmlBytes); err != nil {
		cleanup()
		return "", fmt.Errorf("no se pudo escribir el XML: %w", err)
	}
	if err = tempFile.Sync(); err != nil {
		cleanup()
		return "", fmt.Errorf("no se pudo confirmar el XML: %w", err)
	}
	if err = tempFile.Close(); err != nil {
		_ = os.Remove(tempPath)
		return "", err
	}
	if err = os.Chmod(tempPath, 0644); err != nil {
		_ = os.Remove(tempPath)
		return "", err
	}
	if err = os.Rename(tempPath, finalPath); err != nil {
		_ = os.Remove(tempPath)
		return "", fmt.Errorf("no se pudo guardar el XML timbrado: %w", err)
	}
	return finalPath, nil
}

func saveInvoicePDF(xmlPath string, pdf []byte) (string, error) {
	if len(pdf) == 0 {
		return "", fmt.Errorf("el PDF fiscal está vacío")
	}
	path := strings.TrimSuffix(xmlPath, filepath.Ext(xmlPath)) + ".pdf"
	if err := os.WriteFile(path, pdf, 0644); err != nil {
		return "", fmt.Errorf("no se pudo guardar el PDF fiscal: %w", err)
	}
	return path, nil
}

func joinAddress(parts ...string) string {
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		if value := strings.TrimSpace(part); value != "" {
			clean = append(clean, value)
		}
	}
	return strings.Join(clean, ", ")
}

func parseStampDate(value string) (time.Time, error) {
	location, err := time.LoadLocation(facturacionTimezone)
	if err != nil {
		return time.Time{}, err
	}
	value = strings.TrimSpace(value)
	for _, layout := range []string{
		time.RFC3339Nano,
		"2006-01-02T15:04:05",
		"01/02/2006 15:04:05",
	} {
		var parsed time.Time
		if layout != time.RFC3339Nano {
			parsed, err = time.ParseInLocation(layout, value, location)
		} else {
			parsed, err = time.Parse(layout, value)
		}
		if err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, fmt.Errorf("fecha de timbrado inválida: %s", value)
}

func NewFacturacionService(db *gorm.DB) *FacturacionService {
	return &FacturacionService{db: db, client: &http.Client{Timeout: 30 * time.Second}}
}

func catalogo(id uint, guid, clave, descripcion string) dto.FacturacionCatalogoDto {
	return dto.FacturacionCatalogoDto{ID: id, Guid: guid, Clave: clave, Descripcion: descripcion}
}

func (s *FacturacionService) PrepararFactura(pedidoGuid string) (*dto.FacturacionPreparacionDto, error) {
	var pedido models.Pedido
	err := s.db.Preload("Cliente").Preload("SucursalOrigen.Empresa.RegimenFiscal").
		Where("pedidos.guid = ?", pedidoGuid).First(&pedido).Error
	if err != nil {
		return nil, fmt.Errorf("no se encontró la venta: %w", err)
	}

	var detalles []models.PedidoDetalle
	if err := s.db.Preload("Nivel.Producto.SatProducto").Preload("Nivel.Empaque").Where("pedido_id = ?", pedido.ID).Find(&detalles).Error; err != nil {
		return nil, err
	}
	result := &dto.FacturacionPreparacionDto{PedidoGuid: pedidoGuid, Folio: pedido.Folio, Serie: pedido.SucursalOrigen.SerieCFDI, Fecha: pedido.Fecha, Cliente: pedido.Cliente.RazonSocial}
	if result.Serie == "" {
		result.Serie = "A"
	}

	if pedido.ClienteID != nil {
		var entidades []models.EntidadFiscal
		s.db.Joins("JOIN cliente_entidad_fiscal cef ON cef.entidad_fiscal_id = entidades_fiscales.id AND cef.deleted_at IS NULL").
			Joins("JOIN entidad_fiscal_roles efr ON efr.entidad_fiscal_id = entidades_fiscales.id AND efr.deleted_at IS NULL").
			Joins("JOIN roles_fiscales rf ON rf.id = efr.rol_id AND UPPER(rf.nombre) = 'RECEPTOR'").
			Preload("Regimen").Where("cef.cliente_id = ?", *pedido.ClienteID).Distinct().Find(&entidades)
		for _, e := range entidades {
			result.Entidades = append(result.Entidades, dto.FacturacionEntidadDto{ID: e.ID, Guid: e.Guid.String(), RFC: e.RFC, RazonSocial: e.RazonSocial, CodigoPostal: e.CodigoPostal, RegimenClave: e.Regimen.Clave, Regimen: e.Regimen.Descripcion})
		}
	}

	var usos []models.SATUsoCFDI
	s.db.Where("activo = ?", true).Order("clave").Find(&usos)
	for _, x := range usos {
		result.UsosCFDI = append(result.UsosCFDI, catalogo(x.ID, x.Guid.String(), x.Clave, x.Descripcion))
	}
	var formas []models.SATFormaPago
	s.db.Where("activo = ?", true).Order("clave").Find(&formas)
	for _, x := range formas {
		result.FormasPago = append(result.FormasPago, catalogo(x.ID, x.Guid.String(), x.Clave, x.Descripcion))
	}
	var metodos []models.SATMetodoPago
	s.db.Order("clave").Find(&metodos)
	for _, x := range metodos {
		result.MetodosPago = append(result.MetodosPago, catalogo(x.ID, x.Guid.String(), x.Clave, x.Descripcion))
		if x.Clave == "PUE" {
			result.MetodoPagoSugeridoID = x.ID
		}
	}
	type pagoSum struct {
		FormaID uint
		Total   float64
	}
	var predominante pagoSum
	s.db.Model(&models.Pago{}).Select("forma_id, SUM(monto) total").Where("pedido_id = ?", pedido.ID).Group("forma_id").Order("total DESC").Limit(1).Scan(&predominante)
	result.FormaPagoPredominanteID = predominante.FormaID

	inputs := make([]satSaleLineInput, len(detalles))
	for index, d := range detalles {
		inputs[index] = satSaleLineInput{Quantity: d.Cantidad, GrossUnit: d.PrecioVenta, DiscountPercent: d.Descuento, TaxRate: d.TasaIVA}
	}
	invoiceCalc, err := calculateSATInvoice(inputs)
	if err != nil {
		return nil, err
	}
	for index, d := range detalles {
		calc := invoiceCalc.Lines[index]
		result.Conceptos = append(result.Conceptos, dto.FacturacionConceptoDto{Codigo: d.Nivel.Codigo, Descripcion: d.Nivel.Producto.Descripcion, Unidad: d.Nivel.Empaque.NombreEmpaque, Cantidad: calc.Quantity.InexactFloat64(), PrecioConIVA: d.PrecioVenta.InexactFloat64(), Descuento: d.Descuento.InexactFloat64(), Total: satCurrency(calc.TotalWithTax).InexactFloat64()})
	}
	result.Subtotal = satNumber(invoiceCalc.Subtotal)
	result.Descuentos = satNumber(invoiceCalc.Discounts)
	result.Impuestos = satNumber(invoiceCalc.Taxes)
	result.Total = satNumber(invoiceCalc.Total)
	return result, nil
}

// BuscarEntidadesReceptoras devuelve entidades fiscales registradas con rol
// RECEPTOR, independientemente del cliente al que estén vinculadas.
func (s *FacturacionService) BuscarEntidadesReceptoras(termino string) ([]dto.FacturacionEntidadDto, error) {
	termino = strings.TrimSpace(termino)
	pattern := "%" + termino + "%"
	var entidades []dto.FacturacionEntidadDto
	err := s.db.Raw(`
		SELECT DISTINCT ef.id, ef.guid, ef.rfc, ef.razon_social, ef.codigo_postal,
		       COALESCE(sr.clave, '') AS regimen_clave,
		       COALESCE(sr.descripcion, '') AS regimen
		FROM entidades_fiscales ef
		JOIN entidad_fiscal_roles efr
		  ON efr.entidad_fiscal_id = ef.id AND efr.deleted_at IS NULL
		JOIN roles_fiscales rf
		  ON rf.id = efr.rol_id AND rf.deleted_at IS NULL AND UPPER(rf.nombre) = 'RECEPTOR'
		LEFT JOIN sat_regimen_fiscal sr ON sr.id = ef.regimen_id
		WHERE ef.deleted_at IS NULL
		  AND (? = '' OR ef.razon_social ILIKE ? OR ef.rfc ILIKE ?
		       OR ef.codigo_postal ILIKE ? OR sr.clave ILIKE ? OR sr.descripcion ILIKE ?)
		ORDER BY ef.razon_social
		LIMIT 200`, termino, pattern, pattern, pattern, pattern, pattern).
		Scan(&entidades).Error
	return entidades, err
}

func (s *FacturacionService) EmitirFactura(req dto.EmitirFacturacionRequestDto) (*dto.FacturacionResultadoDto, error) {
	prep, err := s.PrepararFactura(req.PedidoGuid)
	if err != nil {
		return nil, err
	}
	var pedido models.Pedido
	if err = s.db.Preload("SucursalOrigen.Empresa.RegimenFiscal").Where("guid = ?", req.PedidoGuid).First(&pedido).Error; err != nil {
		return nil, err
	}
	var receptor models.EntidadFiscal
	entityQuery := s.db.Preload("Regimen").
		Joins("JOIN cliente_entidad_fiscal cef ON cef.entidad_fiscal_id = entidades_fiscales.id AND cef.deleted_at IS NULL").
		Joins("JOIN entidad_fiscal_roles efr ON efr.entidad_fiscal_id = entidades_fiscales.id AND efr.deleted_at IS NULL").
		Joins("JOIN roles_fiscales rf ON rf.id = efr.rol_id AND UPPER(rf.nombre) = 'RECEPTOR'").
		Where("entidades_fiscales.id = ?", req.EntidadFiscalID).
		Distinct()
	if err = entityQuery.First(&receptor).Error; err != nil {
		return nil, fmt.Errorf("entidad fiscal inválida")
	}
	var uso models.SATUsoCFDI
	if err = s.db.First(&uso, req.UsoCFDIID).Error; err != nil {
		return nil, fmt.Errorf("uso CFDI inválido")
	}
	var forma models.SATFormaPago
	if err = s.db.First(&forma, req.FormaPagoID).Error; err != nil {
		return nil, fmt.Errorf("forma de pago inválida")
	}
	var metodo models.SATMetodoPago
	if err = s.db.First(&metodo, req.MetodoPagoID).Error; err != nil {
		return nil, fmt.Errorf("método de pago inválido")
	}
	var detalles []models.PedidoDetalle
	if err = s.db.Preload("Nivel.Producto.SatProducto").Preload("Nivel.Empaque").Where("pedido_id = ?", pedido.ID).Find(&detalles).Error; err != nil {
		return nil, err
	}
	inputs := make([]satSaleLineInput, len(detalles))
	for index, d := range detalles {
		inputs[index] = satSaleLineInput{Quantity: d.Cantidad, GrossUnit: d.PrecioVenta, DiscountPercent: d.Descuento, TaxRate: d.TasaIVA}
	}
	invoiceCalc, err := calculateSATInvoice(inputs)
	if err != nil {
		return nil, err
	}
	conceptos := make([]map[string]any, 0, len(detalles))
	invoiceItems := make([]reportmodels.InvoiceItem, 0, len(detalles))
	for index, d := range detalles {
		calc := invoiceCalc.Lines[index]
		obj := d.Nivel.Producto.ObjetoImpuesto
		if obj == "" {
			obj = "02"
		}
		claveProd := "01010101"
		if d.Nivel.Producto.SatProducto.Clave != "" {
			claveProd = d.Nivel.Producto.SatProducto.Clave
		}
		conceptos = append(conceptos, map[string]any{"claveProdServ": claveProd, "noIdentificacion": d.Nivel.Codigo, "descripcion": d.Nivel.Producto.Descripcion, "cantidad": satNumber(calc.Quantity), "claveUnidad": "H87", "unidad": d.Nivel.Empaque.NombreEmpaque, "valorUnitario": satNumber(calc.UnitValue), "importe": satNumber(calc.Amount), "objetoImp": obj, "descuento": satNumber(calc.Discount), "impuestos": []map[string]any{{"importeImpuesto": satNumber(calc.TaxAmount), "baseImpuesto": satNumber(calc.TaxBase), "impuesto": "002", "tasaOCuota": calc.TaxRate.StringFixed(6)}}})
		invoiceItems = append(invoiceItems, reportmodels.InvoiceItem{Codigo: d.Nivel.Codigo, ClaveSAT: claveProd, Descripcion: d.Nivel.Producto.Descripcion, Unidad: d.Nivel.Empaque.NombreEmpaque, Cantidad: satNumber(calc.Quantity), PrecioUnitario: satNumber(calc.UnitValue), Descuento: satNumber(calc.Discount), Impuestos: satNumber(calc.TaxAmount), Importe: satNumber(calc.Amount)})
	}
	emp := pedido.SucursalOrigen.Empresa
	subtotalCFDI := invoiceCalc.Subtotal
	descuentosCFDI := invoiceCalc.Discounts
	impuestosCFDI := invoiceCalc.Taxes
	totalCFDI := invoiceCalc.Total
	fechaCFDI, err := fechaFacturacion(pedido.Fecha)
	if err != nil {
		return nil, err
	}
	facturaSerie := strings.TrimSpace(prep.Serie)
	if facturaSerie == "" {
		facturaSerie = "A"
	}
	var facturaFolio int
	if pedido.FacturaID != nil {
		var existente models.Factura
		if err = s.db.Select("serie", "folio").First(&existente, *pedido.FacturaID).Error; err != nil {
			return nil, fmt.Errorf("no se pudo recuperar el folio interno de la factura: %w", err)
		}
		facturaSerie = existente.Serie
		facturaFolio = existente.Folio
	}
	if facturaFolio <= 0 {
		if err = s.db.Raw("SELECT nextval('consecutivo_folio_factura')").Scan(&facturaFolio).Error; err != nil {
			return nil, fmt.Errorf("no se pudo generar el folio interno de la factura: %w", err)
		}
	}
	payload := map[string]any{"serie": facturaSerie, "folioInterno": fmt.Sprintf("%06d", facturaFolio), "fecha": fechaCFDI, "cveMetodoPago": metodo.Clave, "metodoPago": metodo.Descripcion, "cveFormaPago": forma.Clave, "formaPago": forma.Descripcion, "subTotal": satNumber(subtotalCFDI), "descuentos": satNumber(descuentosCFDI), "impuestos": satNumber(impuestosCFDI), "total": satNumber(totalCFDI), "rfcEmisor": emp.RFC, "emisor": emp.RazonSocial, "cveRegimenEmisor": emp.RegimenFiscal.Clave, "regimenEmisor": emp.RegimenFiscal.Descripcion, "lugarExpedicion": pedido.SucursalOrigen.CodigoPostal, "rfcReceptor": receptor.RFC, "receptor": receptor.RazonSocial, "cveRegimenReceptor": receptor.Regimen.Clave, "regimenReceptor": receptor.Regimen.Descripcion, "domicilioFiscalReceptor": receptor.CodigoPostal, "cveUsoCFDI": uso.Clave, "usoCFDI": uso.Descripcion, "conceptos": conceptos}
	cfg, err := LoadKommerzConfig()
	if err != nil {
		return nil, err
	}
	if cfg.FacturacionAPIHost == "" || cfg.FacturacionClientID == "" || cfg.FacturacionClientSecret == "" {
		return nil, fmt.Errorf("configura Api Host, Client ID y Client Secret en Configuración > Facturación")
	}
	if strings.TrimSpace(cfg.FacturacionXMLPath) == "" {
		return nil, fmt.Errorf("configura la Carpeta de facturas en Configuración > Facturación")
	}
	form := url.Values{"grant_type": {"client_credentials"}, "scope": {"cfdi.emit"}}
	tokenReq, _ := http.NewRequest(http.MethodPost, strings.TrimRight(cfg.FacturacionAPIHost, "/")+"/oauth/token", strings.NewReader(form.Encode()))
	tokenReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	tokenReq.SetBasicAuth(cfg.FacturacionClientID, cfg.FacturacionClientSecret)
	tokenResp, err := s.client.Do(tokenReq)
	if err != nil {
		return nil, fmt.Errorf("no se pudo autenticar con facturación: %w", err)
	}
	defer tokenResp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(tokenResp.Body, 2<<20))
	if tokenResp.StatusCode < 200 || tokenResp.StatusCode >= 300 {
		return nil, fmt.Errorf("autenticación de facturación respondió %d: %s", tokenResp.StatusCode, string(body))
	}
	var token struct {
		AccessToken string `json:"access_token"`
	}
	if json.Unmarshal(body, &token) != nil || token.AccessToken == "" {
		return nil, fmt.Errorf("la autenticación no devolvió un access_token")
	}
	data, _ := json.Marshal(payload)
	apiReq, _ := http.NewRequest(http.MethodPost, strings.TrimRight(cfg.FacturacionAPIHost, "/")+"/api/facturacion/emitir-cfdi?esGlobal=false", bytes.NewReader(data))
	apiReq.Header.Set("Content-Type", "application/json")
	apiReq.Header.Set("Authorization", "Bearer "+token.AccessToken)
	apiResp, err := s.client.Do(apiReq)
	if err != nil {
		return nil, fmt.Errorf("no se pudo emitir el CFDI: %w", err)
	}
	defer apiResp.Body.Close()
	apiBody, _ := io.ReadAll(io.LimitReader(apiResp.Body, 8<<20))
	if apiResp.StatusCode < 200 || apiResp.StatusCode >= 300 {
		return nil, fmt.Errorf("emisión CFDI respondió %d: %s", apiResp.StatusCode, string(apiBody))
	}
	var stamped cfdiEmissionResponse
	if err = json.Unmarshal(apiBody, &stamped); err != nil {
		return nil, fmt.Errorf("respuesta de timbrado inválida: %w", err)
	}
	if !stamped.Success {
		return nil, fmt.Errorf("el CFDI no fue timbrado: %s", stamped.Mensaje)
	}
	if strings.TrimSpace(stamped.Data.UUID) == "" || strings.TrimSpace(stamped.Data.CFDIXMLBase64) == "" {
		return nil, fmt.Errorf("la respuesta de timbrado no contiene UUID o XML")
	}
	stampDate, err := parseStampDate(stamped.Data.FechaTimbrado)
	if err != nil {
		return nil, err
	}
	xmlPath, err := saveStampedXML(cfg.FacturacionXMLPath, facturaSerie, facturaFolio, stamped.Data.UUID, stamped.Data.CFDIXMLBase64)
	if err != nil {
		return nil, err
	}
	emissionDate, err := time.Parse(time.RFC3339, fechaCFDI)
	if err != nil {
		return nil, fmt.Errorf("fecha de emisión inválida para PDF: %w", err)
	}
	invoiceReport := reportmodels.Invoice{
		Serie: facturaSerie, Folio: fmt.Sprintf("%06d", facturaFolio), UUID: stamped.Data.UUID,
		FechaEmision: emissionDate, FechaTimbrado: stampDate,
		NombreComercial: emp.NombreComercial, Emisor: emp.RazonSocial, RFCEmisor: emp.RFC, RegimenEmisor: emp.RegimenFiscal.Clave + " - " + emp.RegimenFiscal.Descripcion,
		LugarExpedicion: pedido.SucursalOrigen.CodigoPostal, Sucursal: pedido.SucursalOrigen.NombreSucursal,
		Direccion: joinAddress(pedido.SucursalOrigen.Calle, pedido.SucursalOrigen.Exterior, pedido.SucursalOrigen.Interior, pedido.SucursalOrigen.Colonia, pedido.SucursalOrigen.Ciudad, pedido.SucursalOrigen.Estado, "C.P. "+pedido.SucursalOrigen.CodigoPostal),
		Telefono:  pedido.SucursalOrigen.Telefono, Correo: pedido.SucursalOrigen.Correo,
		Receptor: receptor.RazonSocial, RFCReceptor: receptor.RFC, RegimenReceptor: receptor.Regimen.Clave + " - " + receptor.Regimen.Descripcion,
		DomicilioReceptor: receptor.CodigoPostal, UsoCFDI: uso.Clave + " - " + uso.Descripcion,
		MetodoPago: metodo.Clave + " - " + metodo.Descripcion, FormaPago: forma.Clave + " - " + forma.Descripcion,
		CertificadoEmisor: stamped.Data.NoCertificadoEmisor, CertificadoSAT: stamped.Data.NoCertificadoSAT,
		SelloEmisor: stamped.Data.SelloEmisor, SelloSAT: stamped.Data.SelloSAT, CadenaOriginalSAT: stamped.Data.CadenaOriginalSAT,
		Items: invoiceItems, Subtotal: satNumber(subtotalCFDI), Descuento: satNumber(descuentosCFDI), Impuestos: satNumber(impuestosCFDI), Total: satNumber(totalCFDI),
	}
	pdfBytes, err := renders.RenderInvoicePDF(invoiceReport)
	if err != nil {
		return nil, fmt.Errorf("CFDI timbrado y XML guardado, pero no se pudo generar el PDF: %w", err)
	}
	pdfPath, err := saveInvoicePDF(xmlPath, pdfBytes)
	if err != nil {
		return nil, err
	}

	factura := models.Factura{
		Serie: facturaSerie, Folio: facturaFolio,
		ReceptorID: &receptor.ID, UsoCFDIID: &uso.ID, MetodoPagoID: &metodo.ID, FormaPagoID: &forma.ID,
		UUID: stamped.Data.UUID, NumeroCertificadoEmisor: stamped.Data.NoCertificadoEmisor,
		NumeroCertificadoSAT: stamped.Data.NoCertificadoSAT, SelloEmisor: stamped.Data.SelloEmisor,
		SelloSAT: stamped.Data.SelloSAT, CadenaOriginalSAT: stamped.Data.CadenaOriginalSAT,
		FechaFactura: stampDate, EsGlobal: false, Subtotal: subtotalCFDI, Impuestos: impuestosCFDI,
		Descuento: descuentosCFDI, Total: totalCFDI, Estatus: "vigente", ArchivoXML: xmlPath, ArchivoPDF: pdfPath,
	}
	if err = s.db.Transaction(func(tx *gorm.DB) error {
		if pedido.FacturaID != nil {
			factura.ID = *pedido.FacturaID
			return tx.Model(&models.Factura{}).Where("id = ?", factura.ID).Updates(&factura).Error
		}
		if err := tx.Create(&factura).Error; err != nil {
			return err
		}
		return tx.Model(&models.Pedido{}).Where("id = ?", pedido.ID).Update("factura_id", factura.ID).Error
	}); err != nil {
		return nil, fmt.Errorf("el CFDI fue timbrado pero no se pudo registrar localmente; XML guardado en %s: %w", xmlPath, err)
	}
	return &dto.FacturacionResultadoDto{Success: true, Mensaje: stamped.Mensaje, UUID: stamped.Data.UUID, PDFBase64: base64.StdEncoding.EncodeToString(pdfBytes), PDFFileName: filepath.Base(pdfPath), Data: map[string]any{"uuid": stamped.Data.UUID, "fechaTimbrado": stamped.Data.FechaTimbrado, "archivoXML": xmlPath, "archivoPDF": pdfPath, "correoReceptor": receptor.Correo}}, nil
}

func (s *FacturacionService) EnviarFacturaCorreo(req dto.EnviarFacturaEmailRequestDto) error {
	var pedido models.Pedido
	if err := s.db.Preload("Factura.Receptor").Where("guid = ?", req.PedidoGuid).First(&pedido).Error; err != nil {
		return fmt.Errorf("venta facturada no encontrada: %w", err)
	}
	if pedido.FacturaID == nil || pedido.Factura.UUID == "" {
		return fmt.Errorf("el pedido no tiene un CFDI timbrado")
	}
	cfg, err := LoadKommerzConfig()
	if err != nil {
		return err
	}
	return EmailInvoiceFiles(pedido.Factura, pedido.Folio, req.Destinatarios, cfg.Receipt)
}

// ObtenerFacturaPDF devuelve la representación impresa del CFDI. Si el archivo
// fue movido o eliminado, lo reconstruye con los datos fiscales almacenados y
// vuelve a guardarlo junto al XML timbrado.
func (s *FacturacionService) ObtenerFacturaPDF(pedidoGuid string) (*dto.FacturacionResultadoDto, error) {
	var pedido models.Pedido
	err := s.db.
		Preload("SucursalOrigen.Empresa.RegimenFiscal").
		Preload("Factura.Receptor.Regimen").
		Preload("Factura.UsoCFDI").
		Preload("Factura.MetodoPago").
		Preload("Factura.FormaPago").
		Where("pedidos.guid = ? AND pedidos.deleted_at IS NULL", strings.TrimSpace(pedidoGuid)).
		First(&pedido).Error
	if err != nil {
		return nil, fmt.Errorf("venta facturada no encontrada: %w", err)
	}
	if pedido.FacturaID == nil || strings.TrimSpace(pedido.Factura.UUID) == "" {
		return nil, fmt.Errorf("la venta aún no tiene un CFDI timbrado")
	}

	factura := &pedido.Factura
	if path := strings.TrimSpace(factura.ArchivoPDF); path != "" {
		if pdfBytes, readErr := os.ReadFile(path); readErr == nil && len(pdfBytes) > 0 {
			return &dto.FacturacionResultadoDto{
				Success: true, UUID: factura.UUID,
				PDFBase64: base64.StdEncoding.EncodeToString(pdfBytes), PDFFileName: filepath.Base(path),
				Data: map[string]any{
					"archivoPDF": path, "archivoXML": factura.ArchivoXML,
					"correoReceptor": factura.Receptor.Correo, "estatus": factura.Estatus,
					"regenerado": false,
				},
			}, nil
		}
	}

	var detalles []models.PedidoDetalle
	if err = s.db.Preload("Nivel.Producto.SatProducto").Preload("Nivel.Empaque").
		Where("pedido_id = ? AND deleted_at IS NULL", pedido.ID).Find(&detalles).Error; err != nil {
		return nil, fmt.Errorf("no se pudieron recuperar los conceptos de la factura: %w", err)
	}
	inputs := make([]satSaleLineInput, len(detalles))
	for index, detalle := range detalles {
		inputs[index] = satSaleLineInput{Quantity: detalle.Cantidad, GrossUnit: detalle.PrecioVenta, DiscountPercent: detalle.Descuento, TaxRate: detalle.TasaIVA}
	}
	calculo, err := calculateSATInvoice(inputs)
	if err != nil {
		return nil, err
	}
	items := make([]reportmodels.InvoiceItem, 0, len(detalles))
	for index, detalle := range detalles {
		linea := calculo.Lines[index]
		claveSAT := detalle.Nivel.Producto.SatProducto.Clave
		if claveSAT == "" {
			claveSAT = "01010101"
		}
		items = append(items, reportmodels.InvoiceItem{
			Codigo: detalle.Nivel.Codigo, ClaveSAT: claveSAT,
			Descripcion: detalle.Nivel.Producto.Descripcion, Unidad: detalle.Nivel.Empaque.NombreEmpaque,
			Cantidad: satNumber(linea.Quantity), PrecioUnitario: satNumber(linea.UnitValue),
			Descuento: satNumber(linea.Discount), Impuestos: satNumber(linea.TaxAmount), Importe: satNumber(linea.Amount),
		})
	}

	fechaEmisionText, err := fechaFacturacion(pedido.Fecha)
	if err != nil {
		return nil, err
	}
	fechaEmision, err := time.Parse(time.RFC3339, fechaEmisionText)
	if err != nil {
		return nil, fmt.Errorf("fecha de emisión inválida para regenerar el PDF: %w", err)
	}
	empresa := pedido.SucursalOrigen.Empresa
	receptor := factura.Receptor
	serie := factura.Serie
	if strings.TrimSpace(serie) == "" {
		serie = pedido.SucursalOrigen.SerieCFDI
	}
	if strings.TrimSpace(serie) == "" {
		serie = "A"
	}
	folioFactura := factura.Folio
	if folioFactura <= 0 {
		folioFactura = pedido.Folio
	}
	reporte := reportmodels.Invoice{
		Serie: serie, Folio: fmt.Sprintf("%06d", folioFactura), UUID: factura.UUID,
		FechaEmision: fechaEmision, FechaTimbrado: factura.FechaFactura,
		NombreComercial: empresa.NombreComercial, Emisor: empresa.RazonSocial, RFCEmisor: empresa.RFC,
		RegimenEmisor:   empresa.RegimenFiscal.Clave + " - " + empresa.RegimenFiscal.Descripcion,
		LugarExpedicion: pedido.SucursalOrigen.CodigoPostal, Sucursal: pedido.SucursalOrigen.NombreSucursal,
		Direccion: joinAddress(pedido.SucursalOrigen.Calle, pedido.SucursalOrigen.Exterior, pedido.SucursalOrigen.Interior, pedido.SucursalOrigen.Colonia, pedido.SucursalOrigen.Ciudad, pedido.SucursalOrigen.Estado, "C.P. "+pedido.SucursalOrigen.CodigoPostal),
		Telefono:  pedido.SucursalOrigen.Telefono, Correo: pedido.SucursalOrigen.Correo,
		Receptor: receptor.RazonSocial, RFCReceptor: receptor.RFC,
		RegimenReceptor:   receptor.Regimen.Clave + " - " + receptor.Regimen.Descripcion,
		DomicilioReceptor: receptor.CodigoPostal,
		UsoCFDI:           factura.UsoCFDI.Clave + " - " + factura.UsoCFDI.Descripcion,
		MetodoPago:        factura.MetodoPago.Clave + " - " + factura.MetodoPago.Descripcion,
		FormaPago:         factura.FormaPago.Clave + " - " + factura.FormaPago.Descripcion,
		CertificadoEmisor: factura.NumeroCertificadoEmisor, CertificadoSAT: factura.NumeroCertificadoSAT,
		SelloEmisor: factura.SelloEmisor, SelloSAT: factura.SelloSAT, CadenaOriginalSAT: factura.CadenaOriginalSAT,
		Items: items, Subtotal: factura.Subtotal.InexactFloat64(), Descuento: factura.Descuento.InexactFloat64(),
		Impuestos: factura.Impuestos.InexactFloat64(), Total: factura.Total.InexactFloat64(),
	}
	pdfBytes, err := renders.RenderInvoicePDF(reporte)
	if err != nil {
		return nil, fmt.Errorf("no se pudo regenerar el PDF fiscal: %w", err)
	}
	if strings.TrimSpace(factura.ArchivoXML) == "" {
		return nil, fmt.Errorf("no se puede regenerar el PDF porque la factura no tiene una ruta XML registrada")
	}
	pdfPath, err := saveInvoicePDF(factura.ArchivoXML, pdfBytes)
	if err != nil {
		return nil, err
	}
	if err = s.db.Model(&models.Factura{}).Where("id = ?", factura.ID).Update("archivo_pdf", pdfPath).Error; err != nil {
		return nil, fmt.Errorf("el PDF fue regenerado, pero no se pudo actualizar su ruta: %w", err)
	}
	return &dto.FacturacionResultadoDto{
		Success: true, UUID: factura.UUID,
		PDFBase64: base64.StdEncoding.EncodeToString(pdfBytes), PDFFileName: filepath.Base(pdfPath),
		Data: map[string]any{
			"archivoPDF": pdfPath, "archivoXML": factura.ArchivoXML,
			"correoReceptor": factura.Receptor.Correo, "estatus": factura.Estatus,
			"regenerado": true,
		},
	}, nil
}
