package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"bytes"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type importDecimal struct {
	decimal.Decimal
}

func (d *importDecimal) UnmarshalJSON(data []byte) error {
	data = bytes.TrimSpace(data)
	if bytes.Equal(data, []byte("null")) || len(data) == 0 {
		d.Decimal = decimal.Zero
		return nil
	}

	var raw string
	if len(data) >= 2 && data[0] == '"' {
		if err := json.Unmarshal(data, &raw); err != nil {
			return err
		}
	} else {
		raw = string(data)
	}

	raw = strings.TrimSpace(raw)
	if raw == "" {
		d.Decimal = decimal.Zero
		return nil
	}

	value, err := decimal.NewFromString(raw)
	if err != nil {
		return err
	}
	d.Decimal = value
	return nil
}

type inventarioImportItem struct {
	Codigo       string        `json:"CODIGO"`
	Existencia   importDecimal `json:"EXISTENCIA"`
	PrecioCompra importDecimal `json:"PCOSTO"`
	PrecioVenta  importDecimal `json:"PVENTA"`
	PrecioVenta2 importDecimal `json:"PVENTA2"`
	PrecioVenta3 importDecimal `json:"PVENTA3"`
	Descuento    importDecimal `json:"DESCUENTO"`
	Minimo       importDecimal `json:"MINIMO"`
	Maximo       importDecimal `json:"MAXIMO"`
}

func precioVentaConIVA(precio decimal.Decimal) decimal.Decimal {
	return precio.Mul(decimal.NewFromInt(116)).Div(decimal.NewFromInt(100)).Round(6)
}

type InventarioRepository struct {
	db *gorm.DB
}

func NewInventarioRepository(db *gorm.DB) *InventarioRepository {
	return &InventarioRepository{db: db}
}

func (i *InventarioRepository) ImportarInventario(inventario string) *dto.ResponseDto {
	if i.db == nil {
		return dto.NewResponseDto(false, "Repositorio de inventario no disponible", nil, []string{"db no inicializada"})
	}

	diccionarioNiveles := make(map[string]uint)
	var niveles []models.NivelEmpaque
	if err := i.db.Find(&niveles).Error; err != nil {
		return dto.NewResponseDto(false, "Error al consultar niveles de empaque", nil, []string{err.Error()})
	}
	for _, nivel := range niveles {
		diccionarioNiveles[nivel.Codigo] = nivel.ID
	}

	var data []inventarioImportItem
	if err := json.Unmarshal([]byte(inventario), &data); err != nil {
		return dto.NewResponseDto(false, "Error al decodificar el inventario", nil, []string{err.Error()})
	}

	type importResult struct {
		Total        int      `json:"total"`
		Insertados   int      `json:"insertados"`
		Actualizados int      `json:"actualizados"`
		Omitidos     int      `json:"omitidos"`
		Errores      []string `json:"errores"`
	}

	resultado := importResult{Total: len(data)}

	err := i.db.Transaction(func(tx *gorm.DB) error {
		for index, item := range data {
			if item.Codigo == "" {
				resultado.Omitidos++
				resultado.Errores = append(resultado.Errores, fmt.Sprintf("item %d: codigo vacio", index+1))
				continue
			}

			nivelID, ok := diccionarioNiveles[item.Codigo]
			if !ok {
				resultado.Omitidos++
				resultado.Errores = append(resultado.Errores, fmt.Sprintf("codigo %s: no existe nivel_empaque", item.Codigo))
				continue
			}

			values := map[string]any{
				"precio_compra": item.PrecioCompra.Decimal,
				"precio_venta":  precioVentaConIVA(item.PrecioVenta.Decimal),
				"precio_venta2": precioVentaConIVA(item.PrecioVenta2.Decimal),
				"precio_venta3": precioVentaConIVA(item.PrecioVenta3.Decimal),
				"descuento":     item.Descuento.Decimal,
				"existencia":    item.Existencia.Decimal,
				"minimo":        item.Minimo.Decimal,
				"maximo":        item.Maximo.Decimal,
				"sync":          false,
			}

			update := tx.Model(&models.SucursalProducto{}).
				Where("nivel_id = ?", nivelID).
				Updates(values)
			if update.Error != nil {
				return fmt.Errorf("actualizando codigo %s: %w", item.Codigo, update.Error)
			}
			if update.RowsAffected > 0 {
				resultado.Actualizados++
				continue
			}

			producto := models.SucursalProducto{
				NivelID:      nivelID,
				Existencia:   item.Existencia.Decimal,
				PrecioCompra: item.PrecioCompra.Decimal,
				PrecioVenta:  precioVentaConIVA(item.PrecioVenta.Decimal),
				PrecioVenta2: precioVentaConIVA(item.PrecioVenta2.Decimal),
				PrecioVenta3: precioVentaConIVA(item.PrecioVenta3.Decimal),
				Descuento:    item.Descuento.Decimal,
				Minimo:       item.Minimo.Decimal,
				Maximo:       item.Maximo.Decimal,
				Sync:         false,
			}
			if err := tx.Create(&producto).Error; err != nil {
				return fmt.Errorf("insertando codigo %s: %w", item.Codigo, err)
			}
			resultado.Insertados++
		}
		return nil
	})
	if err != nil {
		return dto.NewResponseDto(false, "Error al importar inventario", resultado, []string{err.Error()})
	}

	return dto.NewResponseDto(true, "Inventario importado correctamente", resultado, resultado.Errores)
}
