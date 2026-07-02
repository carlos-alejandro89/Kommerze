package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditoriaSucursalRepository struct {
	apiBaseURL  string
	db          *gorm.DB
	cloudClient AuditoriaCloudClient
}

type AuditoriaCloudClient interface {
	Post(url string, contentType string, body io.Reader) (*http.Response, error)
}

func NewAuditoriaSucursalRepository(apiBaseURL string, db *gorm.DB, cloudClient AuditoriaCloudClient) *AuditoriaSucursalRepository {
	return &AuditoriaSucursalRepository{
		apiBaseURL:  apiBaseURL,
		db:          db,
		cloudClient: cloudClient,
	}
}

type ResumenInventario struct {
	ValorInventario float64 `gorm:"column:valor_inventario"`
	TotalItems      int64   `gorm:"column:total_items"`
}

func (a *AuditoriaSucursalRepository) ObtenerResumenInventario() *dto.ResponseDto {
	var resumen ResumenInventario

	err := a.db.
		Model(&models.SucursalProducto{}).
		Select(`
			COALESCE(SUM(precio_venta * existencia), 0) AS valor_inventario,
			COUNT(*) AS total_items
		`).
		Scan(&resumen).Error

	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	return dto.NewResponseDto(
		true,
		"Resumen de inventario obtenido correctamente",
		resumen,
		nil,
	)
}

func (a *AuditoriaSucursalRepository) GuardarConteoCloud(conteo dto.AuditoriaConteoWsDto) error {
	guidAuditoria, err := uuid.Parse(conteo.GuidAuditoria)
	if err != nil {
		return fmt.Errorf("guidAuditoria invalido: %w", err)
	}
	guidNivel, err := uuid.Parse(conteo.GuidNivel)
	if err != nil {
		return fmt.Errorf("guidNivel invalido: %w", err)
	}

	return a.db.Transaction(func(tx *gorm.DB) error {
		var auditoria models.Auditoria
		if err := tx.Where("guid = ?", guidAuditoria).First(&auditoria).Error; err != nil {
			return fmt.Errorf("auditoria no encontrada: %w", err)
		}

		var nivel models.NivelEmpaque
		if err := tx.Where("guid = ?", guidNivel).First(&nivel).Error; err != nil {
			return fmt.Errorf("nivel no encontrado: %w", err)
		}

		result := tx.Model(&models.AuditoriaProducto{}).
			Where("auditoria_id = ? AND nivel_id = ? AND deleted_at IS NULL", auditoria.ID, nivel.ID).
			Update("conteo_fisico", conteo.Conteo)
		if result.Error != nil {
			return fmt.Errorf("actualizando conteo de auditoria: %w", result.Error)
		}
		if result.RowsAffected > 0 {
			return nil
		}

		var sucursalProducto models.SucursalProducto
		err := tx.Where("nivel_id = ? AND deleted_at IS NULL", nivel.ID).First(&sucursalProducto).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("buscando inventario de nivel: %w", err)
		}

		auditoriaProducto := models.AuditoriaProducto{
			AuditoriaId:  auditoria.ID,
			NivelID:      nivel.ID,
			ConteoFisico: conteo.Conteo,
		}
		if err == nil {
			auditoriaProducto.EnExistencia = sucursalProducto.Existencia.InexactFloat64()
			auditoriaProducto.PrecioCompra = sucursalProducto.PrecioCompra.InexactFloat64()
			auditoriaProducto.PrecioVenta = sucursalProducto.PrecioVenta.InexactFloat64()
		}

		if err := tx.Create(&auditoriaProducto).Error; err != nil {
			return fmt.Errorf("creando producto de auditoria: %w", err)
		}
		return nil
	})
}

func (a *AuditoriaSucursalRepository) VerificarAuditoriasEnCurso() *dto.ResponseDto {
	var auditoria models.Auditoria
	err := a.db.Model(&models.Auditoria{}).Select("*").Where("estatus_id IN ?", []int{1, 2, 4}).First(&auditoria).Error

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		fmt.Println(err.Error(), "error en la busqueda de auditoria")
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	var productos []dto.AuditoriaProductoDto

	if auditoria.Guid != uuid.Nil {
		fmt.Println("Ya existe una auditoria en curso")

		err := a.db.Raw("SELECT guid, codigo, descripcion, empaque,en_existencia as existencia, pventa as precio_venta FROM vw_auditoria_producto Where auditoria_id = ?", auditoria.ID).Scan(&productos).Error
		if err != nil {
			fmt.Println("error en la consulta de productos", err.Error())
			return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
		}

		return dto.NewResponseDto(
			true,
			"Auditoria en curso",
			dto.AuditoriaInicioDto{
				Auditoria: auditoria,
				Productos: productos,
			},
			nil)
	}

	return dto.NewResponseDto(false, "No hay auditorias en curso", nil, nil)
}

func (a *AuditoriaSucursalRepository) IniciarAuditoria(sucursalGuid string, usuarioEncargadoGuid string) *dto.ResponseDto {

	existeAuditoria := a.VerificarAuditoriasEnCurso()
	if existeAuditoria.Success {
		return existeAuditoria
	}

	var productos []dto.AuditoriaProductoDto
	err := a.db.Raw("SELECT guid, codigo, descripcion, empaque,existencia, precio_venta, precio_venta2 FROM vw_inventario_productos").Scan(&productos).Error
	if err != nil {
		fmt.Println(err.Error(), "error en la consulta de productos")
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	payload, err := json.Marshal(map[string]interface{}{
		"sucursalGuid":         sucursalGuid,
		"usuarioEncargadoGuid": usuarioEncargadoGuid,
		"productos":            productos,
	})

	if err != nil {
		fmt.Println("error al marshal", err.Error())
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	if a.cloudClient == nil {
		return dto.NewResponseDto(false, "cliente cloud no configurado", nil, []string{"cliente cloud no configurado"})
	}

	endpoint := fmt.Sprintf("%s/auditoria/crear", a.apiBaseURL)
	response, err := a.cloudClient.Post(endpoint, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		fmt.Println("error al enviar la peticion", err.Error())
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		bodyBytes, _ := io.ReadAll(response.Body)
		message := fmt.Sprintf("cloud respondio status %d: %s", response.StatusCode, string(bodyBytes))
		return dto.NewResponseDto(false, message, nil, []string{message})
	}

	var responseDto dto.ResponseDto
	err = json.NewDecoder(response.Body).Decode(&responseDto)
	if err != nil {
		fmt.Println("error al decodificar la respuesta", err.Error())
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	if dataMap, ok := responseDto.Data.(map[string]any); ok {
		var crearAuditoria models.Auditoria

		// 1. GUID (Asegúrate de manejar el error por si viene vacío o inválido)
		if guidStr, ok := dataMap["guid"].(string); ok {
			if parsedGuid, err := uuid.Parse(guidStr); err == nil {
				crearAuditoria.Guid = parsedGuid
			}
		}

		// 2. EstatusID (*uint)
		// Nota: En JSON todos los números se leen como float64.
		// Primero obtenemos el float64, lo convertimos a uint y luego guardamos su dirección.
		if estatusVal, ok := dataMap["estatusId"].(float64); ok {
			estatusUint := uint(estatusVal)
			crearAuditoria.EstatusID = &estatusUint
		} else if estatusValInt, ok := dataMap["estatusId"].(int); ok {
			// Por si acaso el mapa se construyó manualmente con int locales en Go
			estatusUint := uint(estatusValInt)
			crearAuditoria.EstatusID = &estatusUint
		}

		// 3. CentroID (*uint) - Mismo caso que el anterior
		if sucursalVal, ok := dataMap["sucursalId"].(float64); ok {
			sucursalUint := uint(sucursalVal)
			crearAuditoria.CentroID = &sucursalUint
		} else if sucursalValInt, ok := dataMap["sucursalId"].(int); ok {
			sucursalUint := uint(sucursalValInt)
			crearAuditoria.CentroID = &sucursalUint
		}

		// 4. UsuarioEncargadoID
		// En tu JSON original la propiedad se llama "usuarioEncargado" y es un sub-mapa,
		// no un string plano de un GUID. Para sacar el ID del encargado debes entrar al sub-mapa:
		/*if usuarioEncargado, ok := dataMap["usuarioEncargado"].(map[string]any); ok {
			if encargadoIdVal, ok := usuarioEncargado["id"].(float64); ok {
				encargadoID := uint(encargadoIdVal)
				auditoria.UsuarioEncargadoID = &encargadoID // Asumiendo que es un *uint en tu modelo
			}
		}*/

		// 5. CreatedAt (time.Time)
		// Como viene del JSON como string, necesitas usar time.Parse con el formato (Layout) correcto.
		if createdAtStr, ok := dataMap["createdAt"].(string); ok {
			// El layout "2006-01-02T15:04:05" coincide con tu formato "2026-06-29T23:52:09..."
			if parsedTime, err := time.Parse("2006-01-02T15:04:05", createdAtStr[:19]); err == nil {
				crearAuditoria.CreatedAt = parsedTime
			}
		}
		if err := a.db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&crearAuditoria).Error; err != nil {
				return fmt.Errorf("creando auditoria local: %w", err)
			}
			if err := a.insertarProductosAuditoria(tx, crearAuditoria.ID, productos); err != nil {
				return err
			}
			return nil
		}); err != nil {
			return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
		}

		return dto.NewResponseDto(
			true,
			"Solicitud de auditoria creada correctamente",
			dto.AuditoriaInicioDto{
				Auditoria: crearAuditoria,
				Productos: productos,
			},
			nil,
		)
	}

	return dto.NewResponseDto(
		responseDto.Success,
		responseDto.Message,
		nil,
		nil,
	)
}

func (a *AuditoriaSucursalRepository) insertarProductosAuditoria(tx *gorm.DB, auditoriaID uint, productos []dto.AuditoriaProductoDto) error {
	if len(productos) == 0 {
		return nil
	}

	nivelGuids := make([]uuid.UUID, 0, len(productos))
	for _, producto := range productos {
		guid, err := uuid.Parse(producto.Guid)
		if err != nil {
			return fmt.Errorf("guid de nivel invalido %q: %w", producto.Guid, err)
		}
		nivelGuids = append(nivelGuids, guid)
	}

	var niveles []models.NivelEmpaque
	if err := tx.Where("guid IN ?", nivelGuids).Find(&niveles).Error; err != nil {
		return fmt.Errorf("consultando niveles de auditoria: %w", err)
	}

	nivelesPorGuid := make(map[uuid.UUID]uint, len(niveles))
	for _, nivel := range niveles {
		nivelesPorGuid[nivel.Guid] = nivel.ID
	}

	auditoriaProductos := make([]models.AuditoriaProducto, 0, len(productos))
	for _, producto := range productos {
		guid, _ := uuid.Parse(producto.Guid)
		nivelID, ok := nivelesPorGuid[guid]
		if !ok {
			return fmt.Errorf("nivel no encontrado para guid %s", producto.Guid)
		}

		auditoriaProductos = append(auditoriaProductos, models.AuditoriaProducto{
			AuditoriaId:  auditoriaID,
			NivelID:      nivelID,
			EnExistencia: producto.Existencia.InexactFloat64(),
			ConteoFisico: 0,
			PrecioVenta:  producto.PrecioVenta.InexactFloat64(),
		})
	}

	if err := tx.CreateInBatches(&auditoriaProductos, 500).Error; err != nil {
		return fmt.Errorf("insertando productos de auditoria: %w", err)
	}
	return nil
}

func (a *AuditoriaSucursalRepository) ObtenerProductos() *dto.ResponseDto {
	var productos []dto.AuditoriaProductoDto
	err := a.db.Raw("SELECT guid, codigo, descripcion, empaque,existencia, precio_venta, precio_venta2 FROM vw_inventario_productos").Scan(&productos).Error
	if err != nil {
		fmt.Println(err.Error(), "error en la consulta de productos")
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	return dto.NewResponseDto(true, "Productos obtenidos correctamente", productos, nil)
}

func (a *AuditoriaSucursalRepository) ConsultaProductoAuditoria(guidNivel string) *dto.InventarioDto {
	var producto *dto.InventarioDto
	a.db.Raw("SELECT * FROM vw_inventario_productos WHERE guid = ?", guidNivel).Scan(&producto)
	return producto
	//vw_inventario_productos
}
