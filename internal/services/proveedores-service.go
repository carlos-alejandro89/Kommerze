package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProveedoresService struct {
	db         *gorm.DB
	apiBaseURL string
	cloud      *CloudHttpClient
}

func NewProveedoresService(db *gorm.DB, apiBaseURL string, cloud *CloudHttpClient) *ProveedoresService {
	return &ProveedoresService{db: db, apiBaseURL: strings.TrimRight(apiBaseURL, "/"), cloud: cloud}
}

func normalizeRFC(value string) string {
	return strings.ToUpper(strings.NewReplacer(" ", "", "-", "").Replace(strings.TrimSpace(value)))
}

// BuscarProveedores devuelve únicamente entidades fiscales que ya cuentan con
// el rol PROVEEDOR. El término se aplica a sus principales datos de contacto y
// fiscales para que la selección no dependa de conocer el RFC.
func (s *ProveedoresService) BuscarProveedores(termino string) ([]dto.ProveedorFiscalDto, error) {
	termino = strings.TrimSpace(termino)
	pattern := "%" + termino + "%"
	var proveedores []dto.ProveedorFiscalDto
	err := s.db.Raw(`
		SELECT DISTINCT ef.id, ef.guid, ef.regimen_id,
		       COALESCE(sr.clave, '') AS regimen_clave,
		       COALESCE(sr.descripcion, '') AS regimen,
		       ef.razon_social, ef.rfc, ef.codigo_postal,
		       ef.correo, ef.telefono, ef.whatsapp,
		       TRUE AS es_proveedor
		FROM entidades_fiscales ef
		JOIN entidad_fiscal_roles efr
		  ON efr.entidad_fiscal_id = ef.id AND efr.deleted_at IS NULL
		JOIN roles_fiscales rf
		  ON rf.id = efr.rol_id AND rf.deleted_at IS NULL AND UPPER(rf.nombre) = 'PROVEEDOR'
		LEFT JOIN sat_regimen_fiscal sr ON sr.id = ef.regimen_id
		WHERE ef.deleted_at IS NULL
		  AND (? = '' OR ef.razon_social ILIKE ? OR ef.rfc ILIKE ?
		       OR ef.correo ILIKE ? OR ef.telefono ILIKE ? OR ef.whatsapp ILIKE ?
		       OR ef.codigo_postal ILIKE ? OR sr.clave ILIKE ? OR sr.descripcion ILIKE ?)
		ORDER BY ef.razon_social
		LIMIT 200`, termino, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern).
		Scan(&proveedores).Error
	return proveedores, err
}

func (s *ProveedoresService) BuscarEntidadFiscalPorRFC(rfc string) (*dto.ProveedorFiscalDto, error) {
	rfc = normalizeRFC(rfc)
	if rfc == "" {
		return nil, fmt.Errorf("el RFC es obligatorio")
	}
	resp, err := s.cloud.Get(fmt.Sprintf("%s/clientes/entidad-fiscal/consultar/%s", s.apiBaseURL, url.PathEscape(rfc)))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	var cloudResult cloudAPIResponse[*cloudEntidadFiscal]
	if err := json.NewDecoder(resp.Body).Decode(&cloudResult); err != nil {
		return nil, err
	}
	if !cloudResult.Success || cloudResult.Data == nil {
		return nil, fmt.Errorf("%s", cloudResult.Mensaje)
	}
	var entity dto.ProveedorFiscalDto
	item := cloudResult.Data
	entity.Guid = item.Guid
	entity.RegimenID = item.RegimenID
	entity.RazonSocial = item.RazonSocial
	entity.RFC = item.RFC
	entity.CodigoPostal = item.CodigoPostal
	entity.Correo = item.Correo
	entity.Telefono = item.Telefono
	entity.Whatsapp = item.Whatsapp
	if item.Regimen != nil {
		entity.RegimenClave, entity.Regimen = item.Regimen.Clave, item.Regimen.Descripcion
	}
	var supplierRole models.RolesFiscales
	if err := s.db.Where("nombre = ? AND deleted_at IS NULL", "PROVEEDOR").First(&supplierRole).Error; err == nil {
		var count int64
		s.db.Model(&models.EntidadFiscalRol{}).Where("rol_id = ?", supplierRole.ID).Joins("JOIN entidades_fiscales ef ON ef.id = entidad_fiscal_roles.entidad_fiscal_id").Where("ef.guid = ?", item.Guid).Count(&count)
		entity.EsProveedor = count > 0
	}
	return &entity, nil
	/*var entity dto.ProveedorFiscalDto
	err := s.db.Raw(`
		SELECT ef.id, ef.guid, ef.regimen_id, COALESCE(sr.clave, '') AS regimen_clave,
		       COALESCE(sr.descripcion, '') AS regimen, ef.razon_social, ef.rfc,
		       ef.codigo_postal, ef.correo, ef.telefono, ef.whatsapp,
		       EXISTS (
		         SELECT 1 FROM entidad_fiscal_roles efr
		         JOIN roles_fiscales rf ON rf.id = efr.rol_id AND rf.deleted_at IS NULL
		         WHERE efr.entidad_fiscal_id = ef.id AND efr.deleted_at IS NULL AND rf.nombre = 'PROVEEDOR'
		       ) AS es_proveedor
		FROM entidades_fiscales ef
		LEFT JOIN sat_regimen_fiscal sr ON sr.id = ef.regimen_id
		WHERE UPPER(ef.rfc) = ? AND ef.deleted_at IS NULL
		LIMIT 1`, rfc).Scan(&entity).Error
	if err != nil {
		return nil, err
	}
	if entity.ID == 0 {
		return nil, nil
	}
	return &entity, nil*/
}

func (s *ProveedoresService) GuardarProveedor(datos dto.GuardarProveedorDto) (*dto.ProveedorFiscalDto, error) {
	rfc := normalizeRFC(datos.RFC)
	if rfc == "" {
		return nil, fmt.Errorf("el RFC es obligatorio")
	}
	var supplierRole models.RolesFiscales
	if err := s.db.Where("nombre = ? AND deleted_at IS NULL", "PROVEEDOR").First(&supplierRole).Error; err != nil {
		return nil, fmt.Errorf("sincronice el catálogo de Roles fiscales: %w", err)
	}
	datos.RolFiscalGuid = supplierRole.Guid.String()
	payload, _ := json.Marshal(map[string]any{"guid": datos.EntidadGuid, "rolFiscalGuid": datos.RolFiscalGuid, "regimenID": datos.RegimenID, "razonSocial": datos.RazonSocial, "rfc": rfc, "codigoPostal": datos.CodigoPostal, "correo": datos.Correo, "telefono": datos.Telefono, "whatsapp": datos.Whatsapp})
	resp, err := s.cloud.Post(s.apiBaseURL+"/clientes/entidad-fiscal/guardar-rol", "application/json", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var remote cloudAPIResponse[*cloudEntidadFiscal]
	if err := json.NewDecoder(resp.Body).Decode(&remote); err != nil {
		return nil, err
	}
	if !remote.Success || remote.Data == nil {
		return nil, fmt.Errorf("%s", remote.Mensaje)
	}
	datos.EntidadGuid = remote.Data.Guid
	var entityGuid string
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Serializa altas concurrentes del mismo RFC entre distintas Cajas.
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext(?))", rfc).Error; err != nil {
			return err
		}
		var entity models.EntidadFiscal
		// La coincidencia se resuelve siempre por RFC para impedir duplicados,
		// incluso si la interfaz no envía el GUID encontrado previamente.
		if err := tx.Where("UPPER(rfc) = ? AND deleted_at IS NULL", rfc).First(&entity).Error; err != nil && err != gorm.ErrRecordNotFound {
			return err
		}
		if entity.ID == 0 {
			if strings.TrimSpace(datos.RazonSocial) == "" || datos.RegimenID == nil || strings.TrimSpace(datos.CodigoPostal) == "" {
				return fmt.Errorf("razón social, régimen fiscal y código postal son obligatorios")
			}
			if parsed, parseErr := uuid.Parse(datos.EntidadGuid); parseErr == nil {
				entity.Guid = parsed
			}
			entity.RegimenID = datos.RegimenID
			entity.RazonSocial = strings.TrimSpace(datos.RazonSocial)
			entity.RFC = rfc
			entity.CodigoPostal = clientDigitsOnly(datos.CodigoPostal)
			entity.Correo = strings.TrimSpace(datos.Correo)
			entity.Telefono = clientDigitsOnly(datos.Telefono)
			entity.Whatsapp = clientDigitsOnly(datos.Whatsapp)
			if err := tx.Create(&entity).Error; err != nil {
				return err
			}
		}
		entityGuid = entity.Guid.String()

		return tx.Where("entidad_fiscal_id = ? AND rol_id = ?", entity.ID, supplierRole.ID).
			FirstOrCreate(&models.EntidadFiscalRol{EntidadFiscalID: entity.ID, RolID: supplierRole.ID}).Error
	})
	if err != nil {
		return nil, err
	}
	var result dto.ProveedorFiscalDto
	if err := s.db.Raw(`
		SELECT ef.id, ef.guid, ef.regimen_id, COALESCE(sr.clave, '') AS regimen_clave,
		       COALESCE(sr.descripcion, '') AS regimen, ef.razon_social, ef.rfc,
		       ef.codigo_postal, ef.correo, ef.telefono, ef.whatsapp, TRUE AS es_proveedor
		FROM entidades_fiscales ef LEFT JOIN sat_regimen_fiscal sr ON sr.id = ef.regimen_id
		WHERE ef.guid = ? AND ef.deleted_at IS NULL`, entityGuid).Scan(&result).Error; err != nil {
		return nil, err
	}
	return &result, nil
}
