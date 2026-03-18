package migrations

import "gorm.io/gorm"

func MigrateViews(db *gorm.DB) error {
	return db.Exec(`
		CREATE OR REPLACE VIEW vw_inventario_productos AS
		SELECT 
			nv.codigo,
			p.descripcion,
			e.empaque,
			e.contenido,
			p.fraccionable,
			nv.codigo_barra,
			nv.img_referencia,
			sp.nivel_id,
			p.informacion_producto,
			p.caracteristicas,
			p.instrucciones_uso,
			sp.precio_compra,
			sp.precio_venta,
			sp.precio_venta2,
			sp.descuento,
			sp.existencia,
			nvb.codigo AS codigo_base,
			spb.existencia AS existencia_base,
			CASE 
				WHEN e.contenido > 0 
				THEN (1.0 / e.contenido) * spb.existencia 
				ELSE 0 
			END AS existencia_fraccion,
			nv.guid,
			nvb.guid as guid_base,
			pb.guid AS producto_base_guid,
			p.guid AS producto_guid
		FROM sucursal_producto sp
		JOIN nivel_empaque nv ON sp.nivel_id = nv.id
		JOIN empaques e ON nv.empaque_id = e.id
		JOIN productos p ON nv.producto_id = p.id
		LEFT JOIN productos pb ON p.producto_base_id = pb.id
		LEFT JOIN nivel_empaque nvb 
			ON nvb.producto_id = pb.id 
			AND nvb.empaque_id IN (1,8)
		LEFT JOIN empaques eb ON nvb.empaque_id = eb.id
		LEFT JOIN sucursal_producto spb ON spb.nivel_id = nvb.id
	`).Error
}
