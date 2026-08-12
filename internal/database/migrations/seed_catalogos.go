package migrations

import "gorm.io/gorm"

// SeedCatalogos conserva únicamente datos estrictamente locales del POS.
// Los catálogos roles_fiscales, tipos_pedido y estatus provienen exclusivamente
// del API mediante el módulo Sync y no deben insertarse desde este seeder.
func SeedCatalogos(db *gorm.DB) error {
	sqls := []string{
		// ── Cliente genérico (público general) ──────────────────────────────

	}

	for _, sql := range sqls {
		if err := db.Exec(sql).Error; err != nil {
			return err
		}
	}
	return nil
}
