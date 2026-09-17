package models

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"

	"gorm.io/gorm"
)

// AsignarCodigoFacturacion conserva el código en reintentos y evita caracteres
// ambiguos para facilitar su captura por el cliente.
func (p *Pedido) AsignarCodigoFacturacion(tx *gorm.DB) error {
	if strings.TrimSpace(p.CodigoFacturacion) != "" {
		return nil
	}
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	limit := big.NewInt(int64(len(alphabet)))
	for attempt := 0; attempt < 10; attempt++ {
		var code [8]byte
		for i := range code {
			index, err := rand.Int(rand.Reader, limit)
			if err != nil {
				return fmt.Errorf("no se pudo generar el código de facturación: %w", err)
			}
			code[i] = alphabet[index.Int64()]
		}
		var count int64
		if err := tx.Unscoped().Model(&Pedido{}).Where("codigo_facturacion = ?", string(code[:])).Count(&count).Error; err != nil {
			return fmt.Errorf("no se pudo verificar el código de facturación: %w", err)
		}
		if count == 0 {
			p.CodigoFacturacion = string(code[:])
			return nil
		}
	}
	return fmt.Errorf("no se pudo obtener un código de facturación disponible")
}
