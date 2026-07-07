package builders

import (
	"BitComercio/internal/usecases/reports/models"
)

type ReceiptBuilder struct {
	/*ventaRepository   VentaRepository
	empresaRepository EmpresaRepository*/
}

func NewReceiptBuilder( /*ventaRepo VentaRepository, empresaRepo EmpresaRepository*/ ) *ReceiptBuilder {

	return &ReceiptBuilder{
		/*ventaRepository:   ventaRepo,
		empresaRepository: empresaRepo,*/
	}
}

func (b *ReceiptBuilder) Build(ventaGuid string) (models.Receipt, error) {

	/*venta, err := b.ventaRepository.ObtenerVenta(ventaGuid)
	if err != nil {
		return models.Receipt{}, err
	}

	items, err := b.ventaRepository.ObtenerItems(ventaGuid)
	if err != nil {
		return models.Receipt{}, err
	}*/

	receipt := models.Receipt{
		/*Folio:    venta.Folio,
		Cajero:   venta.Cajero,
		Sucursal: venta.Sucursal,
		Fecha:    venta.Fecha,
		Items:    items,
		Total:    venta.Total,*/
	}

	return receipt, nil
}
