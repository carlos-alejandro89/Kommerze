package migrations

import "gorm.io/gorm"

// MigrateSequences crea las secuencias de folio si no existen y asegura
// que operacion_cajero_id pueda ser NULL (el POS no siempre requiere caja abierta).
func MigrateSequences(db *gorm.DB) error {
	sqls := []string{
		`CREATE SEQUENCE IF NOT EXISTS consecutivo_folio_pedido START 1`,
		`CREATE SEQUENCE IF NOT EXISTS consecutivo_folio_cotizacion START 1`,
		`CREATE SEQUENCE IF NOT EXISTS consecutivo_folio_transferencia START 1`,
		`CREATE SEQUENCE IF NOT EXISTS consecutivo_folio_baja_mercancia START 1`,
		`CREATE SEQUENCE IF NOT EXISTS consecutivo_folio_compra START 1`,
		`CREATE SEQUENCE IF NOT EXISTS consecutivo_folio_factura START 1`,
		`CREATE SEQUENCE IF NOT EXISTS consecutivo_folio_conversion START 1`,
		`ALTER TABLE pedidos ALTER COLUMN operacion_cajero_id DROP NOT NULL`,
	}
	for _, sql := range sqls {
		if err := db.Exec(sql).Error; err != nil {
			return err
		}
	}
	return nil
}
