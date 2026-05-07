package repository

import (
	"BitComercio/internal/models"
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)


type ListaPreciosRepository struct {
	db *gorm.DB
}

func NewListaPreciosRepository(db *gorm.DB) *ListaPreciosRepository {
	return &ListaPreciosRepository{db: db}
}

func (r *ListaPreciosRepository) SaveSucursalProducto(listaPrecios []any) error {
	// Construir diccionario nivelGuid → nivel.ID para resolver la FK
	var dicNiveles = make(map[uuid.UUID]uint)
	var niveles []models.NivelEmpaque
	if err := r.db.Find(&niveles).Error; err == nil {
		for _, n := range niveles {
			dicNiveles[n.Guid] = n.ID
		}
	}

	var errores []string

	for _, fila := range listaPrecios {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		// GUID del propio registro sucursal_producto (de la nube)
		var recordGuid uuid.UUID
		if guidVal, ok := fMap["guid"]; ok && guidVal != nil && guidVal != "" {
			if parsedGuid, err := uuid.Parse(fmt.Sprintf("%v", guidVal)); err == nil {
				recordGuid = parsedGuid
			}
		}

		// GUID del nivel de empaque para resolver la FK
		nivelGuid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["nivelGuid"]))
		nivelID, exists := dicNiveles[nivelGuid]
		if !exists || nivelID == 0 {
			// El nivel no existe localmente — sincroniza "Niveles Empaque" primero.
			errores = append(errores, fmt.Sprintf("nivel no encontrado localmente (nivelGuid=%s), sincroniza Niveles Empaque primero", nivelGuid))
			continue
		}

		precioCompra, _ := strconv.ParseFloat(fmt.Sprintf("%v", fMap["precioCompra"]), 64)
		precioVenta, _ := strconv.ParseFloat(fmt.Sprintf("%v", fMap["precioVenta"]), 64)
		porcentajeDescuento, _ := strconv.ParseFloat(fmt.Sprintf("%v", fMap["porcentajeDescuento"]), 64)

		updateData := map[string]any{
			"precio_compra": decimal.NewFromFloat(precioCompra),
			"precio_venta":  decimal.NewFromFloat(precioVenta),
			"precio_venta2": decimal.NewFromFloat(precioVenta),
			"precio_venta3": decimal.NewFromFloat(precioVenta),
			"descuento":     decimal.NewFromFloat(porcentajeDescuento),
			"sync":          true,
		}

		if recordGuid != uuid.Nil {
			updateData["guid"] = recordGuid // normalizar al GUID real de la nube si lo tenemos
		}

		// Actualizar el registro placeholder existente (creado por SaveNivelesEmpaque)
		// buscando por nivel_id. Si no existe, insertar un registro nuevo.
		// Esto garantiza que los precios reales siempre sobreescriben el placeholder con ceros.
		result := r.db.Model(&models.SucursalProducto{}).
			Where("nivel_id = ?", nivelID).
			Updates(updateData)

		if result.Error != nil {
			errores = append(errores, fmt.Sprintf("error actualizando nivel_id=%d: %v", nivelID, result.Error))
			continue
		}

		// Si no había placeholder previo (RowsAffected=0), insertar directamente
		if result.RowsAffected == 0 {
			if recordGuid == uuid.Nil {
				recordGuid = uuid.New()
			}
			sucursalProducto := models.SucursalProducto{
				BaseModel:    models.BaseModel{Guid: recordGuid},
				NivelID:      nivelID,
				PrecioCompra: decimal.NewFromFloat(precioCompra),
				PrecioVenta:  decimal.NewFromFloat(precioVenta),
				PrecioVenta2: decimal.NewFromFloat(precioVenta),
				PrecioVenta3: decimal.NewFromFloat(precioVenta),
				Descuento:    decimal.NewFromFloat(porcentajeDescuento),
				Sync:         true,
			}
			if err := r.db.Create(&sucursalProducto).Error; err != nil {
				errores = append(errores, fmt.Sprintf("error insertando guid=%s: %v", recordGuid, err))
			}
		}
	}

	if len(errores) > 0 {
		return fmt.Errorf("sync lista precios completada con %d advertencias: %s", len(errores), errores[0])
	}
	return nil
}
