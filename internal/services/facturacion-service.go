package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository"
	"BitComercio/internal/repository/dto"
	reportmodels "BitComercio/internal/usecases/reports/models"
	"BitComercio/internal/usecases/reports/renders"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type FacturacionService struct {
	db             *gorm.DB
	client         *http.Client
	folioMu        sync.Mutex
	tokenMu        sync.Mutex
	accessToken    string
	tokenExpiresAt time.Time
	tokenAPIHost   string
	tokenClientID  string
}

const estatusVentaCanceladaGuid = "86968037-975a-43ce-880c-043003010103"

func pedidoCancelado(pedido *models.Pedido) bool {
	return pedido.Estatus.Guid.String() == estatusVentaCanceladaGuid ||
		strings.EqualFold(strings.TrimSpace(pedido.Estatus.Nombre), "Cancelado") ||
		strings.EqualFold(strings.TrimSpace(pedido.Estatus.Nombre), "Cancelada")
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

type cfdiCancellationResponse struct {
	Success     bool   `json:"success"`
	Mensaje     string `json:"mensaje"`
	HTTPCode    int    `json:"httpCode"`
	AcuseBase64 string `json:"acuseBase64"`
	Data        struct {
		AcuseBase64 string `json:"acuseBase64"`
	} `json:"data"`
}

type cancellationReceiptXML struct {
	Fecha     string `xml:"Fecha,attr"`
	RFCEmisor string `xml:"RfcEmisor,attr"`
	Folios    struct {
		UUID        string `xml:"UUID"`
		EstatusUUID string `xml:"EstatusUUID"`
	} `xml:"Folios"`
	Signature struct {
		SignatureValue string `xml:"SignatureValue"`
		SignedInfo     struct {
			Reference struct {
				DigestValue string `xml:"DigestValue"`
			} `xml:"Reference"`
		} `xml:"SignedInfo"`
		KeyInfo struct {
			KeyName string `xml:"KeyName"`
		} `xml:"KeyInfo"`
	} `xml:"Signature"`
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

func saveCancellationXML(folder, serie string, folio int, invoiceUUID, encoded string) (string, []byte, error) {
	folder = strings.TrimSpace(folder)
	if folder == "" {
		return "", nil, fmt.Errorf("configura la Carpeta de facturas en Configuración > Facturación")
	}
	absoluteFolder, err := filepath.Abs(folder)
	if err != nil {
		return "", nil, fmt.Errorf("ruta de facturas inválida: %w", err)
	}
	xmlBytes, err := base64.StdEncoding.DecodeString(strings.TrimSpace(encoded))
	if err != nil || len(xmlBytes) == 0 {
		return "", nil, fmt.Errorf("el servicio devolvió un acuse XML Base64 inválido")
	}
	if err = os.MkdirAll(absoluteFolder, 0755); err != nil {
		return "", nil, fmt.Errorf("no se pudo preparar la carpeta de facturas: %w", err)
	}
	fileName := fmt.Sprintf("CFDICancel_%s_%06d_%s.xml", invoiceFilePartPattern.ReplaceAllString(serie, "_"), folio, invoiceFilePartPattern.ReplaceAllString(invoiceUUID, "_"))
	path := filepath.Join(absoluteFolder, fileName)
	if err = os.WriteFile(path, xmlBytes, 0644); err != nil {
		return "", nil, fmt.Errorf("no se pudo guardar el XML del acuse: %w", err)
	}
	return path, xmlBytes, nil
}

func cancellationReceiptFromXML(contents []byte) (reportmodels.CancellationReceipt, error) {
	var parsed cancellationReceiptXML
	if err := xml.Unmarshal(contents, &parsed); err != nil {
		return reportmodels.CancellationReceipt{}, fmt.Errorf("el acuse de cancelación no contiene un XML válido: %w", err)
	}
	date, err := parseStampDate(parsed.Fecha)
	if err != nil {
		return reportmodels.CancellationReceipt{}, fmt.Errorf("el acuse contiene una fecha inválida: %w", err)
	}
	return reportmodels.CancellationReceipt{
		Fecha: date, RFCEmisor: parsed.RFCEmisor, UUID: parsed.Folios.UUID,
		EstatusUUID: parsed.Folios.EstatusUUID, CertificadoSAT: parsed.Signature.KeyInfo.KeyName,
		DigestValue:    parsed.Signature.SignedInfo.Reference.DigestValue,
		SignatureValue: parsed.Signature.SignatureValue,
	}, nil
}

func joinAddress(parts ...string) string {
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		if value := cleanDocumentText(part); value != "" {
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

func (s *FacturacionService) facturacionToken(cfg *KommerzConfig) (string, error) {
	s.tokenMu.Lock()
	defer s.tokenMu.Unlock()

	apiHost := strings.TrimRight(strings.TrimSpace(cfg.FacturacionAPIHost), "/")
	clientID := strings.TrimSpace(cfg.FacturacionClientID)
	if s.accessToken != "" && s.tokenAPIHost == apiHost && s.tokenClientID == clientID && time.Now().Add(time.Minute).Before(s.tokenExpiresAt) {
		return s.accessToken, nil
	}

	form := url.Values{"grant_type": {"client_credentials"}, "scope": {"cfdi.emit"}}
	tokenReq, err := http.NewRequest(http.MethodPost, apiHost+"/oauth/token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("no se pudo preparar la autenticación de facturación: %w", err)
	}
	tokenReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	tokenReq.SetBasicAuth(cfg.FacturacionClientID, cfg.FacturacionClientSecret)

	tokenResp, err := s.client.Do(tokenReq)
	if err != nil {
		return "", fmt.Errorf("no se pudo autenticar con facturación: %w", err)
	}
	defer tokenResp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(tokenResp.Body, 2<<20))
	if err != nil {
		return "", fmt.Errorf("no se pudo leer la autenticación de facturación: %w", err)
	}
	if tokenResp.StatusCode < 200 || tokenResp.StatusCode >= 300 {
		return "", fmt.Errorf("autenticación de facturación respondió %d: %s", tokenResp.StatusCode, string(body))
	}

	var token struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &token); err != nil || strings.TrimSpace(token.AccessToken) == "" {
		return "", fmt.Errorf("la autenticación no devolvió un access_token válido")
	}
	if token.ExpiresIn <= 0 {
		return "", fmt.Errorf("la autenticación no devolvió una vigencia válida para el token")
	}

	s.accessToken = token.AccessToken
	s.tokenExpiresAt = time.Now().Add(time.Duration(token.ExpiresIn) * time.Second)
	s.tokenAPIHost = apiHost
	s.tokenClientID = clientID
	return s.accessToken, nil
}

func catalogo(id uint, guid, clave, descripcion string) dto.FacturacionCatalogoDto {
	return dto.FacturacionCatalogoDto{ID: id, Guid: guid, Clave: clave, Descripcion: descripcion}
}

func (s *FacturacionService) PrepararFactura(pedidoGuid string) (*dto.FacturacionPreparacionDto, error) {
	var pedido models.Pedido
	err := s.db.Preload("Cliente").Preload("Estatus").Preload("SucursalOrigen.Empresa.RegimenFiscal").
		Where("pedidos.guid = ?", pedidoGuid).First(&pedido).Error
	if err != nil {
		return nil, fmt.Errorf("no se encontró la venta: %w", err)
	}
	if pedidoCancelado(&pedido) {
		return nil, fmt.Errorf("la venta está cancelada y no puede ser facturada")
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
	if err = s.db.Preload("Estatus").Preload("SucursalOrigen.Empresa.RegimenFiscal").Where("guid = ?", req.PedidoGuid).First(&pedido).Error; err != nil {
		return nil, err
	}
	if pedidoCancelado(&pedido) {
		return nil, fmt.Errorf("la venta está cancelada y no puede ser facturada")
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
	if err = s.db.Preload("Nivel.Producto.SatProducto").Preload("Nivel.Empaque.UnidadSat").Where("pedido_id = ?", pedido.ID).Find(&detalles).Error; err != nil {
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
		if d.Nivel.Empaque.UnidadSat == nil || strings.TrimSpace(d.Nivel.Empaque.UnidadSat.Clave) == "" {
			return nil, fmt.Errorf("el empaque %s del artículo %s no tiene una unidad SAT relacionada", d.Nivel.Empaque.NombreEmpaque, d.Nivel.Codigo)
		}
		claveUnidad := strings.ToUpper(strings.TrimSpace(d.Nivel.Empaque.UnidadSat.Clave))
		conceptos = append(conceptos, map[string]any{"claveProdServ": claveProd, "noIdentificacion": d.Nivel.Codigo, "descripcion": d.Nivel.Producto.Descripcion, "cantidad": satNumber(calc.Quantity), "claveUnidad": claveUnidad, "unidad": d.Nivel.Empaque.NombreEmpaque, "valorUnitario": satNumber(calc.UnitValue), "importe": satNumber(calc.Amount), "objetoImp": obj, "descuento": satNumber(calc.Discount), "impuestos": []map[string]any{{"importeImpuesto": satNumber(calc.TaxAmount), "baseImpuesto": satNumber(calc.TaxBase), "impuesto": "002", "tasaOCuota": calc.TaxRate.StringFixed(6)}}})
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
	folioReservado := false
	if pedido.FacturaID != nil {
		var existente models.Factura
		if err = s.db.Select("serie", "folio").First(&existente, *pedido.FacturaID).Error; err != nil {
			return nil, fmt.Errorf("no se pudo recuperar el folio interno de la factura: %w", err)
		}
		facturaSerie = existente.Serie
		facturaFolio = existente.Folio
	}
	if facturaFolio <= 0 {
		// nextval() no es transaccional en PostgreSQL: aun cuando el PAC rechaza
		// el CFDI, el número queda consumido. Serializamos las emisiones, leemos
		// el candidato sin avanzar la secuencia y solo lo confirmamos después de
		// recibir un timbrado satisfactorio.
		s.folioMu.Lock()
		folioReservado = true
		defer s.folioMu.Unlock()
		var sequenceState struct {
			LastValue int  `gorm:"column:last_value"`
			IsCalled  bool `gorm:"column:is_called"`
		}
		if err = s.db.Raw("SELECT last_value, is_called FROM consecutivo_folio_factura").Scan(&sequenceState).Error; err != nil {
			return nil, fmt.Errorf("no se pudo generar el folio interno de la factura: %w", err)
		}
		facturaFolio = sequenceState.LastValue
		if sequenceState.IsCalled {
			facturaFolio++
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
	accessToken, err := s.facturacionToken(cfg)
	if err != nil {
		return nil, err
	}
	data, _ := json.Marshal(payload)
	apiReq, _ := http.NewRequest(http.MethodPost, strings.TrimRight(cfg.FacturacionAPIHost, "/")+"/api/facturacion/emitir-cfdi?esGlobal=false", bytes.NewReader(data))
	apiReq.Header.Set("Content-Type", "application/json")
	apiReq.Header.Set("Authorization", "Bearer "+accessToken)
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
	if folioReservado {
		if err = s.db.Exec("SELECT setval('consecutivo_folio_factura', ?, true)", facturaFolio).Error; err != nil {
			return nil, fmt.Errorf("el CFDI fue timbrado, pero no se pudo confirmar el folio interno %06d: %w", facturaFolio, err)
		}
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

type globalInvoiceTicket struct {
	PedidoID uint
	Folio    int
	FormaID  uint
	Clave    string
	Total    decimal.Decimal
}

// GenerarFacturacionGlobal emite un CFDI por cada forma de pago soportada con
// un concepto por ticket no facturado de la jornada.
func (s *FacturacionService) GenerarFacturacionGlobal(operacionID uint) (*dto.ResponseDto, error) {
	var operacion models.OperacionSucursal
	if err := s.db.Preload("Sucursal.Empresa.RegimenFiscal").First(&operacion, operacionID).Error; err != nil {
		return nil, fmt.Errorf("jornada no encontrada: %w", err)
	}
	fechaFin := time.Now()
	if operacion.FechaFin != nil {
		fechaFin = *operacion.FechaFin
	}
	pendientes, err := s.transferenciasPendientesJornada(operacion)
	if err != nil {
		return nil, err
	}
	if pendientes > 0 {
		return nil, fmt.Errorf("no se puede cerrar la jornada: hay %d transferencia(s) pendiente(s) de respuesta", pendientes)
	}
	var tickets []globalInvoiceTicket
	if err := s.db.Raw(`
		WITH ventas AS (
			SELECT p.id pedido_id, p.folio,
			       COALESCE(SUM(
				   (pd.precio_venta * pd.cantidad) -
				   ((pd.precio_venta * pd.cantidad) * COALESCE(pd.descuento, 0) / 100)
			   ), 0) total
			FROM pedidos p
			JOIN pedido_detalle pd ON pd.pedido_id=p.id AND pd.deleted_at IS NULL
			JOIN tipos_pedido tp ON tp.id=p.tipo_pedido_id AND tp.deleted_at IS NULL
			JOIN estatus e ON e.id=p.estatus_id AND e.deleted_at IS NULL
			WHERE p.sucursal_origen_id=? AND p.fecha BETWEEN ? AND ?
			  AND tp.guid::text=? AND LOWER(e.nombre) IN ('completado', 'completada')
			  AND p.factura_id IS NULL AND p.deleted_at IS NULL
			GROUP BY p.id, p.folio
		), predominantes AS (
			SELECT pg.pedido_id, pg.forma_id,
			       ROW_NUMBER() OVER (PARTITION BY pg.pedido_id ORDER BY SUM(pg.monto) DESC, pg.forma_id) posicion
			FROM pagos pg JOIN ventas v ON v.pedido_id=pg.pedido_id
			WHERE pg.deleted_at IS NULL
			GROUP BY pg.pedido_id, pg.forma_id
		)
		SELECT v.pedido_id, v.folio, pr.forma_id, forma.clave, v.total
		FROM ventas v
		JOIN predominantes pr ON pr.pedido_id=v.pedido_id AND pr.posicion=1
		JOIN sat_formas_pago forma ON forma.id=pr.forma_id AND forma.deleted_at IS NULL
		WHERE forma.clave IN ('01', '03', '04', '28')
		ORDER BY forma.clave, v.folio
	`, operacion.SucursalID, operacion.FechaInicio, fechaFin, models.TipoPedidoVentaGuid).Scan(&tickets).Error; err != nil {
		return nil, fmt.Errorf("no se pudieron preparar las ventas para facturación global: %w", err)
	}

	porForma := make(map[string][]globalInvoiceTicket)
	for _, ticket := range tickets {
		porForma[ticket.Clave] = append(porForma[ticket.Clave], ticket)
	}
	porcentajeEfectivo := operacion.Sucursal.ComisionVentas
	if porcentajeEfectivo.IsNegative() || porcentajeEfectivo.GreaterThan(decimal.NewFromInt(100)) {
		return nil, fmt.Errorf("ComisionVentas debe encontrarse entre 0 y 100")
	}

	var cfg *KommerzConfig
	var accessToken string
	if len(porForma) > 0 {
		cfg, err = LoadKommerzConfig()
		if err != nil {
			return nil, err
		}
		if cfg.FacturacionAPIHost == "" || cfg.FacturacionClientID == "" || cfg.FacturacionClientSecret == "" {
			return nil, fmt.Errorf("configura Api Host, Client ID y Client Secret en Configuración > Facturación")
		}
		if strings.TrimSpace(cfg.FacturacionXMLPath) == "" {
			return nil, fmt.Errorf("configura la Carpeta de facturas en Configuración > Facturación")
		}
		accessToken, err = s.facturacionToken(cfg)
		if err != nil {
			return nil, err
		}
	}

	resultados, err := s.documentosFacturasGlobales(operacion)
	if err != nil {
		return nil, err
	}
	for _, clave := range []string{"01", "04", "28", "03"} {
		if facturaGlobalID(operacion, clave) != 0 {
			continue
		}
		grupo := porForma[clave]
		if len(grupo) == 0 {
			continue
		}
		if clave == "01" {
			for index := range grupo {
				grupo[index].Total = grupo[index].Total.Mul(porcentajeEfectivo).Div(decimal.NewFromInt(100))
			}
		}
		resultado, emitErr := s.emitirFacturaGlobal(cfg, accessToken, operacion, clave, grupo)
		if emitErr != nil {
			return nil, emitErr
		}
		resultados = append(resultados, resultado)
	}
	reportes, err := s.generarReportesJornada(operacion, fechaFin)
	if err != nil {
		return nil, err
	}
	resultados = append(resultados, reportes...)
	return dto.NewResponseDto(true, "Facturación global generada correctamente", resultados, nil), nil
}

// ObtenerFacturasGlobalesOperacion recupera los PDF ya ligados a la jornada.
// Permite reabrirlos antes de reintentar un cierre interrumpido.
func (s *FacturacionService) ObtenerFacturasGlobalesOperacion(operacionID uint) (*dto.ResponseDto, error) {
	var operacion models.OperacionSucursal
	if err := s.db.First(&operacion, operacionID).Error; err != nil {
		return nil, fmt.Errorf("jornada no encontrada: %w", err)
	}
	documentos, err := s.documentosFacturasGlobales(operacion)
	if err != nil {
		return nil, err
	}
	return dto.NewResponseDto(true, "Facturas globales ligadas a la jornada", documentos, nil), nil
}

func facturaGlobalID(operacion models.OperacionSucursal, claveForma string) uint {
	switch claveForma {
	case "01":
		return operacion.FacturaEfectivoId
	case "04":
		return operacion.FacturaCreditoId
	case "28":
		return operacion.FacturaDebitoId
	case "03":
		return operacion.FacturaTransferenciaId
	default:
		return 0
	}
}

func facturaGlobalColumn(claveForma string) (string, error) {
	switch claveForma {
	case "01":
		return "factura_efectivo_id", nil
	case "04":
		return "factura_credito_id", nil
	case "28":
		return "factura_debito_id", nil
	case "03":
		return "factura_transferencia_id", nil
	default:
		return "", fmt.Errorf("forma de pago global no soportada: %s", claveForma)
	}
}

func (s *FacturacionService) documentosFacturasGlobales(operacion models.OperacionSucursal) ([]map[string]any, error) {
	documentos := make([]map[string]any, 0, 4)
	for _, clave := range []string{"01", "04", "28", "03"} {
		facturaID := facturaGlobalID(operacion, clave)
		if facturaID == 0 {
			continue
		}
		var factura models.Factura
		if err := s.db.Where("id = ? AND deleted_at IS NULL", facturaID).First(&factura).Error; err != nil {
			return nil, fmt.Errorf("no se encontró la factura global %s ligada a la jornada: %w", clave, err)
		}
		pdfBytes, err := os.ReadFile(strings.TrimSpace(factura.ArchivoPDF))
		if err != nil || len(pdfBytes) == 0 {
			return nil, fmt.Errorf("no se pudo leer el PDF de la factura global %s: %w", clave, err)
		}
		documentos = append(documentos, map[string]any{
			"claveFormaPago": clave, "facturaId": factura.ID, "uuid": factura.UUID,
			"total": satNumber(factura.Total), "archivoXML": factura.ArchivoXML, "archivoPDF": factura.ArchivoPDF,
			"pdfBase64": base64.StdEncoding.EncodeToString(pdfBytes), "pdfFileName": filepath.Base(factura.ArchivoPDF),
		})
	}
	return documentos, nil
}

func (s *FacturacionService) transferenciasPendientesJornada(operacion models.OperacionSucursal) (int64, error) {
	var total int64
	err := s.db.Raw(`
		SELECT COUNT(*)
		FROM traspasos t
		JOIN estatus e ON e.id = t.estatus_id AND e.deleted_at IS NULL
		WHERE (t.sucursal_origen_id = ? OR t.sucursal_destino_id = ?)
		  AND e.guid::text = ?
		  AND t.deleted_at IS NULL
	`, operacion.SucursalID, operacion.SucursalID,
		"86968037-975a-43ce-880c-043003010104").Scan(&total).Error
	if err != nil {
		return 0, fmt.Errorf("no se pudo validar el estado de las transferencias: %w", err)
	}
	return total, nil
}

func (s *FacturacionService) generarReportesJornada(operacion models.OperacionSucursal, fechaFin time.Time) ([]map[string]any, error) {
	header := reportmodels.ClosingReportHeader{
		Negocio: operacion.Sucursal.Empresa.NombreComercial, RazonSocial: operacion.Sucursal.Empresa.RazonSocial,
		RFC: operacion.Sucursal.Empresa.RFC, Sucursal: operacion.Sucursal.NombreSucursal,
		FechaInicio: operacion.FechaInicio, FechaFin: fechaFin,
	}
	var descuentos reportmodels.DiscountReport
	descuentos.Header = header
	if err := s.db.Raw(`
		SELECT LPAD(p.folio::text, 7, '0') folio, p.fecha,
		       COALESCE(c.razon_social, 'PÚBLICO EN GENERAL') cliente,
		       SUM(pd.precio_venta * pd.cantidad)::double precision total_bruto,
		       SUM((pd.precio_venta * pd.cantidad) * COALESCE(pd.descuento, 0) / 100)::double precision descuento,
		       SUM((pd.precio_venta * pd.cantidad) - ((pd.precio_venta * pd.cantidad) * COALESCE(pd.descuento, 0) / 100))::double precision total_neto
		FROM pedidos p
		JOIN pedido_detalle pd ON pd.pedido_id = p.id AND pd.deleted_at IS NULL
		JOIN tipos_pedido tp ON tp.id = p.tipo_pedido_id AND tp.guid::text = ? AND tp.deleted_at IS NULL
		JOIN estatus e ON e.id = p.estatus_id AND LOWER(e.nombre) IN ('completado', 'completada') AND e.deleted_at IS NULL
		LEFT JOIN clientes c ON c.id = p.cliente_id AND c.deleted_at IS NULL
		WHERE p.sucursal_origen_id = ? AND p.fecha BETWEEN ? AND ? AND p.deleted_at IS NULL
		GROUP BY p.id, p.folio, p.fecha, c.razon_social
		HAVING SUM((pd.precio_venta * pd.cantidad) * COALESCE(pd.descuento, 0) / 100) > 0
		ORDER BY p.fecha, p.folio
	`, models.TipoPedidoVentaGuid, operacion.SucursalID, operacion.FechaInicio, fechaFin).Scan(&descuentos.Rows).Error; err != nil {
		return nil, fmt.Errorf("no se pudo preparar el reporte de descuentos: %w", err)
	}
	for _, row := range descuentos.Rows {
		descuentos.TotalBruto += row.TotalBruto
		descuentos.Descuento += row.Descuento
		descuentos.TotalNeto += row.TotalNeto
	}

	resultados := make([]map[string]any, 0, 3)
	if len(descuentos.Rows) > 0 {
		pdf, err := renders.RenderDiscountReportPDF(descuentos)
		if err != nil {
			return nil, fmt.Errorf("no se pudo generar el reporte de descuentos: %w", err)
		}
		resultados = append(resultados, map[string]any{"documentKey": "descuentos", "pdfBase64": base64.StdEncoding.EncodeToString(pdf), "pdfFileName": "reporte-descuentos.pdf"})
	}

	type direction struct{ key, label, condition string }
	for _, item := range []direction{
		{key: "transferenciasEntrada", label: "entrada", condition: "t.sucursal_destino_id = ?"},
		{key: "transferenciasSalida", label: "salida", condition: "t.sucursal_origen_id = ?"},
	} {
		reporte := reportmodels.TransferSummaryReport{Header: header, Direction: item.label}
		query := fmt.Sprintf(`
			SELECT LPAD(p.folio::text, 7, '0') folio, so.nombre_sucursal sucursal_origen,
			       sd.nombre_sucursal sucursal_destino, t.fecha_envio, t.fecha_recepcion,
			       SUM(pd.precio_venta * pd.cantidad)::double precision valor_total
			FROM traspasos t
			JOIN pedidos p ON p.id = t.pedido_id AND p.deleted_at IS NULL
			JOIN pedido_detalle pd ON pd.pedido_id = p.id AND pd.deleted_at IS NULL
			JOIN sucursales so ON so.id = t.sucursal_origen_id
			JOIN sucursales sd ON sd.id = t.sucursal_destino_id
			JOIN estatus e ON e.id = t.estatus_id AND e.guid::text = ? AND e.deleted_at IS NULL
			WHERE %s AND COALESCE(t.fecha_recepcion, t.fecha_envio) BETWEEN ? AND ? AND t.deleted_at IS NULL
			GROUP BY t.id, p.folio, so.nombre_sucursal, sd.nombre_sucursal, t.fecha_envio, t.fecha_recepcion
			ORDER BY t.fecha_envio, p.folio
		`, item.condition)
		if err := s.db.Raw(query, "86968037-975a-43ce-880c-043003010105", operacion.SucursalID, operacion.FechaInicio, fechaFin).Scan(&reporte.Rows).Error; err != nil {
			return nil, fmt.Errorf("no se pudo preparar el reporte de transferencias de %s: %w", item.label, err)
		}
		for _, row := range reporte.Rows {
			reporte.ValorTotal += row.ValorTotal
		}
		if len(reporte.Rows) == 0 {
			continue
		}
		pdf, err := renders.RenderTransferSummaryPDF(reporte)
		if err != nil {
			return nil, fmt.Errorf("no se pudo generar el reporte de transferencias de %s: %w", item.label, err)
		}
		resultados = append(resultados, map[string]any{"documentKey": item.key, "pdfBase64": base64.StdEncoding.EncodeToString(pdf), "pdfFileName": "reporte-" + item.key + ".pdf"})
	}

	financiero, err := s.prepararReporteFinanciero(operacion, fechaFin, header)
	if err != nil {
		return nil, err
	}
	pdfFinanciero, err := renders.RenderFinancialClosingPDF(financiero)
	if err != nil {
		return nil, fmt.Errorf("no se pudo generar el resumen financiero: %w", err)
	}
	resultados = append(resultados, map[string]any{
		"documentKey": "resumenFinanciero", "pdfBase64": base64.StdEncoding.EncodeToString(pdfFinanciero),
		"pdfFileName": "resumen-financiero.pdf",
	})
	return resultados, nil
}

func (s *FacturacionService) prepararReporteFinanciero(operacion models.OperacionSucursal, fechaFin time.Time, header reportmodels.ClosingReportHeader) (reportmodels.FinancialClosingReport, error) {
	acum := repository.NewOperacionesSucursalRepository(s.db).CalcularAcumuladosDia(operacion)
	reporte := reportmodels.FinancialClosingReport{Header: header}
	reporte.VentasInventario = []reportmodels.FinancialMetric{
		{Label: "Valor inventario inicial", Value: satNumber(operacion.ValorInicialInventario)},
		{Label: "Ventas a crédito", Value: satNumber(operacion.Creditos)},
		{Label: "Valor de las compras", Value: satNumber(acum.ValorCompras)},
		{Label: "Transferencias entrantes", Value: satNumber(acum.TransferenciasEntrantes)},
		{Label: "Valor bruto de las ventas", Value: satNumber(acum.ValorBrutoVentas)},
		{Label: "Transferencias de salida", Value: satNumber(acum.TransferenciasSalientes)},
		{Label: "Descuentos aplicados", Value: satNumber(acum.DescuentosAplicados)},
		{Label: "Bajas de mercancía", Value: satNumber(acum.BajasMercancia)},
		{Label: "Valor real de las ventas", Value: satNumber(acum.ValorVentas)},
		{Label: "Ajuste de inventario", Value: satNumber(acum.AjusteInventario)},
		{Label: "Valor final inventario", Value: satNumber(acum.ValorFinalInventario)},
	}
	reporte.Ingresos = []reportmodels.FinancialMetric{
		{Label: "Efectivo", Value: satNumber(acum.IngresoEfectivo)},
		{Label: "Tarjetas", Value: satNumber(acum.IngresoTarjetas)},
		{Label: "Cheques", Value: satNumber(acum.IngresoCheques)},
		{Label: "Transferencia", Value: satNumber(acum.IngresoTransferencia)},
		{Label: "Otros", Value: satNumber(acum.IngresoOtros)},
		{Label: "Total ingresos", Value: satNumber(acum.IngresoEfectivo.Add(acum.IngresoTarjetas).Add(acum.IngresoCheques).Add(acum.IngresoTransferencia).Add(acum.IngresoOtros))},
	}
	reporte.CFDI = []reportmodels.FinancialMetric{
		{Label: "Efectivo", Value: satNumber(acum.CFDIEfectivo)},
		{Label: "Tarjetas", Value: satNumber(acum.CFDITarjetas)},
		{Label: "Cheques", Value: satNumber(acum.CFDICheques)},
		{Label: "Transferencia", Value: satNumber(acum.CFDITransferencia)},
		{Label: "Otros", Value: satNumber(acum.CFDIOtros)},
		{Label: "Total facturado", Value: satNumber(acum.CFDIEfectivo.Add(acum.CFDITarjetas).Add(acum.CFDICheques).Add(acum.CFDITransferencia).Add(acum.CFDIOtros))},
	}

	if err := s.db.Raw(`
		SELECT LPAD(p.folio::text, 7, '0') folio, COALESCE(c.razon_social, 'PÚBLICO EN GENERAL') cliente,
		       p.fecha, SUM((pd.precio_venta * pd.cantidad) - ((pd.precio_venta * pd.cantidad) * COALESCE(pd.descuento, 0) / 100))::double precision total
		FROM pedidos p
		JOIN pedido_detalle pd ON pd.pedido_id = p.id AND pd.deleted_at IS NULL
		JOIN tipos_pedido tp ON tp.id = p.tipo_pedido_id AND tp.guid::text = ? AND tp.deleted_at IS NULL
		JOIN estatus e ON e.id = p.estatus_id AND LOWER(e.nombre) IN ('completado', 'completada') AND e.deleted_at IS NULL
		LEFT JOIN clientes c ON c.id = p.cliente_id AND c.deleted_at IS NULL
		WHERE p.sucursal_origen_id = ? AND p.fecha BETWEEN ? AND ? AND p.deleted_at IS NULL
		GROUP BY p.id, p.folio, p.fecha, c.razon_social ORDER BY p.fecha, p.folio
	`, models.TipoPedidoVentaGuid, operacion.SucursalID, operacion.FechaInicio, fechaFin).Scan(&reporte.Ventas).Error; err != nil {
		return reporte, fmt.Errorf("no se pudo preparar el detalle de ventas: %w", err)
	}
	for _, row := range reporte.Ventas {
		reporte.TotalVentas += row.Total
	}

	if err := s.db.Raw(`
		SELECT LPAD(p.folio::text, 7, '0') folio, COALESCE(ef.razon_social, 'PROVEEDOR NO DISPONIBLE') proveedor,
		       p.fecha, CASE WHEN UPPER(co.origen_captura) = 'XML' THEN 'XML' ELSE 'Manual' END origen_captura,
		       SUM(pd.precio_venta * pd.cantidad)::double precision total
		FROM compras co
		JOIN pedidos p ON p.id = co.pedido_id AND p.deleted_at IS NULL
		JOIN pedido_detalle pd ON pd.pedido_id = p.id AND pd.deleted_at IS NULL
		LEFT JOIN entidades_fiscales ef ON ef.id = co.proveedor_id AND ef.deleted_at IS NULL
		WHERE p.sucursal_origen_id = ? AND p.fecha BETWEEN ? AND ? AND co.deleted_at IS NULL
		GROUP BY p.id, p.folio, p.fecha, ef.razon_social, co.origen_captura ORDER BY p.fecha, p.folio
	`, operacion.SucursalID, operacion.FechaInicio, fechaFin).Scan(&reporte.Compras).Error; err != nil {
		return reporte, fmt.Errorf("no se pudo preparar el detalle de compras: %w", err)
	}
	for _, row := range reporte.Compras {
		reporte.TotalCompras += row.Total
	}

	if err := s.db.Raw(`
		SELECT CONCAT(f.serie, '-', LPAD(f.folio::text, 6, '0')) folio_cfdi,
		       CASE WHEN f.es_global THEN 'Factura Global'
		            ELSE STRING_AGG(DISTINCT LPAD(p.folio::text, 7, '0'), ', ' ORDER BY LPAD(p.folio::text, 7, '0')) END folios_venta,
		       COALESCE(ef.razon_social, CASE WHEN f.es_global THEN 'PÚBLICO EN GENERAL' ELSE 'RECEPTOR NO DISPONIBLE' END) receptor,
		       f.fecha_factura fecha, f.estatus, f.total::double precision total, f.es_global
		FROM facturas f
		JOIN pedidos p ON p.factura_id = f.id AND p.deleted_at IS NULL
		LEFT JOIN entidades_fiscales ef ON ef.id = f.receptor_id AND ef.deleted_at IS NULL
		WHERE p.sucursal_origen_id = ? AND p.fecha BETWEEN ? AND ? AND f.deleted_at IS NULL
		GROUP BY f.id, f.serie, f.folio, ef.razon_social, f.es_global, f.fecha_factura, f.estatus, f.total
		ORDER BY f.fecha_factura, f.folio
	`, operacion.SucursalID, operacion.FechaInicio, fechaFin).Scan(&reporte.Facturas).Error; err != nil {
		return reporte, fmt.Errorf("no se pudo preparar el detalle de facturas: %w", err)
	}
	for _, row := range reporte.Facturas {
		reporte.TotalFacturas += row.Total
	}
	return reporte, nil
}

func (s *FacturacionService) emitirFacturaGlobal(cfg *KommerzConfig, accessToken string, operacion models.OperacionSucursal, claveForma string, tickets []globalInvoiceTicket) (map[string]any, error) {
	var forma models.SATFormaPago
	if err := s.db.Where("clave = ? AND deleted_at IS NULL", claveForma).First(&forma).Error; err != nil {
		return nil, fmt.Errorf("forma de pago SAT %s no encontrada", claveForma)
	}
	var metodo models.SATMetodoPago
	if err := s.db.Where("clave = ? AND deleted_at IS NULL", "PUE").First(&metodo).Error; err != nil {
		return nil, fmt.Errorf("método de pago PUE no encontrado")
	}
	var uso models.SATUsoCFDI
	if err := s.db.Where("clave = ? AND deleted_at IS NULL", "S01").First(&uso).Error; err != nil {
		return nil, fmt.Errorf("uso CFDI S01 no encontrado")
	}

	conceptos := make([]map[string]any, 0, len(tickets))
	items := make([]reportmodels.InvoiceItem, 0, len(tickets))
	pedidoIDs := make([]uint, 0, len(tickets))
	subtotal, impuestos := decimal.Zero, decimal.Zero
	for _, ticket := range tickets {
		base := ticket.Total.Div(decimal.NewFromFloat(1.16)).Round(6)
		iva := ticket.Total.Sub(base).Round(6)
		subtotal = subtotal.Add(base)
		impuestos = impuestos.Add(iva)
		identificacion := fmt.Sprintf("%07d", ticket.Folio)
		conceptos = append(conceptos, map[string]any{
			"claveProdServ": "01010101", "noIdentificacion": identificacion,
			"descripcion": "VENTA", "cantidad": 1, "claveUnidad": "H87", "unidad": "PIEZA",
			"valorUnitario": satNumber(base), "importe": satNumber(base), "objetoImp": "02",
			"impuestos": []map[string]any{{"importeImpuesto": satNumber(iva), "baseImpuesto": satNumber(base), "impuesto": "002", "tasaOCuota": "0.160000"}},
		})
		items = append(items, reportmodels.InvoiceItem{Codigo: identificacion, ClaveSAT: "01010101", Descripcion: "VENTA", Unidad: "PIEZA", Cantidad: 1, PrecioUnitario: satNumber(base), Impuestos: satNumber(iva), Importe: satNumber(base)})
		pedidoIDs = append(pedidoIDs, ticket.PedidoID)
	}
	total := subtotal.Add(impuestos)
	now := time.Now()
	fechaCFDI, err := fechaFacturacion(now)
	if err != nil {
		return nil, err
	}
	serie := strings.TrimSpace(operacion.Sucursal.SerieCFDI)
	if serie == "" {
		serie = "A"
	}

	s.folioMu.Lock()
	defer s.folioMu.Unlock()
	var sequence struct {
		LastValue int  `gorm:"column:last_value"`
		IsCalled  bool `gorm:"column:is_called"`
	}
	if err = s.db.Raw("SELECT last_value, is_called FROM consecutivo_folio_factura").Scan(&sequence).Error; err != nil {
		return nil, fmt.Errorf("no se pudo generar el folio de la factura global: %w", err)
	}
	folio := sequence.LastValue
	if sequence.IsCalled {
		folio++
	}
	empresa := operacion.Sucursal.Empresa
	payload := map[string]any{
		"serie": serie, "folioInterno": fmt.Sprintf("%06d", folio), "fecha": fechaCFDI,
		"cveMetodoPago": metodo.Clave, "metodoPago": metodo.Descripcion,
		"cveFormaPago": forma.Clave, "formaPago": forma.Descripcion,
		"subTotal": satNumber(subtotal), "descuentos": 0, "impuestos": satNumber(impuestos), "total": satNumber(total),
		"rfcEmisor": empresa.RFC, "emisor": empresa.RazonSocial,
		"cveRegimenEmisor": empresa.RegimenFiscal.Clave, "regimenEmisor": empresa.RegimenFiscal.Descripcion,
		"lugarExpedicion": operacion.Sucursal.CodigoPostal,
		"rfcReceptor":     "XAXX010101000", "receptor": "PUBLICO EN GENERAL",
		"cveRegimenReceptor": "616", "regimenReceptor": "Sin obligaciones fiscales",
		"domicilioFiscalReceptor": operacion.Sucursal.CodigoPostal,
		"cveUsoCFDI":              uso.Clave, "usoCFDI": uso.Descripcion,
		"conceptos": conceptos, "esGlobal": true,
		"Meses": fmt.Sprintf("%02d", int(now.Month())), "YYYY": fmt.Sprintf("%04d", now.Year()), "periodicidad": "01",
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	apiReq, err := http.NewRequest(http.MethodPost, strings.TrimRight(cfg.FacturacionAPIHost, "/")+"/api/facturacion/emitir-cfdi?esGlobal=true", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("no se pudo preparar la factura global: %w", err)
	}
	apiReq.Header.Set("Content-Type", "application/json")
	apiReq.Header.Set("Authorization", "Bearer "+accessToken)
	apiResp, err := s.client.Do(apiReq)
	if err != nil {
		return nil, fmt.Errorf("no se pudo emitir la factura global %s: %w", forma.Descripcion, err)
	}
	defer apiResp.Body.Close()
	apiBody, _ := io.ReadAll(io.LimitReader(apiResp.Body, 8<<20))
	if apiResp.StatusCode < 200 || apiResp.StatusCode >= 300 {
		return nil, fmt.Errorf("factura global %s respondió %d: %s", forma.Descripcion, apiResp.StatusCode, string(apiBody))
	}
	var stamped cfdiEmissionResponse
	if err = json.Unmarshal(apiBody, &stamped); err != nil || !stamped.Success {
		return nil, fmt.Errorf("no se pudo timbrar la factura global %s: %s", forma.Descripcion, stamped.Mensaje)
	}
	if stamped.Data.UUID == "" || stamped.Data.CFDIXMLBase64 == "" {
		return nil, fmt.Errorf("la factura global %s no devolvió UUID o XML", forma.Descripcion)
	}
	if err = s.db.Exec("SELECT setval('consecutivo_folio_factura', ?, true)", folio).Error; err != nil {
		return nil, fmt.Errorf("la factura global fue timbrada, pero no se confirmó el folio %06d: %w", folio, err)
	}
	stampDate, err := parseStampDate(stamped.Data.FechaTimbrado)
	if err != nil {
		return nil, err
	}
	xmlPath, err := saveStampedXML(cfg.FacturacionXMLPath, serie, folio, stamped.Data.UUID, stamped.Data.CFDIXMLBase64)
	if err != nil {
		return nil, err
	}
	emissionDate, _ := time.Parse(time.RFC3339, fechaCFDI)
	report := reportmodels.Invoice{
		Serie: serie, Folio: fmt.Sprintf("%06d", folio), UUID: stamped.Data.UUID,
		FechaEmision: emissionDate, FechaTimbrado: stampDate,
		NombreComercial: empresa.NombreComercial, Emisor: empresa.RazonSocial, RFCEmisor: empresa.RFC,
		RegimenEmisor:   empresa.RegimenFiscal.Clave + " - " + empresa.RegimenFiscal.Descripcion,
		LugarExpedicion: operacion.Sucursal.CodigoPostal, Sucursal: operacion.Sucursal.NombreSucursal,
		Direccion: joinAddress(operacion.Sucursal.Calle, operacion.Sucursal.Exterior, operacion.Sucursal.Interior, operacion.Sucursal.Colonia, operacion.Sucursal.Ciudad, operacion.Sucursal.Estado, "C.P. "+operacion.Sucursal.CodigoPostal),
		Telefono:  operacion.Sucursal.Telefono, Correo: operacion.Sucursal.Correo,
		Receptor: "PUBLICO EN GENERAL", RFCReceptor: "XAXX010101000",
		RegimenReceptor: "616 - Sin obligaciones fiscales", DomicilioReceptor: operacion.Sucursal.CodigoPostal,
		UsoCFDI: uso.Clave + " - " + uso.Descripcion, MetodoPago: metodo.Clave + " - " + metodo.Descripcion,
		FormaPago:         forma.Clave + " - " + forma.Descripcion,
		CertificadoEmisor: stamped.Data.NoCertificadoEmisor, CertificadoSAT: stamped.Data.NoCertificadoSAT,
		SelloEmisor: stamped.Data.SelloEmisor, SelloSAT: stamped.Data.SelloSAT, CadenaOriginalSAT: stamped.Data.CadenaOriginalSAT,
		Items: items, Subtotal: satNumber(subtotal), Impuestos: satNumber(impuestos), Total: satNumber(total),
	}
	pdfBytes, err := renders.RenderInvoicePDF(report)
	if err != nil {
		return nil, fmt.Errorf("factura global timbrada, pero no se pudo generar el PDF: %w", err)
	}
	pdfPath, err := saveInvoicePDF(xmlPath, pdfBytes)
	if err != nil {
		return nil, err
	}
	factura := models.Factura{
		Serie: serie, Folio: folio, UsoCFDIID: &uso.ID, MetodoPagoID: &metodo.ID, FormaPagoID: &forma.ID,
		UUID: stamped.Data.UUID, NumeroCertificadoEmisor: stamped.Data.NoCertificadoEmisor,
		NumeroCertificadoSAT: stamped.Data.NoCertificadoSAT, SelloEmisor: stamped.Data.SelloEmisor,
		SelloSAT: stamped.Data.SelloSAT, CadenaOriginalSAT: stamped.Data.CadenaOriginalSAT,
		FechaFactura: stampDate, EsGlobal: true, Subtotal: subtotal, Impuestos: impuestos,
		Descuento: decimal.Zero, Total: total, Estatus: "vigente", ArchivoXML: xmlPath, ArchivoPDF: pdfPath,
	}
	facturaColumn, err := facturaGlobalColumn(claveForma)
	if err != nil {
		return nil, err
	}
	if err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&factura).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.Pedido{}).Where("id IN ? AND factura_id IS NULL", pedidoIDs).Update("factura_id", factura.ID).Error; err != nil {
			return err
		}
		return tx.Model(&models.OperacionSucursal{}).
			Where("id = ? AND ("+facturaColumn+" IS NULL OR "+facturaColumn+" = 0)", operacion.ID).
			Update(facturaColumn, factura.ID).Error
	}); err != nil {
		return nil, fmt.Errorf("factura global timbrada, pero no se pudo registrar localmente: %w", err)
	}
	return map[string]any{
		"claveFormaPago": claveForma,
		"facturaId":      factura.ID,
		"uuid":           factura.UUID,
		"total":          satNumber(total),
		"archivoXML":     xmlPath,
		"archivoPDF":     pdfPath,
		"pdfBase64":      base64.StdEncoding.EncodeToString(pdfBytes),
		"pdfFileName":    filepath.Base(pdfPath),
	}, nil
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

func (s *FacturacionService) ObtenerMotivosCancelacion() ([]dto.SatMotivoCancelacionDto, error) {
	var motivos []dto.SatMotivoCancelacionDto
	err := s.db.Model(&models.SatMotivosCancelacion{}).
		Select("id, guid, cve_motivo, motivo_cancelacion, requiere_folio_sustitucion").
		Where("deleted_at IS NULL").
		Order("cve_motivo").Scan(&motivos).Error
	return motivos, err
}

// CancelarCFDIVenta cancela primero el comprobante ante el servicio fiscal y
// solamente después cancela la venta local y reintegra sus existencias.
func (s *FacturacionService) CancelarCFDIVenta(req dto.CancelarCFDIVentaRequestDto) (*dto.ResponseDto, error) {
	req.PedidoGuid = strings.TrimSpace(req.PedidoGuid)
	req.CveMotivo = strings.TrimSpace(req.CveMotivo)
	req.FolioSustitucion = strings.TrimSpace(req.FolioSustitucion)
	if req.PedidoGuid == "" || req.CveMotivo == "" {
		return nil, fmt.Errorf("la venta y el motivo de cancelación son requeridos")
	}

	var motivo models.SatMotivosCancelacion
	if err := s.db.Where("cve_motivo = ? AND deleted_at IS NULL", req.CveMotivo).First(&motivo).Error; err != nil {
		return nil, fmt.Errorf("motivo de cancelación SAT inválido")
	}
	if motivo.RequiereFolioSustitucion && req.FolioSustitucion == "" {
		return nil, fmt.Errorf("el motivo seleccionado requiere el folio fiscal de sustitución")
	}

	var pedido models.Pedido
	if err := s.db.Preload("Estatus").Preload("TipoPedido").Preload("Factura").
		Preload("SucursalOrigen.Empresa").
		Where("pedidos.guid = ? AND pedidos.deleted_at IS NULL", req.PedidoGuid).
		First(&pedido).Error; err != nil {
		return nil, fmt.Errorf("venta facturada no encontrada: %w", err)
	}
	if pedido.TipoPedido.Guid.String() != models.TipoPedidoVentaGuid {
		return nil, fmt.Errorf("únicamente se pueden cancelar CFDI de ventas")
	}
	if pedidoCancelado(&pedido) {
		return nil, fmt.Errorf("la venta ya se encuentra cancelada")
	}
	if pedido.FacturaID == nil || strings.TrimSpace(pedido.Factura.UUID) == "" {
		return nil, fmt.Errorf("la venta no tiene un CFDI timbrado")
	}

	facturaYaCancelada := strings.EqualFold(strings.TrimSpace(pedido.Factura.Estatus), "cancelado")
	if !facturaYaCancelada {
		cfg, err := LoadKommerzConfig()
		if err != nil {
			return nil, err
		}
		if cfg.FacturacionAPIHost == "" || cfg.FacturacionClientID == "" || cfg.FacturacionClientSecret == "" {
			return nil, fmt.Errorf("configura Api Host, Client ID y Client Secret en Configuración > Facturación")
		}
		accessToken, err := s.facturacionToken(cfg)
		if err != nil {
			return nil, err
		}
		rfcEmisor := strings.TrimSpace(pedido.SucursalOrigen.Empresa.RFC)
		if rfcEmisor == "" {
			return nil, fmt.Errorf("la empresa emisora no tiene un RFC configurado")
		}
		payload := map[string]any{
			"RFC":    rfcEmisor,
			"UUID":   pedido.Factura.UUID,
			"Motivo": req.CveMotivo,
		}
		if req.CveMotivo == "01" {
			if req.FolioSustitucion == "" {
				return nil, fmt.Errorf("el motivo 01 requiere el folio fiscal de sustitución")
			}
			payload["FolioSustitucion"] = req.FolioSustitucion
		}
		body, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		apiReq, err := http.NewRequest(http.MethodPost, strings.TrimRight(cfg.FacturacionAPIHost, "/")+"/api/facturacion/cancelar-cfdi", bytes.NewReader(body))
		if err != nil {
			return nil, fmt.Errorf("no se pudo preparar la cancelación del CFDI: %w", err)
		}
		apiReq.Header.Set("Content-Type", "application/json")
		apiReq.Header.Set("Authorization", "Bearer "+accessToken)
		apiResp, err := s.client.Do(apiReq)
		if err != nil {
			return nil, fmt.Errorf("no se pudo cancelar el CFDI: %w", err)
		}
		defer apiResp.Body.Close()
		apiBody, _ := io.ReadAll(io.LimitReader(apiResp.Body, 8<<20))
		if apiResp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("cancelación CFDI respondió %d: %s", apiResp.StatusCode, string(apiBody))
		}
		var cancelled cfdiCancellationResponse
		if err = json.Unmarshal(apiBody, &cancelled); err != nil {
			return nil, fmt.Errorf("respuesta de cancelación inválida: %w", err)
		}
		if !cancelled.Success {
			return nil, fmt.Errorf("el CFDI no fue cancelado: %s", cancelled.Mensaje)
		}
		acuseBase64 := strings.TrimSpace(cancelled.Data.AcuseBase64)
		if acuseBase64 == "" {
			acuseBase64 = strings.TrimSpace(cancelled.AcuseBase64)
		}
		if acuseBase64 == "" {
			return nil, fmt.Errorf("el CFDI fue cancelado, pero el servicio no devolvió el acuse")
		}

		xmlPath, xmlBytes, saveErr := saveCancellationXML(cfg.FacturacionXMLPath, pedido.Factura.Serie, pedido.Factura.Folio, pedido.Factura.UUID, acuseBase64)
		if saveErr != nil {
			return nil, fmt.Errorf("el CFDI fue cancelado, pero no se pudo guardar el acuse: %w", saveErr)
		}
		receipt, parseErr := cancellationReceiptFromXML(xmlBytes)
		if parseErr != nil {
			return nil, fmt.Errorf("el CFDI fue cancelado y el XML se guardó en %s, pero no se pudo generar su PDF: %w", xmlPath, parseErr)
		}
		receipt.Negocio = pedido.SucursalOrigen.Empresa.NombreComercial
		receipt.RazonSocial = pedido.SucursalOrigen.Empresa.RazonSocial
		receipt.Sucursal = pedido.SucursalOrigen.NombreSucursal
		receipt.Telefono = pedido.SucursalOrigen.Telefono
		receipt.Correo = pedido.SucursalOrigen.Correo
		pdfBytes, renderErr := renders.RenderCancellationReceiptPDF(receipt)
		if renderErr != nil {
			return nil, fmt.Errorf("el CFDI fue cancelado y el XML se guardó en %s, pero no se pudo generar su PDF: %w", xmlPath, renderErr)
		}
		pdfPath, savePDFErr := saveInvoicePDF(xmlPath, pdfBytes)
		if savePDFErr != nil {
			return nil, fmt.Errorf("el CFDI fue cancelado y el XML se guardó en %s, pero no se pudo guardar su PDF: %w", xmlPath, savePDFErr)
		}

		now := time.Now()
		if err = s.db.Model(&models.Factura{}).Where("id = ?", *pedido.FacturaID).Updates(map[string]any{
			"estatus": "cancelado", "motivo_cancelacion": req.CveMotivo,
			"folio_sustitucion": req.FolioSustitucion, "fecha_cancelacion": &now,
			"archivo_xml_cancelacion": xmlPath, "archivo_pdf_cancelacion": pdfPath,
		}).Error; err != nil {
			return nil, fmt.Errorf("el CFDI fue cancelado, pero no se pudo actualizar localmente: %w", err)
		}
		pedido.Factura.ArchivoXMLCancelacion = xmlPath
		pedido.Factura.ArchivoPDFCancelacion = pdfPath
	}

	pos := repository.NewPosRepository(s.db, context.Background(), "", nil)
	result, err := pos.CancelarVenta(req.PedidoGuid)
	if err != nil {
		return result, fmt.Errorf("el CFDI fue cancelado, pero no se pudo cancelar la venta: %w", err)
	}
	result.Message = "CFDI y venta cancelados; las existencias fueron reintegradas"
	if path := strings.TrimSpace(pedido.Factura.ArchivoPDFCancelacion); path != "" {
		if pdfBytes, readErr := os.ReadFile(path); readErr == nil {
			result.Data = &dto.FacturacionResultadoDto{
				Success: true, UUID: pedido.Factura.UUID,
				PDFBase64: base64.StdEncoding.EncodeToString(pdfBytes), PDFFileName: filepath.Base(path),
				Data: map[string]any{"archivoPDF": path, "archivoXML": pedido.Factura.ArchivoXMLCancelacion},
			}
		}
	}
	return result, nil
}

func (s *FacturacionService) ObtenerAcuseCancelacionPDF(pedidoGuid string) (*dto.FacturacionResultadoDto, error) {
	var pedido models.Pedido
	if err := s.db.Preload("Factura").Preload("SucursalOrigen.Empresa").Where("pedidos.guid = ? AND pedidos.deleted_at IS NULL", strings.TrimSpace(pedidoGuid)).First(&pedido).Error; err != nil {
		return nil, fmt.Errorf("venta cancelada no encontrada: %w", err)
	}
	if pedido.FacturaID == nil || !strings.EqualFold(strings.TrimSpace(pedido.Factura.Estatus), "cancelado") {
		return nil, fmt.Errorf("la venta no tiene un CFDI cancelado")
	}
	xmlPath := strings.TrimSpace(pedido.Factura.ArchivoXMLCancelacion)
	xmlBytes, err := os.ReadFile(xmlPath)
	if err != nil || len(xmlBytes) == 0 {
		return nil, fmt.Errorf("no se pudo leer el XML del acuse")
	}
	receipt, err := cancellationReceiptFromXML(xmlBytes)
	if err != nil {
		return nil, err
	}
	receipt.Negocio = pedido.SucursalOrigen.Empresa.NombreComercial
	receipt.RazonSocial = pedido.SucursalOrigen.Empresa.RazonSocial
	receipt.Sucursal = pedido.SucursalOrigen.NombreSucursal
	receipt.Telefono = pedido.SucursalOrigen.Telefono
	receipt.Correo = pedido.SucursalOrigen.Correo
	pdfBytes, err := renders.RenderCancellationReceiptPDF(receipt)
	if err != nil {
		return nil, fmt.Errorf("no se pudo generar el PDF del acuse: %w", err)
	}
	path, err := saveInvoicePDF(xmlPath, pdfBytes)
	if err != nil {
		return nil, err
	}
	if err = s.db.Model(&models.Factura{}).Where("id = ?", *pedido.FacturaID).Update("archivo_pdf_cancelacion", path).Error; err != nil {
		return nil, fmt.Errorf("el PDF del acuse fue generado, pero no se pudo registrar su ruta: %w", err)
	}
	return &dto.FacturacionResultadoDto{
		Success: true, UUID: pedido.Factura.UUID,
		PDFBase64: base64.StdEncoding.EncodeToString(pdfBytes), PDFFileName: filepath.Base(path),
		Data: map[string]any{"archivoPDF": path, "archivoXML": pedido.Factura.ArchivoXMLCancelacion},
	}, nil
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
