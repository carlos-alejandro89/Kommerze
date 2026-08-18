package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// ClientesService provee búsqueda de clientes con acceso directo a la BD.
// En modo Caja, CajaProxyService implementa la misma interfaz via HTTP.
type ClientesService struct {
	db         *gorm.DB
	apiBaseURL string
	cloud      *CloudHttpClient
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

func NewClientesService(db *gorm.DB, apiBaseURL string, cloud *CloudHttpClient) *ClientesService {
	return &ClientesService{db: db, apiBaseURL: strings.TrimRight(apiBaseURL, "/"), cloud: cloud}
}

type cloudRegimenFiscal struct {
	Clave       string `json:"clave"`
	Descripcion string `json:"descripcion"`
}
type cloudEntidadFiscal struct {
	Guid         string              `json:"guid"`
	RegimenID    *uint               `json:"regimenID"`
	Regimen      *cloudRegimenFiscal `json:"regimen"`
	RazonSocial  string              `json:"razonSocial"`
	RFC          string              `json:"rfc"`
	CodigoPostal string              `json:"codigoPostal"`
	Correo       string              `json:"correo"`
	Telefono     string              `json:"telefono"`
	Whatsapp     string              `json:"whatsapp"`
}
type cloudClienteFiscal struct {
	Guid              string               `json:"guid"`
	RazonSocial       string               `json:"razonSocial"`
	Correo            string               `json:"correo"`
	Telefono          string               `json:"telefono"`
	CreditoMaximo     float64              `json:"creditoMaximo"`
	DiasCredito       int                  `json:"diasCredito"`
	EntidadesFiscales []cloudEntidadFiscal `json:"entidadesFiscales"`
}
type cloudAPIResponse[T any] struct {
	Success bool   `json:"success"`
	Mensaje string `json:"mensaje"`
	Data    T      `json:"data"`
}

func (s *ClientesService) ConsultarEntidadFiscalCloud(rfc string) (*dto.ProveedorFiscalDto, error) {
	rfc = normalizeRFC(rfc)
	resp, err := s.cloud.Get(fmt.Sprintf("%s/clientes/entidad-fiscal/consultar/%s", s.apiBaseURL, url.PathEscape(rfc)))
	if err != nil {
		return nil, fmt.Errorf("no fue posible consultar la entidad fiscal en la nube: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	var result cloudAPIResponse[*cloudEntidadFiscal]
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("respuesta inválida del API: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 || !result.Success {
		return nil, fmt.Errorf("%s", strings.TrimSpace(result.Mensaje))
	}
	if result.Data == nil {
		return nil, nil
	}
	item := result.Data
	entity := &dto.ProveedorFiscalDto{Guid: item.Guid, RegimenID: item.RegimenID, RazonSocial: item.RazonSocial, RFC: item.RFC, CodigoPostal: item.CodigoPostal, Correo: item.Correo, Telefono: item.Telefono, Whatsapp: item.Whatsapp}
	if item.Regimen != nil {
		entity.RegimenClave, entity.Regimen = item.Regimen.Clave, item.Regimen.Descripcion
	}
	return entity, nil
}

func (s *ClientesService) crearClienteCloud(datos dto.GuardarClienteDto) (*cloudClienteFiscal, error) {
	payload, err := json.Marshal(datos)
	if err != nil {
		return nil, err
	}
	resp, err := s.cloud.Post(s.apiBaseURL+"/clientes/crear", "application/json", bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("no fue posible crear el cliente en la nube: %w", err)
	}
	defer resp.Body.Close()
	var result cloudAPIResponse[*cloudClienteFiscal]
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("respuesta inválida del API: %w (%s)", err, strings.TrimSpace(string(body)))
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 || !result.Success || result.Data == nil {
		message := strings.TrimSpace(result.Mensaje)
		if message == "" {
			message = fmt.Sprintf("API respondió HTTP %d", resp.StatusCode)
		}
		return nil, fmt.Errorf("%s", message)
	}
	return result.Data, nil
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
		  AND (c.razon_social ILIKE @p OR COALESCE(f.rfc, '') ILIKE @p
		       OR c.telefono ILIKE @p OR c.whatsapp ILIKE @p OR c.correo ILIKE @p)
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
	// El GUID nace en el POS y funciona como llave idempotente ante reintentos.
	if strings.TrimSpace(datos.Guid) == "" {
		datos.Guid = uuid.NewString()
	}
	for index := range datos.EntidadesFiscales {
		var role models.RolesFiscales
		if err := s.db.Where("nombre = ? AND deleted_at IS NULL", "RECEPTOR").First(&role).Error; err != nil {
			return nil, fmt.Errorf("sincronice el catálogo de Roles fiscales: %w", err)
		}
		datos.EntidadesFiscales[index].RolFiscalGuid = role.Guid.String()
		if strings.TrimSpace(datos.EntidadesFiscales[index].Guid) == "" {
			datos.EntidadesFiscales[index].Guid = uuid.NewString()
		}
	}
	remote, err := s.crearClienteCloud(datos)
	if err != nil {
		return nil, fmt.Errorf("el cliente no se guardó localmente porque falló la creación en el API: %w", err)
	}
	datos.Guid = remote.Guid
	for index := range datos.EntidadesFiscales {
		for _, entity := range remote.EntidadesFiscales {
			if normalizeRFC(entity.RFC) == normalizeRFC(datos.EntidadesFiscales[index].RFC) {
				datos.EntidadesFiscales[index].Guid = entity.Guid
				break
			}
		}
	}
	var clientGuid string
	err = s.db.Transaction(func(tx *gorm.DB) error {
		var client models.Cliente
		if strings.TrimSpace(datos.Guid) != "" {
			findErr := tx.Where("guid = ? AND deleted_at IS NULL", datos.Guid).First(&client).Error
			if findErr != nil && findErr != gorm.ErrRecordNotFound {
				return findErr
			}
			if client.ID == 0 {
				parsed, parseErr := uuid.Parse(datos.Guid)
				if parseErr != nil {
					return fmt.Errorf("identificador de cliente inválido")
				}
				client.Guid = parsed
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
				findErr := tx.Where("guid = ? AND deleted_at IS NULL", parsed).First(&entity).Error
				if findErr != nil && findErr != gorm.ErrRecordNotFound {
					return findErr
				}
				if entity.ID == 0 {
					findErr = tx.Where("UPPER(rfc) = ? AND deleted_at IS NULL", rfc).First(&entity).Error
					if findErr != nil && findErr != gorm.ErrRecordNotFound {
						return findErr
					}
					if entity.ID == 0 {
						entity.Guid = parsed
					}
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
