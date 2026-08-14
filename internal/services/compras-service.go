package services

import (
	"BitComercio/internal/models"
	"BitComercio/internal/repository/dto"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ComprasService struct{ db *gorm.DB }

func NewComprasService(db *gorm.DB) *ComprasService { return &ComprasService{db: db} }

func parseOptionalPurchaseTime(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02T15:04:05"} {
		if parsed, err := time.Parse(layout, value); err == nil {
			return &parsed, nil
		}
	}
	return nil, fmt.Errorf("fecha inválida: %s", value)
}

func (s *ComprasService) CrearCompra(datos dto.CrearCompraDto) (*dto.ResponseDto, error) {
	if datos.SucursalID == 0 {
		return nil, fmt.Errorf("sucursal requerida")
	}
	if len(datos.Productos) == 0 {
		return nil, fmt.Errorf("agrega al menos un artículo")
	}
	proveedorGuid, err := uuid.Parse(strings.TrimSpace(datos.ProveedorGuid))
	if err != nil {
		return nil, fmt.Errorf("proveedor inválido")
	}
	fechaFactura, err := parseOptionalPurchaseTime(datos.FechaFactura)
	if err != nil {
		return nil, err
	}
	fechaTimbrado, err := parseOptionalPurchaseTime(datos.FechaTimbrado)
	if err != nil {
		return nil, err
	}

	var pedido models.Pedido
	var compra models.Compra
	err = s.db.Transaction(func(tx *gorm.DB) error {
		var proveedor models.EntidadFiscal
		if err := tx.Where("guid = ?", proveedorGuid).First(&proveedor).Error; err != nil {
			return fmt.Errorf("no se encontró el proveedor: %w", err)
		}
		var tipo models.TipoPedido
		if err := tx.Where("guid = ?", models.TipoPedidoCompraGuid).First(&tipo).Error; err != nil {
			return fmt.Errorf("no se encontró el tipo de pedido Compra sincronizado: %w", err)
		}
		var estatus models.Estatus
		if err := tx.Where("LOWER(nombre) = ?", "completado").First(&estatus).Error; err != nil {
			return fmt.Errorf("no se encontró el estatus Completado sincronizado: %w", err)
		}
		uuidFiscal := strings.ToUpper(strings.TrimSpace(datos.UUIDFiscal))
		if uuidFiscal != "" {
			var duplicados int64
			if err := tx.Model(&models.Compra{}).Where("uuid_fiscal = ?", uuidFiscal).Count(&duplicados).Error; err != nil {
				return fmt.Errorf("no se pudo validar el folio fiscal: %w", err)
			}
			if duplicados > 0 {
				return fmt.Errorf("el XML con UUID %s ya fue registrado", uuidFiscal)
			}
		}
		var folio int
		if err := tx.Raw("SELECT nextval('consecutivo_folio_compra')").Scan(&folio).Error; err != nil {
			return fmt.Errorf("no se pudo generar el folio de compra: %w", err)
		}
		tipoID, estatusID, sucursalID := tipo.ID, estatus.ID, datos.SucursalID
		pedido = models.Pedido{TipoPedidoID: &tipoID, EstatusID: &estatusID, SucursalOrigenID: &sucursalID, Folio: folio, Fecha: time.Now(), Sync: false}
		if err := tx.Create(&pedido).Error; err != nil {
			return fmt.Errorf("no se pudo crear el pedido: %w", err)
		}

		detalleSubtotal := decimal.Zero
		for _, item := range datos.Productos {
			nivelGuid, parseErr := uuid.Parse(strings.TrimSpace(item.NivelGuid))
			if parseErr != nil {
				return fmt.Errorf("identificador de producto inválido")
			}
			cantidad, costo := decimal.NewFromFloat(item.Cantidad), decimal.NewFromFloat(item.Costo)
			if cantidad.LessThanOrEqual(decimal.Zero) {
				return fmt.Errorf("la cantidad debe ser mayor a cero")
			}
			if costo.IsNegative() {
				return fmt.Errorf("el costo no puede ser negativo")
			}
			var inventario models.SucursalProducto
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Joins("JOIN nivel_empaque ON nivel_empaque.id = sucursal_producto.nivel_id").
				Where("nivel_empaque.guid = ?", nivelGuid).
				Where("sucursal_producto.deleted_at IS NULL").First(&inventario).Error; err != nil {
				return fmt.Errorf("no se encontró el producto %s en el inventario: %w", item.NivelGuid, err)
			}
			detalle := models.PedidoDetalle{PedidoID: pedido.ID, NivelID: inventario.NivelID, Cantidad: cantidad, PrecioCompra: costo, PrecioVenta: inventario.PrecioVenta, Descuento: decimal.Zero, TasaIVA: decimal.Zero, TasaISR: decimal.Zero}
			if err := tx.Create(&detalle).Error; err != nil {
				return fmt.Errorf("no se pudo registrar el detalle: %w", err)
			}
			detalleSubtotal = detalleSubtotal.Add(costo.Mul(cantidad))
			if err := tx.Model(&inventario).Updates(map[string]any{"existencia": inventario.Existencia.Add(cantidad), "precio_compra": costo, "sync": false}).Error; err != nil {
				return fmt.Errorf("no se pudo actualizar el inventario: %w", err)
			}
		}

		origen := strings.ToUpper(strings.TrimSpace(datos.OrigenCaptura))
		if origen != "XML" {
			origen = "MANUAL"
		}
		folioFactura := strings.TrimSpace(datos.FolioFactura)
		if origen == "MANUAL" && folioFactura == "" {
			return fmt.Errorf("el folio de la factura es obligatorio en captura manual")
		}
		moneda := strings.ToUpper(strings.TrimSpace(datos.Moneda))
		if moneda == "" {
			moneda = "MXN"
		}
		descuento := decimal.NewFromFloat(datos.Descuento)
		impuestos := decimal.NewFromFloat(datos.Impuestos)
		if descuento.IsNegative() || impuestos.IsNegative() {
			return fmt.Errorf("descuento e impuestos no pueden ser negativos")
		}
		total := detalleSubtotal.Sub(descuento).Add(impuestos)
		if total.IsNegative() {
			return fmt.Errorf("el total de la compra no puede ser negativo")
		}
		compra = models.Compra{PedidoID: pedido.ID, ProveedorID: proveedor.ID, OrigenCaptura: origen, UUIDFiscal: uuidFiscal, FolioFactura: folioFactura, FechaFactura: fechaFactura, FechaTimbrado: fechaTimbrado, Moneda: moneda, TipoComprobante: strings.TrimSpace(datos.TipoComprobante), MetodoPago: strings.TrimSpace(datos.MetodoPago), Subtotal: detalleSubtotal, Descuento: descuento, Impuestos: impuestos, Total: total}
		if err := tx.Create(&compra).Error; err != nil {
			return fmt.Errorf("no se pudieron guardar los datos de la compra: %w", err)
		}
		return nil
	})
	if err != nil {
		return dto.NewResponseDto(false, "No se pudo registrar la compra", nil, []string{err.Error()}), err
	}
	result := dto.CompraCreadaDto{PedidoGuid: pedido.Guid.String(), CompraGuid: compra.Guid.String(), Folio: pedido.Folio}
	return dto.NewResponseDto(true, "Compra registrada correctamente", result, nil), nil
}
