package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"fmt"
	"strconv"
	"strings"
	"time"

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

func (c *CatalogosRepository) SaveSatUnidadesMedida(data []any) error {
	return c.db.Transaction(func(tx *gorm.DB) error {
		for _, fila := range data {
			fMap, ok := fila.(map[string]any)
			if !ok {
				continue
			}

			guid, err := uuid.Parse(strings.TrimSpace(fmt.Sprintf("%v", fMap["guid"])))
			if err != nil {
				return fmt.Errorf("GUID de unidad de medida SAT inválido: %w", err)
			}
			remoteID, err := strconv.ParseUint(strings.TrimSpace(fmt.Sprintf("%v", fMap["id"])), 10, 64)
			if err != nil || remoteID == 0 {
				return fmt.Errorf("ID de unidad de medida SAT inválido para %s", guid)
			}
			unidad := models.SatUnidadesMedida{
				BaseModel:      models.BaseModel{ID: uint(remoteID), Guid: guid},
				Clave:          strings.ToUpper(strings.TrimSpace(fmt.Sprintf("%v", fMap["clave"]))),
				NombreUnidad:   strings.TrimSpace(fmt.Sprintf("%v", fMap["nombreUnidad"])),
				DescripcionUso: strings.TrimSpace(fmt.Sprintf("%v", fMap["descripcionUso"])),
				IsActive:       fmt.Sprintf("%v", fMap["isActive"]) == "true",
			}
			if unidad.Clave == "" {
				return fmt.Errorf("la unidad de medida SAT %s no contiene clave", guid)
			}
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "guid"}},
				DoUpdates: clause.AssignmentColumns([]string{"clave", "nombre_unidad", "descripcion_uso", "is_active", "updated_at", "deleted_at"}),
			}).Create(&unidad).Error; err != nil {
				return fmt.Errorf("error insertando unidad de medida SAT: %w", err)
			}
		}
		return nil
	})
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
		var unidadSatID *uint
		rawID, exists := fMap["unidadSatId"]
		if !exists {
			// Compatibilidad con respuestas anteriores que conservaran el
			// acrónimo ID completamente en mayúsculas.
			rawID, exists = fMap["unidadSatID"]
		}
		if exists && rawID != nil {
			parsedID, parseErr := strconv.ParseUint(strings.TrimSpace(fmt.Sprintf("%v", rawID)), 10, 64)
			if parseErr != nil {
				return fmt.Errorf("unidadSatId inválido para el empaque %s: %w", guid, parseErr)
			}
			if parsedID > 0 {
				id := uint(parsedID)
				unidadSatID = &id
			}
		}

		empaque := models.Empaque{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			CodigoEmpaque: fmt.Sprintf("%v", fMap["codigoEmpaque"]),
			NombreEmpaque: fmt.Sprintf("%v", fMap["nombreEmpaque"]),
			Contenido:     contenido,
			Sync:          sincronizado,
			UnidadSatID:   unidadSatID,
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
	fmt.Println("data", data)
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
			fmt.Println("error insertando producto", err)
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
				} else {
					continue
				}
			} else {
				continue
			}
		} else {
			continue
		}

		if eGuidStr, ok := fMap["empaqueGuid"].(string); ok && eGuidStr != "" {
			if eGuid, err := uuid.Parse(eGuidStr); err == nil {
				if id, exists := dicEmpaques[eGuid]; exists {
					nivel.EmpaqueID = id
				} else {
					continue
				}
			} else {
				continue
			}
		} else {
			continue
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&nivel).Error; err != nil {
			return fmt.Errorf("error insertando nivel_empaque: %w", err)
		}

		// Crear el registro placeholder de sucursal_producto solo si no existe.
		// Si ya existe (con precios reales de la sincronización de Listas de Precios),
		// NO se deben sobreescribir los precios con cero. Por eso se usa DoNothing.
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
			Columns:   []clause.Column{{Name: "guid"}},
			DoNothing: true, // ← nunca pisar precios reales con ceros
		}).Create(&sucursalProducto).Error; err != nil {
			return fmt.Errorf("error insertando sucursal_producto placeholder: %w", err)
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

func (c *CatalogosRepository) SavePerfiles(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		perfil := models.Perfil{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			NombrePerfil: fmt.Sprintf("%v", fMap["nombrePerfil"]),
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&perfil).Error; err != nil {
			return fmt.Errorf("error insertando perfil: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) SaveRolesFiscales(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}
		guid, err := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		if err != nil {
			return fmt.Errorf("GUID de rol fiscal inválido: %w", err)
		}
		role := models.RolesFiscales{BaseModel: models.BaseModel{Guid: guid}, Nombre: strings.ToUpper(strings.TrimSpace(fmt.Sprintf("%v", fMap["nombre"])))}
		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&role).Error; err != nil {
			return fmt.Errorf("error insertando rol fiscal: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) SaveClientesSync(data dto.ClientesSyncDto) error {
	return c.db.Transaction(func(tx *gorm.DB) error {
		syncNow := time.Now().UTC()
		for _, item := range data.Clientes {
			guid, err := uuid.Parse(item.Guid)
			if err != nil {
				return fmt.Errorf("GUID de cliente inválido: %w", err)
			}
			createdAt, updatedAt := validSyncDates(item.CreatedAt.Time, item.UpdatedAt.Time, syncNow)
			client := models.Cliente{BaseModel: models.BaseModel{Guid: guid, CreatedAt: createdAt, UpdatedAt: updatedAt}, RazonSocial: item.RazonSocial, Correo: item.Correo, Telefono: item.Telefono, CreditoMaximo: decimal.NewFromFloat(item.CreditoMaximo), DiasCredito: item.DiasCredito}
			if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, DoUpdates: clause.AssignmentColumns([]string{"razon_social", "correo", "telefono", "credito_maximo", "dias_credito", "updated_at", "deleted_at"})}).Create(&client).Error; err != nil {
				return fmt.Errorf("error sincronizando cliente: %w", err)
			}
		}
		for _, item := range data.EntidadesFiscales {
			guid, err := uuid.Parse(item.Guid)
			if err != nil {
				return fmt.Errorf("GUID de entidad fiscal inválido: %w", err)
			}
			var regimenID *uint
			if item.RegimenGuid != nil && *item.RegimenGuid != "" {
				if regimenGuid, parseErr := uuid.Parse(*item.RegimenGuid); parseErr == nil {
					var regimen models.SATRegimenFiscal
					if tx.Where("guid = ?", regimenGuid).First(&regimen).Error == nil {
						regimenID = &regimen.ID
					}
				}
			}
			createdAt, updatedAt := validSyncDates(item.CreatedAt.Time, item.UpdatedAt.Time, syncNow)
			entity := models.EntidadFiscal{BaseModel: models.BaseModel{Guid: guid, CreatedAt: createdAt, UpdatedAt: updatedAt}, RegimenID: regimenID, RazonSocial: item.RazonSocial, RFC: normalizeSyncRFC(item.RFC), CodigoPostal: item.CodigoPostal, Correo: item.Correo, Telefono: item.Telefono, Whatsapp: item.Whatsapp}
			if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, DoUpdates: clause.AssignmentColumns([]string{"regimen_id", "razon_social", "rfc", "codigo_postal", "correo", "telefono", "whatsapp", "updated_at", "deleted_at"})}).Create(&entity).Error; err != nil {
				return fmt.Errorf("error sincronizando entidad fiscal: %w", err)
			}
		}
		var receptor models.RolesFiscales
		if err := tx.Where("nombre = ? AND deleted_at IS NULL", "RECEPTOR").First(&receptor).Error; err != nil {
			return fmt.Errorf("sincronice primero Roles fiscales: %w", err)
		}
		for _, item := range data.ClienteEntidadFiscal {
			guid, err := uuid.Parse(item.Guid)
			if err != nil {
				return fmt.Errorf("GUID de relación fiscal inválido: %w", err)
			}
			var client models.Cliente
			if err := tx.Where("guid = ?", item.ClienteGuid).First(&client).Error; err != nil {
				return fmt.Errorf("cliente relacionado no encontrado: %w", err)
			}
			var entity models.EntidadFiscal
			if err := tx.Where("guid = ?", item.EntidadFiscalGuid).First(&entity).Error; err != nil {
				return fmt.Errorf("entidad relacionada no encontrada: %w", err)
			}
			createdAt, updatedAt := validSyncDates(item.CreatedAt.Time, item.UpdatedAt.Time, syncNow)
			relation := models.ClienteEntidadFiscal{BaseModel: models.BaseModel{Guid: guid, CreatedAt: createdAt, UpdatedAt: updatedAt}, ClienteID: client.ID, EntidadFiscalID: entity.ID}
			if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, DoUpdates: clause.AssignmentColumns([]string{"cliente_id", "entidad_fiscal_id", "updated_at", "deleted_at"})}).Create(&relation).Error; err != nil {
				return fmt.Errorf("error sincronizando relación fiscal: %w", err)
			}
			roleLink := models.EntidadFiscalRol{EntidadFiscalID: entity.ID, RolID: receptor.ID}
			if err := tx.Where("entidad_fiscal_id = ? AND rol_id = ?", entity.ID, receptor.ID).FirstOrCreate(&roleLink).Error; err != nil {
				return fmt.Errorf("error vinculando rol RECEPTOR: %w", err)
			}
		}
		return nil
	})
}

func validSyncDates(createdAt, updatedAt, fallback time.Time) (time.Time, time.Time) {
	if createdAt.IsZero() || createdAt.Year() <= 1 {
		createdAt = fallback
	}
	if updatedAt.IsZero() || updatedAt.Year() <= 1 {
		updatedAt = createdAt
	}
	return createdAt.UTC(), updatedAt.UTC()
}

func normalizeSyncRFC(value string) string {
	return strings.ToUpper(strings.NewReplacer(" ", "", "-", "").Replace(strings.TrimSpace(value)))
}

func (c *CatalogosRepository) SaveUsuarios(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		correoConfirmado := fmt.Sprintf("%v", fMap["correoConfirmado"]) == "true"

		usuario := models.Usuario{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			Nombre:            fmt.Sprintf("%v", fMap["nombre"]),
			CorreoElectronico: fmt.Sprintf("%v", fMap["correoElectronico"]),
			Password:          fmt.Sprintf("%v", fMap["password"]),
			Telefono:          fmt.Sprintf("%v", fMap["telefono"]),
			CorreoConfirmado:  correoConfirmado,
		}

		// Resolver FK de perfil usando el perfilId numérico del cloud.
		// Buscamos el perfil local cuyo ID coincida con el perfilId recibido.
		if perfilIdRaw, ok := fMap["perfilId"]; ok {
			perfilIdFloat, _ := perfilIdRaw.(float64)
			perfilIdLocal := uint(perfilIdFloat)
			if perfilIdLocal > 0 {
				var perfil models.Perfil
				if err := c.db.First(&perfil, perfilIdLocal).Error; err == nil {
					usuario.PerfilID = perfil.ID
				}
			}
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&usuario).Error; err != nil {
			return fmt.Errorf("error insertando usuario: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) SaveTiposPedido(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))

		// icon puede llegar como null desde la API; evitar guardar la cadena "<nil>"
		iconStr := ""
		if v, ok := fMap["icon"]; ok && v != nil {
			iconStr = fmt.Sprintf("%v", v)
		}

		tipoPedido := models.TipoPedido{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			Nombre:      fmt.Sprintf("%v", fMap["nombre"]),
			Descripcion: fmt.Sprintf("%v", fMap["descripcion"]),
			Icon:        iconStr,
		}

		// Upsert por 'nombre' (único real de la tabla) para manejar datos
		// que el seeder ya insertó con distinto guid.
		if err := c.db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "nombre"}},
			UpdateAll: true,
		}).Create(&tipoPedido).Error; err != nil {
			return fmt.Errorf("error insertando tipo_pedido: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) SaveTiposAutorizacion(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		tipoAuth := models.TipoAutorizacion{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			Descripcion: fmt.Sprintf("%v", fMap["descripcion"]),
		}

		if err := c.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&tipoAuth).Error; err != nil {
			return fmt.Errorf("error insertando tipo_autorizacion: %w", err)
		}
	}
	return nil
}

func (c *CatalogosRepository) SaveEstatus(data []any) error {
	for _, fila := range data {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		estatus := models.Estatus{
			BaseModel: models.BaseModel{
				Guid: guid,
			},
			Nombre: fmt.Sprintf("%v", fMap["nombre"]),
		}

		// Upsert por 'nombre' (único real de la tabla) para manejar datos
		// que el seeder ya insertó con distinto guid.
		if err := c.db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "nombre"}},
			UpdateAll: true,
		}).Create(&estatus).Error; err != nil {
			return fmt.Errorf("error insertando estatus: %w", err)
		}
	}
	return nil
}
