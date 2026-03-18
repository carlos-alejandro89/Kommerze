package database

import (
	"BitComercio/internal/database/migrations"
	"log"

	_ "github.com/golang-migrate/migrate/v4/source/file"
	"gorm.io/gorm"

	_ "github.com/lib/pq"
)

func RunMigrations(db *gorm.DB) error {

	if err := migrations.MigrateTables(db); err != nil {
		return err
	}

	if err := migrations.MigrateViews(db); err != nil {
		return err
	}
	/*// Migrar el esquema (crea la tabla automáticamente)
	db.AutoMigrate(

		// Inventarios
		&models.Linea{},
		&models.Marca{},
		&models.Producto{},
		&models.SucursalProducto{},

		// Ventas
		&models.Cliente{},
		&models.TipoPedido{},
		&models.Pedido{},
		&models.PedidoDetalle{},

		// SAT
		&models.SATRegimenFiscal{},
		&models.SATFormaPago{},
		&models.SATMetodoPago{},
		&models.SATUsoCFDI{},

		// Seguridad
		&models.Perfil{},
		&models.Usuario{},
	)*/

	log.Println("✅ Migrations ejecutadas correctamente")
	return nil
}
