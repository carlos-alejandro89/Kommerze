package migrations

import "gorm.io/gorm"

// SeedCatalogos inserta los catálogos base necesarios para el funcionamiento
// del POS. Usa INSERT ... ON CONFLICT DO NOTHING para ser completamente idempotente.
func SeedCatalogos(db *gorm.DB) error {
	sqls := []string{
		// ── Roles fiscales ───────────────────────────────────────────────────
		`INSERT INTO roles_fiscales (id, nombre) VALUES
			(1, 'RECEPTOR'),
			(2, 'PROVEEDOR'),
			(3, 'ACREEDOR')
		 ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre`,
		// ── Estatus de pedido ────────────────────────────────────────────────
		`INSERT INTO estatus (id, nombre) VALUES
			(1, 'Pendiente'),
			(2, 'Completado'),
			(3, 'Cancelado'),
			(4, 'En proceso')
		ON CONFLICT (id) DO NOTHING`,

		// ── Tipos de pedido ──────────────────────────────────────────────────
		`INSERT INTO tipos_pedido (id, nombre, descripcion) VALUES
			(1, 'Venta',          'Venta directa al cliente con cobro inmediato'),
			(2, 'Cotización',     'Documento de cotización sin afectar existencias'),
			(3, 'Transferencia',  'Movimiento de mercancía entre sucursales')
		ON CONFLICT (id) DO NOTHING`,

		// ── Solicitudes de productos ─────────────────────────────────────────
		`UPDATE tipos_pedido
		 SET guid = 'f1b2c3d4-e5f6-4a7b-8c9d-012345678903'
		 WHERE nombre = 'Transferencia'
		   AND NOT EXISTS (
		     SELECT 1 FROM tipos_pedido
		     WHERE guid = 'f1b2c3d4-e5f6-4a7b-8c9d-012345678903'
		   )`,
		`INSERT INTO tipos_pedido (guid, nombre, descripcion)
		 SELECT '7a117386-2369-4fce-b2e7-b1dbd38ecf58', 'Baja de mercancía',
		        'Salida definitiva de mercancía del inventario'
		 WHERE NOT EXISTS (
		   SELECT 1 FROM tipos_pedido
		   WHERE guid = '7a117386-2369-4fce-b2e7-b1dbd38ecf58'
		      OR nombre = 'Baja de mercancía'
		 )`,
		`UPDATE tipos_pedido
		 SET guid = '7a117386-2369-4fce-b2e7-b1dbd38ecf58'
		 WHERE nombre = 'Baja de mercancía'
		   AND NOT EXISTS (
		     SELECT 1 FROM tipos_pedido
		     WHERE guid = '7a117386-2369-4fce-b2e7-b1dbd38ecf58'
		   )`,
		`INSERT INTO estatus (guid, nombre)
		 SELECT '86968037-975a-43ce-880c-043003010104', 'En Transito'
		 WHERE NOT EXISTS (
		   SELECT 1 FROM estatus
		   WHERE guid = '86968037-975a-43ce-880c-043003010104'
		      OR nombre IN ('En Transito', 'En Tránsito')
		 )`,
		`UPDATE estatus
		 SET guid = '86968037-975a-43ce-880c-043003010104'
		 WHERE nombre IN ('En Transito', 'En Tránsito')
		   AND NOT EXISTS (
		     SELECT 1 FROM estatus
		     WHERE guid = '86968037-975a-43ce-880c-043003010104'
		   )`,

		// ── Cliente genérico (público general) ──────────────────────────────
		`INSERT INTO clientes (id, razon_social, correo, telefono) VALUES
			(1, 'Público General', 'publico@kommerze.com', '0000000000')
		ON CONFLICT (id) DO NOTHING`,

		// Reiniciar las secuencias de las tablas para que el SERIAL no colisione
		// con los IDs que acabamos de insertar manualmente.
		`SELECT setval('estatus_id_seq',        (SELECT MAX(id) FROM estatus))`,
		`SELECT setval('tipos_pedido_id_seq',   (SELECT MAX(id) FROM tipos_pedido))`,
		`SELECT setval('clientes_id_seq',       (SELECT MAX(id) FROM clientes))`,
		`SELECT setval('roles_fiscales_id_seq', (SELECT MAX(id) FROM roles_fiscales))`,
	}

	for _, sql := range sqls {
		if err := db.Exec(sql).Error; err != nil {
			return err
		}
	}
	return nil
}
