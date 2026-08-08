package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

type ProveedoresService struct {
	db *gorm.DB
}

func NewProveedoresService(db *gorm.DB) *ProveedoresService {
	return &ProveedoresService{db: db}
}

func normalizeRFC(value string) string {
	return strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(value), " ", ""))
}

func (s *ProveedoresService) BuscarEntidadFiscalPorRFC(rfc string) (*dto.ProveedorFiscalDto, error) {
	rfc = normalizeRFC(rfc)
	if rfc == "" {
		return nil, fmt.Errorf("el RFC es obligatorio")
	}
	var entity dto.ProveedorFiscalDto
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
	return &entity, nil
}

func (s *ProveedoresService) GuardarProveedor(datos dto.GuardarProveedorDto) (*dto.ProveedorFiscalDto, error) {
	rfc := normalizeRFC(datos.RFC)
	if rfc == "" {
		return nil, fmt.Errorf("el RFC es obligatorio")
	}
	var entityGuid string
	err := s.db.Transaction(func(tx *gorm.DB) error {
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

		var supplierRole models.RolesFiscales
		if err := tx.Where("nombre = ? AND deleted_at IS NULL", "PROVEEDOR").First(&supplierRole).Error; err != nil {
			return fmt.Errorf("rol fiscal PROVEEDOR no disponible: %w", err)
		}
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
