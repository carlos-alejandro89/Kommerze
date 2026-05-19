package services

import (
	"BitComercio/internal/repository/dto"
	"database/sql"

	"gorm.io/gorm"
)

// ClientesService provee búsqueda de clientes con acceso directo a la BD.
// En modo Caja, CajaProxyService implementa la misma interfaz via HTTP.
type ClientesService struct {
	db *gorm.DB
}

func NewClientesService(db *gorm.DB) *ClientesService {
	return &ClientesService{db: db}
}

// BuscarClientes devuelve los clientes cuya razón social, RFC o teléfono
// coincidan con el término de búsqueda q. Retorna hasta 20 resultados.
func (s *ClientesService) BuscarClientes(q string) ([]dto.ClienteDto, error) {
	var clientes []dto.ClienteDto

	pattern := "%" + q + "%"
	err := s.db.Raw(`
		SELECT id, guid, razon_social, rfc, correo, telefono
		FROM clientes
		WHERE deleted_at IS NULL
		  AND (razon_social ILIKE @p OR rfc ILIKE @p OR telefono ILIKE @p)
		ORDER BY razon_social
		LIMIT 20`,
		sql.Named("p", pattern),
	).Scan(&clientes).Error

	if err != nil {
		return nil, err
	}
	return clientes, nil
}
