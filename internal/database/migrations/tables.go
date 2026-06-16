package migrations

import (
	"BitComercio/internal/models"

	"gorm.io/gorm"
)

func MigrateTables(db *gorm.DB) error {
	return db.AutoMigrate(
		// Catálogos SAT
		&models.SATRegimenFiscal{},
		&models.SATFormaPago{},
		&models.SATMetodoPago{},
		&models.SATUsoCFDI{},
		&models.SATProducto{},

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
		&models.Cliente{},
		&models.ReceptorFiscal{},
		&models.Estatus{},
		&models.TipoPedido{},

		// Operaciones
		&models.OperacionCajero{},
		&models.OperacionSucursal{},
		&models.Pedido{},
		&models.PedidoDetalle{},
		&models.Factura{},
		&models.Pago{},
		&models.Traspaso{},

		// Auditoría
		&models.Auditoria{},
		&models.AuditoriaProducto{},
	)
}

