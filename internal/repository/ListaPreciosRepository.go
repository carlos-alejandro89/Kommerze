package repository

import (
	"BitComercio/internal/models"
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

		// GUID del propio registro sucursal_producto
		recordGuid, err := uuid.Parse(fmt.Sprintf("%v", fMap["guid"]))
		if err != nil {
			continue // registro inválido, saltar
		}

		// GUID del nivel de empaque para resolver la FK
		nivelGuid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["nivelGuid"]))
		nivelID, exists := dicNiveles[nivelGuid]
		if !exists || nivelID == 0 {
			// El nivel no existe localmente aún — saltar este registro.
			// Sincronizar "Niveles Empaque" primero para resolver la dependencia.
			errores = append(errores, fmt.Sprintf("nivel no encontrado localmente (nivelGuid=%s), sincroniza Niveles Empaque primero", nivelGuid))
			continue
		}

		precioCompra, _ := strconv.ParseFloat(fmt.Sprintf("%v", fMap["precioCompra"]), 64)
		precioVenta, _ := strconv.ParseFloat(fmt.Sprintf("%v", fMap["precioVenta"]), 64)
		porcentajeDescuento, _ := strconv.ParseFloat(fmt.Sprintf("%v", fMap["porcentajeDescuento"]), 64)

		sucursalProducto := models.SucursalProducto{
			BaseModel: models.BaseModel{
				Guid: recordGuid,
			},
			NivelID:      nivelID,
			PrecioCompra: decimal.NewFromFloat(precioCompra),
			PrecioVenta:  decimal.NewFromFloat(precioVenta),
			PrecioVenta2: decimal.NewFromFloat(precioVenta),
			PrecioVenta3: decimal.NewFromFloat(precioVenta),
			Descuento:    decimal.NewFromFloat(porcentajeDescuento),
			Sync:         true,
		}

		if err := r.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "guid"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"nivel_id",
				"precio_compra",
				"precio_venta",
				"precio_venta2",
				"precio_venta3",
				"descuento",
				"sync",
			}),
		}).Create(&sucursalProducto).Error; err != nil {
			errores = append(errores, fmt.Sprintf("error insertando guid=%s: %v", recordGuid, err))
		}
	}

	if len(errores) > 0 {
		return fmt.Errorf("sync lista precios completada con %d advertencias: %s", len(errores), errores[0])
	}
	return nil
}
