DROP SEQUENCE IF EXISTS consecutivo_folio_pedido;
DROP SEQUENCE IF EXISTS consecutivo_folio_cotizacion;
DROP SEQUENCE IF EXISTS consecutivo_folio_transferencia;

ALTER TABLE pedidos ALTER COLUMN operacion_cajero_id SET NOT NULL;
