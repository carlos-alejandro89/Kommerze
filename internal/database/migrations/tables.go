package migrations

import (
	"BitComercio/internal/models"
	"fmt"

	"gorm.io/gorm"
)

func MigrateTables(db *gorm.DB) error {
	// Los catálogos SAT deben existir antes de reparar referencias históricas
	// y antes de que GORM intente crear sus llaves foráneas.
	if err := db.AutoMigrate(
		// Catálogos SAT
		&models.SATRegimenFiscal{},
		&models.SATFormaPago{},
		&models.SATMetodoPago{},
		&models.SATUsoCFDI{},
		&models.SATProducto{},
		&models.SatUnidadesMedida{},
	); err != nil {
		return err
	}

	if err := repairOrphanFiscalRegimenReferences(db); err != nil {
		return err
	}

	return db.AutoMigrate(

		// Configuración / Seguridad
		&models.Empresa{},
		&models.Sucursal{},
		&models.Caja{},
		&models.Perfil{},
		&models.Usuario{},
		&models.TipoAutorizacion{},

		// Inventario / Productos base
		&models.Linea{},
		&models.Marca{},
		&models.Empaque{},
		&models.Producto{},
		&models.NivelEmpaque{},
		&models.SucursalProducto{},

		// Ventas / Clientes
		&models.RolesFiscales{},
		&models.EntidadFiscal{},
		&models.EntidadFiscalRol{},
		&models.Cliente{},
		&models.ClienteEntidadFiscal{},
		&models.Estatus{},
		&models.TipoPedido{},

		// Operaciones
		&models.OperacionCajero{},
		&models.OperacionSucursal{},
		&models.Pedido{},
		&models.PedidoDetalle{},
		&models.Compra{},
		&models.Factura{},
		&models.Pago{},
		&models.Traspaso{},

		// Auditoría
		&models.Auditoria{},
		&models.AuditoriaProducto{},
	)
}

// repairOrphanFiscalRegimenReferences prepara bases existentes antes de que
// AutoMigrate agregue fk_entidades_fiscales_regimen. Una entidad fiscal puede
// permanecer sin régimen, por lo que una referencia histórica inválida se
// convierte en NULL; las referencias válidas se conservan intactas.
func repairOrphanFiscalRegimenReferences(db *gorm.DB) error {
	var tableExists bool
	if err := db.Raw(`SELECT to_regclass('public.entidades_fiscales') IS NOT NULL`).Scan(&tableExists).Error; err != nil {
		return fmt.Errorf("no se pudo comprobar la tabla entidades_fiscales: %w", err)
	}
	if !tableExists {
		return nil
	}

	var columnExists bool
	if err := db.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public'
			  AND table_name = 'entidades_fiscales'
			  AND column_name = 'regimen_id'
		)`).Scan(&columnExists).Error; err != nil {
		return fmt.Errorf("no se pudo comprobar entidades_fiscales.regimen_id: %w", err)
	}
	if !columnExists {
		return nil
	}

	result := db.Exec(`
		UPDATE entidades_fiscales ef
		SET regimen_id = NULL, updated_at = NOW()
		WHERE ef.regimen_id IS NOT NULL
		  AND NOT EXISTS (
			SELECT 1 FROM sat_regimen_fiscal sr WHERE sr.id = ef.regimen_id
		  )`)
	if result.Error != nil {
		return fmt.Errorf("no se pudieron reparar regímenes fiscales huérfanos: %w", result.Error)
	}
	if result.RowsAffected > 0 {
		fmt.Printf("[Migrations] Se limpiaron %d referencias huérfanas de régimen fiscal\n", result.RowsAffected)
	}
	return nil
}
