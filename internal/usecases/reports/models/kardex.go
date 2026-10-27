package models

import (
	"encoding/json"
)

type KardexProductOption struct {
	NivelID  uint   `json:"NivelID" gorm:"column:nivel_id"`
	Codigo   string `json:"Codigo" gorm:"column:codigo"`
	Producto string `json:"Producto" gorm:"column:producto"`
	Empaque  string `json:"Empaque" gorm:"column:empaque"`
	Imagen   string `json:"Imagen" gorm:"column:imagen"`
}

func (o *KardexProductOption) UnmarshalJSON(data []byte) error {
	type Alias KardexProductOption
	aux := struct {
		*Alias
		NivelIDAlt  uint `json:"nivelId"`
		NivelIDAlt2 uint `json:"nivelID"`
		NivelSnake  uint `json:"nivel_id"`
		ID          uint `json:"id"`
	}{
		Alias: (*Alias)(o),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	if o.NivelID == 0 {
		if aux.NivelIDAlt != 0 {
			o.NivelID = aux.NivelIDAlt
		} else if aux.NivelIDAlt2 != 0 {
			o.NivelID = aux.NivelIDAlt2
		} else if aux.NivelSnake != 0 {
			o.NivelID = aux.NivelSnake
		} else if aux.ID != 0 {
			o.NivelID = aux.ID
		}
	}
	return nil
}

type KardexReportRequest struct {
	NivelID     uint   `json:"NivelID"`
	SucursalID  uint   `json:"SucursalID"`
	FechaInicio string `json:"FechaInicio"`
	FechaFin    string `json:"FechaFin"`
}

func (r *KardexReportRequest) UnmarshalJSON(data []byte) error {
	type Alias KardexReportRequest
	aux := struct {
		*Alias
		NivelIDAlt   uint `json:"nivelId"`
		NivelIDAlt2  uint `json:"nivelID"`
		NivelSnake   uint `json:"nivel_id"`
		ID           uint `json:"id"`
		SucursalAlt  uint `json:"sucursalId"`
		SucursalAlt2 uint `json:"sucursalID"`
		SucursalSnk  uint `json:"sucursal_id"`
	}{
		Alias: (*Alias)(r),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	if r.NivelID == 0 {
		if aux.NivelIDAlt != 0 {
			r.NivelID = aux.NivelIDAlt
		} else if aux.NivelIDAlt2 != 0 {
			r.NivelID = aux.NivelIDAlt2
		} else if aux.NivelSnake != 0 {
			r.NivelID = aux.NivelSnake
		} else if aux.ID != 0 {
			r.NivelID = aux.ID
		}
	}
	if r.SucursalID == 0 {
		if aux.SucursalAlt != 0 {
			r.SucursalID = aux.SucursalAlt
		} else if aux.SucursalAlt2 != 0 {
			r.SucursalID = aux.SucursalAlt2
		} else if aux.SucursalSnk != 0 {
			r.SucursalID = aux.SucursalSnk
		}
	}
	return nil
}

type KardexDailyRow struct {
	Fecha                 string  `json:"Fecha" gorm:"column:fecha"`
	InventarioInicial     float64 `json:"InventarioInicial" gorm:"column:inventario_inicial"`
	Compras               float64 `json:"Compras" gorm:"column:compras"`
	Ventas                float64 `json:"Ventas" gorm:"column:ventas"`
	TransferenciasEntrada float64 `json:"TransferenciasEntrada" gorm:"column:transferencias_entrada"`
	TransferenciasSalida  float64 `json:"TransferenciasSalida" gorm:"column:transferencias_salida"`
	BajasMercancia        float64 `json:"BajasMercancia" gorm:"column:bajas_mercancia"`
	Conversiones          float64 `json:"Conversiones" gorm:"column:conversiones"`
	AjustesAuditoria      float64 `json:"AjustesAuditoria" gorm:"column:ajustes_auditoria"`
	InventarioFinal       float64 `json:"InventarioFinal" gorm:"column:inventario_final"`
}

type KardexMovementRow struct {
	Fecha      string  `json:"Fecha"`
	Tipo       string  `json:"Tipo"`
	Documento  string  `json:"Documento"`
	Entrada    float64 `json:"Entrada"`
	Salida     float64 `json:"Salida"`
	Existencia float64 `json:"Existencia"`
	Nota       string  `json:"Nota"`
}

type KardexReport struct {
	FechaInicio  string              `json:"FechaInicio"`
	FechaFin     string              `json:"FechaFin"`
	GeneradoEn   string              `json:"GeneradoEn"`
	Empresa      string              `json:"Empresa"`
	Sucursal     string              `json:"Sucursal"`
	Producto     KardexProductOption `json:"Producto"`
	SaldoInicial float64             `json:"SaldoInicial"`
	SaldoFinal   float64             `json:"SaldoFinal"`
	Entradas     float64             `json:"Entradas"`
	Salidas      float64             `json:"Salidas"`
	Resumen      []KardexDailyRow    `json:"Resumen"`
	Movimientos  []KardexMovementRow `json:"Movimientos"`
}

type KardexReportOutput struct {
	Report    KardexReport `json:"Report"`
	PDFBase64 string       `json:"PDFBase64"`
	FileName  string       `json:"FileName"`
}
