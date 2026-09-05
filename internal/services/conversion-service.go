package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ConversionService struct{ db *gorm.DB }

func NewConversionService(db *gorm.DB) *ConversionService { return &ConversionService{db: db} }

func (s *ConversionService) ConsultarProductos(busqueda string) ([]dto.ConversionProductoDto, error) {
	var productos []dto.ConversionProductoDto
	termino := "%" + strings.TrimSpace(busqueda) + "%"
	err := s.db.Raw(`
		SELECT DISTINCT
			r.id AS regla_id, r.guid::text AS regla_guid,
			nv.id AS nivel_origen_id, nv.guid::text AS nivel_origen_guid,
			COALESCE(nv.codigo, '') AS codigo_origen,
			COALESCE(p.descripcion, '') AS producto_origen,
			COALESCE(e.empaque, '') AS empaque_origen,
			COALESCE(e.contenido, 0) AS contenido_origen,
			COALESCE(uo.nombre_unidad, '') AS unidad_origen,
			COALESCE(nv.img_referencia, '') AS imagen_origen,
			sp.existencia AS existencia_origen,
			nvb.id AS nivel_destino_id, nvb.guid::text AS nivel_destino_guid,
			COALESCE(nvb.codigo, '') AS codigo_destino,
			COALESCE(pb.descripcion, '') AS producto_destino,
			COALESCE(eb.empaque, '') AS empaque_destino,
			COALESCE(eb.contenido, 0) AS contenido_destino,
			COALESCE(ud.nombre_unidad, '') AS unidad_destino,
			COALESCE(nvb.img_referencia, '') AS imagen_destino,
			spd.existencia AS existencia_destino,
			r.factor_sugerido, r.factor_conversion
		FROM reglas_conversion_producto r
		INNER JOIN nivel_empaque nv ON nv.id = r.nivel_empaque_origen_id
		INNER JOIN sucursal_producto sp ON sp.nivel_id = nv.id
		INNER JOIN productos p ON p.id = nv.producto_id
		INNER JOIN empaques e ON e.id = nv.empaque_id
		INNER JOIN productos pb ON pb.id = p.producto_base_id
		INNER JOIN nivel_empaque nvb ON nvb.id = r.nivel_empaque_destino_id AND nvb.producto_id = pb.id
		INNER JOIN sucursal_producto spd ON spd.nivel_id = nvb.id
		INNER JOIN empaques eb ON eb.id = nvb.empaque_id
		LEFT JOIN sat_unidades_medida uo ON uo.id = e.unidad_sat_id
		LEFT JOIN sat_unidades_medida ud ON ud.id = eb.unidad_sat_id
		WHERE r.activo = TRUE AND p.fraccionable = TRUE AND p.producto_base_id > 0
		  AND nv.activo = TRUE AND nvb.activo = TRUE
		  AND r.deleted_at IS NULL AND p.deleted_at IS NULL AND pb.deleted_at IS NULL
		  AND nv.deleted_at IS NULL AND nvb.deleted_at IS NULL
		  AND sp.deleted_at IS NULL AND spd.deleted_at IS NULL
		  AND (p.descripcion ILIKE ? OR nv.codigo ILIKE ? OR pb.descripcion ILIKE ? OR nvb.codigo ILIKE ?)
		ORDER BY producto_origen, empaque_origen, producto_destino, empaque_destino
	`, termino, termino, termino, termino).Scan(&productos).Error
	return productos, err
}

func (s *ConversionService) EjecutarConversion(datos dto.EjecutarConversionDto) (*dto.ResultadoConversionDto, error) {
	reglaGuid, err := uuid.Parse(strings.TrimSpace(datos.ReglaGuid))
	if err != nil {
		return nil, fmt.Errorf("la regla de conversión no es válida")
	}
	cantidad := decimal.NewFromFloat(datos.Cantidad)
	if cantidad.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("la cantidad a convertir debe ser mayor que cero")
	}

	var regla models.ReglaConversionProducto
	if err := s.db.Preload("NivelEmpaqueOrigen.Producto").Preload("NivelEmpaqueDestino.Producto").Where("guid = ? AND activo = TRUE", reglaGuid).First(&regla).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("la regla de conversión ya no está disponible")
		}
		return nil, err
	}
	if !regla.NivelEmpaqueOrigen.Producto.Fraccionable || regla.NivelEmpaqueOrigen.Producto.ProductoBaseId != int(regla.NivelEmpaqueDestino.ProductoID) {
		return nil, fmt.Errorf("la ruta de conversión configurada no es válida para este producto")
	}

	resultado := &dto.ResultadoConversionDto{}
	err = s.db.Transaction(func(tx *gorm.DB) error {
		var origen, destino models.SucursalProducto
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("nivel_id = ?", regla.NivelEmpaqueOrigenID).First(&origen).Error; err != nil {
			return fmt.Errorf("no se encontró la existencia del producto origen")
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("nivel_id = ?", regla.NivelEmpaqueDestinoID).First(&destino).Error; err != nil {
			return fmt.Errorf("no se encontró la existencia del producto destino")
		}
		if origen.Existencia.LessThan(cantidad) {
			return fmt.Errorf("existencia insuficiente: hay %s unidades disponibles y solicitaste %s", origen.Existencia.String(), cantidad.String())
		}

		cantidadDestino := cantidad.Mul(regla.FactorConversion)
		origen.Existencia = origen.Existencia.Sub(cantidad)
		destino.Existencia = destino.Existencia.Add(cantidadDestino)
		if err := tx.Model(&origen).Updates(map[string]any{"existencia": origen.Existencia, "sync": false}).Error; err != nil {
			return fmt.Errorf("no se pudo descontar la existencia origen: %w", err)
		}
		if err := tx.Model(&destino).Updates(map[string]any{"existencia": destino.Existencia, "sync": false}).Error; err != nil {
			return fmt.Errorf("no se pudo incrementar la existencia destino: %w", err)
		}
		*resultado = dto.ResultadoConversionDto{CantidadOrigen: cantidad, CantidadDestino: cantidadDestino, ExistenciaOrigen: origen.Existencia, ExistenciaDestino: destino.Existencia}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return resultado, nil
}
