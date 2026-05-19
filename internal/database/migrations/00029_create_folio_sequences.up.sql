-- Crear secuencias para folios de pedidos, cotizaciones y transferencias
CREATE SEQUENCE IF NOT EXISTS consecutivo_folio_pedido START 1;
CREATE SEQUENCE IF NOT EXISTS consecutivo_folio_cotizacion START 1;
CREATE SEQUENCE IF NOT EXISTS consecutivo_folio_transferencia START 1;

-- Corregir constraint: operacion_cajero_id puede ser NULL
-- (el flujo de venta directa en POS no siempre requiere apertura de caja)
ALTER TABLE pedidos ALTER COLUMN operacion_cajero_id DROP NOT NULL;
