package migrations

import (
	"BitComercio/internal/models"

	"gorm.io/gorm"
)

func MigrateTables(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Linea{},
		&models.Marca{},
		&models.Producto{},
		&models.SucursalProducto{},
		&models.Cliente{},
		&models.TipoPedido{},
		&models.Pedido{},
		&models.PedidoDetalle{},
		&models.SATRegimenFiscal{},
		&models.SATFormaPago{},
		&models.SATMetodoPago{},
		&models.SATUsoCFDI{},
		&models.Perfil{},
		&models.Usuario{},
	)
}
