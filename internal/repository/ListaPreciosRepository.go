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
	//var sucursal models.Sucursal
	//r.db.Where("guid = ?", sucursalGuid).First(&sucursal)

	var dicNiveles = make(map[uuid.UUID]uint)
	var niveles []models.NivelEmpaque
	if err := r.db.Find(&niveles).Error; err == nil {
		for _, n := range niveles {
			dicNiveles[n.Guid] = n.ID
		}
	}

	for _, fila := range listaPrecios {
		fMap, ok := fila.(map[string]any)
		if !ok {
			continue
		}

		guid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["nivelGuid"]))
		//productoGuid, _ := uuid.Parse(fmt.Sprintf("%v", fMap["productoGuid"]))
		precioCompra, _ := strconv.ParseFloat(fmt.Sprintf("%v", fMap["precioCompra"]), 64)
		precioVenta, _ := strconv.ParseFloat(fmt.Sprintf("%v", fMap["precioVenta"]), 64)
		porcentajeDescuento, _ := strconv.ParseFloat(fmt.Sprintf("%v", fMap["porcentajeDescuento"]), 64)

		sucursalProducto := models.SucursalProducto{
			BaseModel: models.BaseModel{
				Guid: guid,
			},

			NivelID:      dicNiveles[guid],
			PrecioCompra: decimal.NewFromFloat(precioCompra),
			PrecioVenta:  decimal.NewFromFloat(precioVenta),
			PrecioVenta2: decimal.NewFromFloat(precioVenta),
			PrecioVenta3: decimal.NewFromFloat(precioVenta),
			Descuento:    decimal.NewFromFloat(porcentajeDescuento),
			Sync:         true,
		}
		/*if err := r.db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "guid"}}, UpdateAll: true}).Create(&sucursalProducto).Error; err != nil {
			return fmt.Errorf("error insertando sucursal_producto: %w", err)
		}*/
		if err := r.db.Clauses(clause.OnConflict{
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
			return err
		}
	}
	return nil
}
