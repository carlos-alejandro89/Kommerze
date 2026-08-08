package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// ClientesService provee búsqueda de clientes con acceso directo a la BD.
// En modo Caja, CajaProxyService implementa la misma interfaz via HTTP.
type ClientesService struct {
	db *gorm.DB
}

func clientDigitsOnly(value string) string {
	var result strings.Builder
	for _, char := range value {
		if char >= '0' && char <= '9' {
			result.WriteRune(char)
		}
	}
	return result.String()
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
		SELECT c.id, c.guid, c.razon_social, COALESCE(f.rfc, '') AS rfc, c.correo, c.telefono,
		       credito_maximo, dias_credito
		FROM clientes c
		LEFT JOIN LATERAL (
			SELECT ef.rfc FROM cliente_entidad_fiscal cef
			JOIN entidades_fiscales ef ON ef.id = cef.entidad_fiscal_id AND ef.deleted_at IS NULL
			JOIN entidad_fiscal_roles efr ON efr.entidad_fiscal_id = ef.id AND efr.deleted_at IS NULL
			JOIN roles_fiscales rf ON rf.id = efr.rol_id AND rf.nombre = 'RECEPTOR' AND rf.deleted_at IS NULL
			WHERE cef.cliente_id = c.id AND cef.deleted_at IS NULL ORDER BY cef.id LIMIT 1
		) f ON TRUE
		WHERE c.deleted_at IS NULL
		  AND (c.razon_social ILIKE @p OR COALESCE(f.rfc, '') ILIKE @p OR c.telefono ILIKE @p)
		ORDER BY c.razon_social
		LIMIT 20`,
		sql.Named("p", pattern),
	).Scan(&clientes).Error

	if err != nil {
		return nil, err
	}
	return clientes, nil
}

// ListarClientes devuelve el catálogo completo para el tablero de clientes.
func (s *ClientesService) ListarClientes() ([]dto.ClienteDto, error) {
	var clientes []dto.ClienteDto
	err := s.db.Raw(`
		SELECT c.id, c.guid, c.razon_social, COALESCE(f.rfc, '') AS rfc, c.correo, c.telefono,
		       credito_maximo, dias_credito
		FROM clientes c
		LEFT JOIN LATERAL (
			SELECT ef.rfc FROM cliente_entidad_fiscal cef
			JOIN entidades_fiscales ef ON ef.id = cef.entidad_fiscal_id AND ef.deleted_at IS NULL
			JOIN entidad_fiscal_roles efr ON efr.entidad_fiscal_id = ef.id AND efr.deleted_at IS NULL
			JOIN roles_fiscales rf ON rf.id = efr.rol_id AND rf.nombre = 'RECEPTOR' AND rf.deleted_at IS NULL
			WHERE cef.cliente_id = c.id AND cef.deleted_at IS NULL ORDER BY cef.id LIMIT 1
		) f ON TRUE
		WHERE c.deleted_at IS NULL
		ORDER BY c.razon_social`,
	).Scan(&clientes).Error
	if err != nil {
		return nil, err
	}
	return clientes, nil
}

func (s *ClientesService) ObtenerCliente(guid string) (*dto.ClienteDetalleDto, error) {
	var client dto.ClienteDetalleDto
	if err := s.db.Raw(`SELECT id, guid, razon_social, correo, telefono, whatsapp,
		credito_maximo, dias_credito, puntos FROM clientes WHERE guid = ? AND deleted_at IS NULL`, guid).Scan(&client).Error; err != nil {
		return nil, err
	}
	if client.ID == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	if err := s.db.Raw(`
		SELECT ef.id, ef.guid, ef.regimen_id, COALESCE(sr.clave, '') AS regimen_clave,
		       COALESCE(sr.descripcion, '') AS regimen, ef.razon_social, ef.rfc,
		       ef.codigo_postal, ef.correo, ef.telefono, ef.whatsapp, rf.nombre AS rol_fiscal
		FROM cliente_entidad_fiscal cef
		JOIN entidades_fiscales ef ON ef.id = cef.entidad_fiscal_id AND ef.deleted_at IS NULL
		JOIN entidad_fiscal_roles efr ON efr.entidad_fiscal_id = ef.id AND efr.deleted_at IS NULL
		JOIN roles_fiscales rf ON rf.id = efr.rol_id AND rf.nombre = 'RECEPTOR' AND rf.deleted_at IS NULL
		LEFT JOIN sat_regimen_fiscal sr ON sr.id = ef.regimen_id
		WHERE cef.cliente_id = ? AND cef.deleted_at IS NULL
		ORDER BY cef.id`, client.ID).Scan(&client.EntidadesFiscales).Error; err != nil {
		return nil, err
	}
	return &client, nil
}

func (s *ClientesService) GuardarCliente(datos dto.GuardarClienteDto) (*dto.ClienteDetalleDto, error) {
	if strings.TrimSpace(datos.RazonSocial) == "" {
		return nil, fmt.Errorf("el nombre del cliente es obligatorio")
	}
	var clientGuid string
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var client models.Cliente
		if strings.TrimSpace(datos.Guid) != "" {
			if err := tx.Where("guid = ? AND deleted_at IS NULL", datos.Guid).First(&client).Error; err != nil {
				return err
			}
		}
		client.RazonSocial = strings.TrimSpace(datos.RazonSocial)
		client.Correo = strings.TrimSpace(datos.Correo)
		client.Telefono = clientDigitsOnly(datos.Telefono)
		client.Whatsapp = clientDigitsOnly(datos.Whatsapp)
		client.CreditoMaximo = decimal.NewFromFloat(datos.CreditoMaximo)
		client.DiasCredito = datos.DiasCredito
		client.Puntos = datos.Puntos
		if client.ID == 0 {
			if err := tx.Create(&client).Error; err != nil {
				return err
			}
		} else if err := tx.Save(&client).Error; err != nil {
			return err
		}
		clientGuid = client.Guid.String()

		var receptor models.RolesFiscales
		if err := tx.Where("nombre = ? AND deleted_at IS NULL", "RECEPTOR").First(&receptor).Error; err != nil {
			return fmt.Errorf("rol fiscal RECEPTOR no disponible: %w", err)
		}
		keep := make([]uint, 0, len(datos.EntidadesFiscales))
		for _, item := range datos.EntidadesFiscales {
			rfc := normalizeRFC(item.RFC)
			if strings.TrimSpace(item.RazonSocial) == "" || rfc == "" {
				return fmt.Errorf("razón social y RFC son obligatorios en cada dato fiscal")
			}
			if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext(?))", rfc).Error; err != nil {
				return err
			}
			var entity models.EntidadFiscal
			shouldUpdate := false
			if strings.TrimSpace(item.Guid) != "" {
				parsed, err := uuid.Parse(item.Guid)
				if err != nil {
					return fmt.Errorf("identificador fiscal inválido")
				}
				if err := tx.Where("guid = ? AND deleted_at IS NULL", parsed).First(&entity).Error; err != nil {
					return err
				}
				var existingLink int64
				if err := tx.Model(&models.ClienteEntidadFiscal{}).
					Where("cliente_id = ? AND entidad_fiscal_id = ? AND deleted_at IS NULL", client.ID, entity.ID).
					Count(&existingLink).Error; err != nil {
					return err
				}
				// Solo el cliente que ya tenía vinculada esta entidad puede editarla.
				// Cuando proviene de otro cliente/proveedor se conserva intacta.
				shouldUpdate = existingLink > 0
			} else if err := tx.Where("UPPER(rfc) = ? AND deleted_at IS NULL", rfc).First(&entity).Error; err != nil && err != gorm.ErrRecordNotFound {
				return err
			}
			if entity.ID == 0 {
				entity.RegimenID = item.RegimenID
				entity.RazonSocial = strings.TrimSpace(item.RazonSocial)
				entity.RFC = rfc
				entity.CodigoPostal = clientDigitsOnly(item.CodigoPostal)
				entity.Correo = strings.TrimSpace(item.Correo)
				entity.Telefono = clientDigitsOnly(item.Telefono)
				entity.Whatsapp = clientDigitsOnly(item.Whatsapp)
				if err := tx.Create(&entity).Error; err != nil {
					return err
				}
			} else if shouldUpdate {
				entity.RegimenID = item.RegimenID
				entity.RazonSocial = strings.TrimSpace(item.RazonSocial)
				entity.RFC = rfc
				entity.CodigoPostal = clientDigitsOnly(item.CodigoPostal)
				entity.Correo = strings.TrimSpace(item.Correo)
				entity.Telefono = clientDigitsOnly(item.Telefono)
				entity.Whatsapp = clientDigitsOnly(item.Whatsapp)
				if err := tx.Save(&entity).Error; err != nil {
					return err
				}
			}
			keep = append(keep, entity.ID)
			if err := tx.Where("cliente_id = ? AND entidad_fiscal_id = ?", client.ID, entity.ID).
				FirstOrCreate(&models.ClienteEntidadFiscal{ClienteID: client.ID, EntidadFiscalID: entity.ID}).Error; err != nil {
				return err
			}
			if err := tx.Where("entidad_fiscal_id = ? AND rol_id = ?", entity.ID, receptor.ID).
				FirstOrCreate(&models.EntidadFiscalRol{EntidadFiscalID: entity.ID, RolID: receptor.ID}).Error; err != nil {
				return err
			}
		}
		links := tx.Where("cliente_id = ?", client.ID)
		if len(keep) > 0 {
			links = links.Where("entidad_fiscal_id NOT IN ?", keep)
		}
		return links.Delete(&models.ClienteEntidadFiscal{}).Error
	})
	if err != nil {
		return nil, err
	}
	return s.ObtenerCliente(clientGuid)
}
