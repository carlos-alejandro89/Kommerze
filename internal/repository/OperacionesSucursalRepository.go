package repository

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"time"

	"github.com/shopspring/decimal"

	gorm "gorm.io/gorm"
)

type OperacionesSucursalRepository struct {
	db *gorm.DB
}

func NewOperacionesSucursalRepository(db *gorm.DB) *OperacionesSucursalRepository {
	return &OperacionesSucursalRepository{db: db}
}

func (o *OperacionesSucursalRepository) ObtenerOperacionSucursal(licencia string) *dto.ResponseDto {
	var sucursal models.Sucursal

	err := o.db.Where("licencia = ?", licencia).First(&sucursal).Error
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	type data struct {
		Empresa     models.Empresa             `json:"empresa"`
		Sucursal    models.Sucursal            `json:"sucursal"`
		Operaciones []models.OperacionSucursal `json:"operaciones"`
	}

	var empresa models.Empresa
	err = o.db.Where("id = ?", sucursal.EmpresaID).First(&empresa).Error
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}

	var response data
	response.Sucursal = sucursal
	response.Empresa = empresa

	var operaciones []models.OperacionSucursal
	err = o.db.Where("sucursal_id = ?", sucursal.ID).Where("estatus_id = ?", 1).Find(&operaciones).Error
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), response, []string{err.Error()})
	}

	response.Operaciones = operaciones
	return dto.NewResponseDto(true, "Operaciones obtenidas correctamente", response, nil)
}

func (o *OperacionesSucursalRepository) ObtenerValorInventario() *dto.ResponseDto {
	var inventario models.SucursalProducto
	var valorInventario float64

	err := o.db.Model(&inventario).Select("SUM (precio_venta*existencia) as ValorInventario").Scan(&valorInventario).Error
	if err != nil {
		return dto.NewResponseDto(false, err.Error(), nil, []string{err.Error()})
	}
	return dto.NewResponseDto(true, "Inventario obtenido correctamente", valorInventario, nil)
}

func (o *OperacionesSucursalRepository) SucursalInicioOperacion(datos dto.SucursalInicioOperacionesDto) *dto.ResponseDto {

	var estatus = uint(1)
	var usuario = uint(datos.Usuario)
	var sucursal = uint(datos.Sucursal)

	var operacion = models.OperacionSucursal{
		UsuarioAperturaID:      &usuario,
		EstatusID:              &estatus,
		SucursalID:             sucursal,
		FechaInicio:            time.Now(),
		ValorInicialInventario: decimal.NewFromFloat(datos.ValorInventarioInicial),
	}

	o.db.Create(&operacion)

	return dto.NewResponseDto(true, "Operación iniciada correctamente", nil, nil)
}
