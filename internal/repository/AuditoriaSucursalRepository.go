package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditoriaSucursalRepository struct {
	apiBaseURL string
	db         *gorm.DB
}

func NewAuditoriaSucursalRepository(apiBaseURL string, db *gorm.DB) *AuditoriaSucursalRepository {
	return &AuditoriaSucursalRepository{apiBaseURL: apiBaseURL, db: db}
}

type ResumenInventario struct {
	ValorInventario float64 `gorm:"column:valor_inventario"`
	TotalItems      int64   `gorm:"column:total_items"`
}

func (a *AuditoriaSucursalRepository) ObtenerResumenInventario() *dto.ResponseDto {
	var resumen ResumenInventario

	err := a.db.
		Model(&models.SucursalProducto{}).
		Select(`
			COALESCE(SUM(precio_venta * existencia), 0) AS valor_inventario,
			COUNT(*) AS total_items
		`).
		Scan(&resumen).Error

	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	return dto.NewResponseDto(
		true,
		"Resumen de inventario obtenido correctamente",
		resumen,
		nil,
	)
}

func (a *AuditoriaSucursalRepository) IniciarAuditoria(sucursalGuid string, usuarioEncargadoGuid string) *dto.ResponseDto {
	var auditoria models.Auditoria
	err := a.db.Model(&models.Auditoria{}).Select("*").Where("estatus_id IN ?", []int{1, 4}).First(&auditoria).Error

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		fmt.Println(err.Error(), "error en la busqueda de auditoria")
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	if auditoria.Guid != uuid.Nil {
		fmt.Println("Ya existe una auditoria en curso")
		return dto.NewResponseDto(false, "Ya existe una auditoria en curso", nil, nil)
	}
	var productos []dto.AuditoriaProductoDto
	err = a.db.Raw("SELECT guid, existencia, precio_venta, precio_venta2 FROM vw_inventario_productos").Scan(&productos).Error
	if err != nil {
		fmt.Println(err.Error(), "error en la consulta de productos")
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	payload, err := json.Marshal(map[string]interface{}{
		"sucursalGuid":         sucursalGuid,
		"usuarioEncargadoGuid": usuarioEncargadoGuid,
		"productos":            productos,
	})

	if err != nil {
		fmt.Println("error al marshal", err.Error())
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	//fmt.Println("payload", string(payload))

	// 1. Lógica de la API
	client := &http.Client{Timeout: 10 * time.Second}
	endpoint := fmt.Sprintf("%s/auditoria/crear", a.apiBaseURL)
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(payload))
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	token := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxIiwiZW1haWwiOiJzdXBlcmFkbWluQHNvZnRpLmRpZ2l0YWwiLCJ1bmlxdWVfbmFtZSI6IlN1cGVyIGFkbWluaXN0cmFkb3IiLCJyb2xlIjoiU3VwZXIgQWRtaW4iLCJuYmYiOjE3ODI2MjkwODAsImV4cCI6MTc4MzIzMzg4MCwiaWF0IjoxNzgyNjI5MDgwLCJpc3MiOiJLb21tZXJ6ZUNsb3VkQXBpIiwiYXVkIjoiS29tbWVyemUifQ.bs8898GXesyexa9WHPtvC_PhN0DpIDmrDS53yJflTBA"
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	response, err := client.Do(req)
	if err != nil {
		fmt.Println("error al enviar la peticion", err.Error())
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	var responseDto dto.ResponseDto
	err = json.NewDecoder(response.Body).Decode(&responseDto)
	if err != nil {
		fmt.Println("error al decodificar la respuesta", err.Error())
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	fmt.Println("respuesta de la API", responseDto)

	return dto.NewResponseDto(
		responseDto.Success,
		responseDto.Message,
		nil,
		nil,
	)
}
