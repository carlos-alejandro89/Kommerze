package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"fmt"
	"strconv"

	"github.com/shopspring/decimal"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CatalogosRepository struct {
	db *gorm.DB
}

func NewCatalogosRepository(db *gorm.DB) *CatalogosRepository {
	return &CatalogosRepository{db: db}
}

func (c *CatalogosRepository) GetEmpaques() (*dto.ResponseDto, error) {
	var empaques []models.Empaque
	if err := c.db.Find(&empaques).Error; err != nil {
		return dto.NewResponseDto(false, "Error al obtener empaques", nil, []string{err.Error()}), err
	}
	return dto.NewResponseDto(true, "Empaques obtenidos correctamente", empaques, nil), nil
}

func (c *CatalogosRepository) SaveEmpaques(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		contenido, _ := strconv.ParseFloat(fmt.Sprintf("%v", fMap["contenido"]), 64)
		sincronizado := fmt.Sprintf("%v", fMap["sync"]) == "False"

		empaque := models.Empaque{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			CodigoEmpaque: fmt.Sprintf("%v", fMap["codigoEmpaque"]),
			NombreEmpaque: fmt.Sprintf("%v", fMap["nombreEmpaque"]),
			Contenido:     contenido,
			Sync:          sincronizado,
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&empaque).Error; err != nil {
			return fmt.Errorf("error insertando empaque: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) GetMarcas() (*dto.ResponseDto, error) {
	var marcas []models.Marca
	if err := c.db.Find(&marcas).Error; err != nil {
		return dto.NewResponseDto(false, "Error al obtener marcas", nil, []string{err.Error()}), err
	}
	return dto.NewResponseDto(true, "Marcas obtenidas correctamente", marcas, nil), nil
}

func (c *CatalogosRepository) SaveMarcas(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		marca := models.Marca{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			NombreMarca: fmt.Sprintf("%v", fMap["nombreMarca"]),
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&marca).Error; err != nil {
			return fmt.Errorf("error insertando marca: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) GetLineas() (*dto.ResponseDto, error) {
	var lineas []models.Linea
	if err := c.db.Find(&lineas).Error; err != nil {
		return dto.NewResponseDto(false, "Error al obtener lineas", nil, []string{err.Error()}), err
	}
	return dto.NewResponseDto(true, "Lineas obtenidas correctamente", lineas, nil), nil
}

func (c *CatalogosRepository) SaveLineas(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		linea := models.Linea{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			NombreLinea: fmt.Sprintf("%v", fMap["nombreLinea"]),
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&linea).Error; err != nil {
			return fmt.Errorf("error insertando linea: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) GetSatProductos() (*dto.ResponseDto, error) {
	var satProductos []models.SATProducto
	if err := c.db.Find(&satProductos).Error; err != nil {
		return dto.NewResponseDto(false, "Error al obtener productos SAT", nil, []string{err.Error()}), err
	}
	return dto.NewResponseDto(true, "Productos SAT obtenidos correctamente", satProductos, nil), nil
}

func (c *CatalogosRepository) SaveSatProductos(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		satProd := models.SATProducto{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			Clave:       fmt.Sprintf("%v", fMap["clave"]),
			Descripcion: fmt.Sprintf("%v", fMap["descripcion"]),
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&satProd).Error; err != nil {
			return fmt.Errorf("error insertando sat_producto: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) SaveProductos(data []any) error {
	var dicLineas = make(map[uuid.UUID]uint)
	var dicMarcas = make(map[uuid.UUID]uint)
	var dicSatProds = make(map[uuid.UUID]uint)

	var lineas []models.Linea
	if err := c.db.Find(&lineas).Error; err == nil {
		for _, l := range lineas {
			dicLineas[l.Guid] = l.ID
		}
	}

	var marcas []models.Marca
	if err := c.db.Find(&marcas).Error; err == nil {
		for _, m := range marcas {
			dicMarcas[m.Guid] = m.ID
		}
	}

	var satProds []models.SATProducto
	if err := c.db.Find(&satProds).Error; err == nil {
		for _, sp := range satProds {
			dicSatProds[sp.Guid] = sp.ID
		}
	}

	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		productoBaseId, _ := strconv.Atoi(fmt.Sprintf("%v", fMap["productoBaseId"]))
		fraccionable := fmt.Sprintf("%v", fMap["fraccionable"]) == "true"

		producto := models.Producto{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			ProductoBaseId: productoBaseId,
			Prefijo:        fmt.Sprintf("%v", fMap["prefijo"]),
			Descripcion:    fmt.Sprintf("%v", fMap["descripcion"]),
			ObjetoImpuesto: fmt.Sprintf("%v", fMap["objetoImpuesto"]),
			Fraccionable:   fraccionable,
		}

		if lGuidStr, ok := fMap["lineaGuid"].(string); ok && lGuidStr != "" {
			if lGuid, err := uuid.Parse(lGuidStr); err == nil {
				if id, exists := dicLineas[lGuid]; exists {
					producto.LineaID = &id
				}
			}
		}

		if mGuidStr, ok := fMap["marcaGuid"].(string); ok && mGuidStr != "" {
			if mGuid, err := uuid.Parse(mGuidStr); err == nil {
				if id, exists := dicMarcas[mGuid]; exists {
					producto.MarcaID = &id
				}
			}
		}

		if spGuidStr, ok := fMap["satProductoGuid"].(string); ok && spGuidStr != "" {
			if spGuid, err := uuid.Parse(spGuidStr); err == nil {
				if id, exists := dicSatProds[spGuid]; exists {
					producto.SatProductoID = &id
				}
			}
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&producto).Error; err != nil {
			return fmt.Errorf("error insertando producto: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) SaveNivelesEmpaque(data []any) error {
	var dicProds = make(map[uuid.UUID]uint)
	var dicEmpaques = make(map[uuid.UUID]uint)

	var prods []models.Producto
	if err := c.db.Find(&prods).Error; err == nil {
		for _, p := range prods {
			dicProds[p.Guid] = p.ID
		}
	}

	var empaques []models.Empaque
	if err := c.db.Find(&empaques).Error; err == nil {
		for _, e := range empaques {
			dicEmpaques[e.Guid] = e.ID
		}
	}

	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["nivelGuid"]))
		activo := fmt.Sprintf("%v", fMap["isActive"]) == "true"

		nivel := models.NivelEmpaque{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			Codigo:        fmt.Sprintf("%v", fMap["codigo"]),
			CodigoBarra:   fmt.Sprintf("%v", fMap["codigoBarras"]),
			ImgReferencia: fmt.Sprintf("%v", fMap["imgReferencia"]),
			Activo:        activo,
		}

		if pGuidStr, ok := fMap["productoGuid"].(string); ok && pGuidStr != "" {
			if pGuid, err := uuid.Parse(pGuidStr); err == nil {
				if id, exists := dicProds[pGuid]; exists {
					nivel.ProductoID = id
				}
			}
		}

		if eGuidStr, ok := fMap["empaqueGuid"].(string); ok && eGuidStr != "" {
			if eGuid, err := uuid.Parse(eGuidStr); err == nil {
				if id, exists := dicEmpaques[eGuid]; exists {
					nivel.EmpaqueID = id
				}
			}
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&nivel).Error; err != nil {
			return fmt.Errorf("error insertando nivel_empaque: %w", err)
		}

		sucursalProducto := models.SucursalProducto{
			BaseModel: models.BaseModel{
				Guid: guid,
			},

			NivelID:      nivel.ID,
			PrecioCompra: decimal.Zero,
			PrecioVenta:  decimal.Zero,
			PrecioVenta2: decimal.Zero,
			PrecioVenta3: decimal.Zero,
			Descuento:    decimal.Zero,
			Sync:         true,
		}

		if err := c.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "guid"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"precio_compra",
				"precio_venta",
				"precio_venta2",
				"precio_venta3",
				"descuento",
				"sync",
			}),
		}).Create(&sucursalProducto).Error; err != nil {
			return fmt.Errorf("error insertando sucursal_producto: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) GetSatFormasPago() (*dto.ResponseDto, error) {
	var satFormasPago []models.SATFormaPago
	if err := c.db.Find(&satFormasPago).Error; err != nil {
		return dto.NewResponseDto(false, "Error al obtener formas de pago", nil, []string{err.Error()}), err
	}
	return dto.NewResponseDto(true, "Formas de pago obtenidas correctamente", satFormasPago, nil), nil
}

func (c *CatalogosRepository) SaveSatFormasPago(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		activo := fmt.Sprintf("%v", fMap["isActive"]) == "true"

		forma := models.SATFormaPago{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			Clave:       fmt.Sprintf("%v", fMap["clave"]),
			Descripcion: fmt.Sprintf("%v", fMap["descripcion"]),
			Activo:      activo,
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&forma).Error; err != nil {
			return fmt.Errorf("error insertando forma_pago: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) GetSatMetodosPago() (*dto.ResponseDto, error) {
	var satMetodosPago []models.SATMetodoPago
	if err := c.db.Find(&satMetodosPago).Error; err != nil {
		return dto.NewResponseDto(false, "Error al obtener metodos de pago", nil, []string{err.Error()}), err
	}
	return dto.NewResponseDto(true, "Metodos de pago obtenidos correctamente", satMetodosPago, nil), nil
}

func (c *CatalogosRepository) SaveSatMetodosPago(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		metodo := models.SATMetodoPago{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			Clave:       fmt.Sprintf("%v", fMap["clave"]),
			Descripcion: fmt.Sprintf("%v", fMap["descripcion"]),
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&metodo).Error; err != nil {
			return fmt.Errorf("error insertando metodo_pago: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) GetSatUsosCFDI() (*dto.ResponseDto, error) {
	var satUsosCFDI []models.SATUsoCFDI
	if err := c.db.Find(&satUsosCFDI).Error; err != nil {
		return dto.NewResponseDto(false, "Error al obtener usos de CFDI", nil, []string{err.Error()}), err
	}
	return dto.NewResponseDto(true, "Usos de CFDI obtenidos correctamente", satUsosCFDI, nil), nil
}

func (c *CatalogosRepository) SaveSatUsosCFDI(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		activo := fmt.Sprintf("%v", fMap["isActive"]) == "true"

		uso := models.SATUsoCFDI{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			Clave:       fmt.Sprintf("%v", fMap["clave"]),
			Descripcion: fmt.Sprintf("%v", fMap["descripcion"]),
			Activo:      activo,
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&uso).Error; err != nil {
			return fmt.Errorf("error insertando uso_cfdi: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) GetSatRegimenFiscal() (*dto.ResponseDto, error) {
	var satRegimenFiscal []models.SATRegimenFiscal
	if err := c.db.Find(&satRegimenFiscal).Error; err != nil {
		return dto.NewResponseDto(false, "Error al obtener regimenes fiscales", nil, []string{err.Error()}), err
	}
	return dto.NewResponseDto(true, "Regimenes fiscales obtenidos correctamente", satRegimenFiscal, nil), nil
}

func (c *CatalogosRepository) SaveSatRegimenFiscal(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		activo := fmt.Sprintf("%v", fMap["isActive"]) == "true"

		regimen := models.SATRegimenFiscal{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			Clave:       fmt.Sprintf("%v", fMap["clave"]),
			Descripcion: fmt.Sprintf("%v", fMap["descripcion"]),
			Activo:      activo,
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&regimen).Error; err != nil {
			return fmt.Errorf("error insertando regimen_fiscal: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) SaveEmpresas(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		empresa := models.Empresa{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			NombreComercial: fmt.Sprintf("%v", fMap["nombreComercial"]),
			RazonSocial:     fmt.Sprintf("%v", fMap["rSocial"]),
			RFC:             fmt.Sprintf("%v", fMap["rfc"]),
			Calle:           fmt.Sprintf("%v", fMap["calle"]),
			Exterior:        fmt.Sprintf("%v", fMap["exterior"]),
			Interior:        fmt.Sprintf("%v", fMap["interior"]),
			Colonia:         fmt.Sprintf("%v", fMap["colonia"]),
			Ciudad:          fmt.Sprintf("%v", fMap["ciudad"]),
			Estado:          fmt.Sprintf("%v", fMap["estado"]),
			CodigoPostal:    fmt.Sprintf("%v", fMap["codigoPostal"]),
			Telefono:        fmt.Sprintf("%v", fMap["telefono"]),
			Correo:          fmt.Sprintf("%v", fMap["email"]),
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&empresa).Error; err != nil {
			return fmt.Errorf("error insertando empresa: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) GetSucursales() (*dto.ResponseDto, error) {
	var sucursales []models.Sucursal
	if err := c.db.Find(&sucursales).Error; err != nil {
		return dto.NewResponseDto(false, "Error al obtener sucursales", nil, []string{err.Error()}), err
	}
	return dto.NewResponseDto(true, "Sucursales obtenidas correctamente", sucursales, nil), nil
}

func (c *CatalogosRepository) SaveSucursales(data []any) error {
	var dicEmpresas = make(map[uuid.UUID]uint)
	var empresas []models.Empresa
	if err := c.db.Find(&empresas).Error; err == nil {
		for _, e := range empresas {
			dicEmpresas[e.Guid] = e.ID
		}
	}

	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		sucursal := models.Sucursal{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			NombreSucursal: fmt.Sprintf("%v", fMap["nombreSucursal"]),
			Calle:          fmt.Sprintf("%v", fMap["calle"]),
			Exterior:       fmt.Sprintf("%v", fMap["exterior"]),
			Interior:       fmt.Sprintf("%v", fMap["interior"]),
			Colonia:        fmt.Sprintf("%v", fMap["colonia"]),
			Ciudad:         fmt.Sprintf("%v", fMap["ciudad"]),
			Estado:         fmt.Sprintf("%v", fMap["estado"]),
			CodigoPostal:   fmt.Sprintf("%v", fMap["codigoPostal"]),
			Telefono:       fmt.Sprintf("%v", fMap["telefono"]),
			Correo:         fmt.Sprintf("%v", fMap["correo"]),
		}

		if eGuidStr, ok := fMap["empresaGuid"].(string); ok && eGuidStr != "" {
			if eGuid, err := uuid.Parse(eGuidStr); err == nil {
				if id, exists := dicEmpresas[eGuid]; exists {
					sucursal.EmpresaID = &id
				}
			}
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&sucursal).Error; err != nil {
			return fmt.Errorf("error insertando sucursal: %w", err)
		}
	}
	return nil
}
