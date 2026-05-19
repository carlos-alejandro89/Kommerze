package migrations

import "gorm.io/gorm"

// SeedCatalogos inserta los catálogos base necesarios para el funcionamiento
// del POS. Usa INSERT ... ON CONFLICT DO NOTHING para ser completamente idempotente.
func SeedCatalogos(db *gorm.DB) error {
	sqls := []string{
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

		// ── Cliente genérico (público general) ──────────────────────────────
		`INSERT INTO clientes (id, razon_social, correo, telefono) VALUES
			(1, 'Público General', 'publico@kommerze.com', '0000000000')
		ON CONFLICT (id) DO NOTHING`,

		// Reiniciar las secuencias de las tablas para que el SERIAL no colisione
		// con los IDs que acabamos de insertar manualmente.
		`SELECT setval('estatus_id_seq',        (SELECT MAX(id) FROM estatus))`,
		`SELECT setval('tipos_pedido_id_seq',   (SELECT MAX(id) FROM tipos_pedido))`,
		`SELECT setval('clientes_id_seq',       (SELECT MAX(id) FROM clientes))`,
	}

	for _, sql := range sqls {
		if err := db.Exec(sql).Error; err != nil {
			return err
		}
	}
	return nil
}
