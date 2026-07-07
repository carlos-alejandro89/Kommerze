package builders

import (
	"BitComercio/internal/usecases/reports/models"
	"bytes"
	"fmt"
)

func RenderReceiptEcpPos(r models.Receipt) []byte {
	var b bytes.Buffer

	// Inicializar impresora
	b.Write([]byte{0x1B, 0x40})

	// Centrar
	b.Write([]byte{0x1B, 0x61, 0x01})
	b.WriteString("Tiendas Sayer\n")
	b.WriteString("PUNTO DE VENTA\n")
	b.WriteString("--------------------------------\n")

	b.WriteString(fmt.Sprintf("Sucursal: %s\n", r.Sucursal))
	b.WriteString(fmt.Sprintf("Folio: %s\n", r.Folio))
	b.WriteString(fmt.Sprintf("Fecha: %s\n", r.Fecha.Format("02/01/2006 15:04")))
	b.WriteString(fmt.Sprintf("Cajero: %s\n", r.Cajero))
	b.WriteString("--------------------------------\n")

	// Alinear izquierda
	b.Write([]byte{0x1B, 0x61, 0x00})

	for _, item := range r.Items {
		b.WriteString(fmt.Sprintf("%s\n", item.Descripcion))
		b.WriteString(fmt.Sprintf(
			"%.2f x $%.2f = $%.2f\n",
			item.Cantidad,
			item.Precio,
			item.Importe,
		))
	}

	b.WriteString("--------------------------------\n")

	// Alinear derecha
	b.Write([]byte{0x1B, 0x61, 0x02})
	b.WriteString(fmt.Sprintf("Subtotal: $%.2f\n", r.Subtotal))
	b.WriteString(fmt.Sprintf("Descuento: $%.2f\n", r.Descuento))
	b.WriteString(fmt.Sprintf("TOTAL: $%.2f\n", r.Total))
	b.WriteString(fmt.Sprintf("Pago: $%.2f\n", r.Pago))
	b.WriteString(fmt.Sprintf("Cambio: $%.2f\n", r.Cambio))

	// Centrar
	b.Write([]byte{0x1B, 0x61, 0x01})
	b.WriteString("--------------------------------\n")
	b.WriteString("Gracias por su compra\n")
	b.WriteString("www.kommerze.mx\n\n\n")

	// Corte parcial
	b.Write([]byte{0x1D, 0x56, 0x01})

	return b.Bytes()
}
