CREATE TABLE pedido_detalle (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL,
    nivel_id INT NOT NULL,
    cantidad DECIMAL(18,6) NOT NULL,
    precio_compra DECIMAL(18,6) NOT NULL,
    precio_venta DECIMAL(18,6) NOT NULL,
    descuento DECIMAL(18,6) DEFAULT 0,
    traslado_iva DECIMAL(18,6) DEFAULT 0,
    tasa_iva DECIMAL(18,6) NOT NULL DEFAULT 0,
    retencion_isr DECIMAL(18,6) NOT NULL DEFAULT 0,
    tasa_isr DECIMAL(18,6) NOT NULL DEFAULT 0,
    info_adicional TEXT,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_pedido_detalle_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pedido_detalle_nivel FOREIGN KEY (nivel_id) REFERENCES nivel_empaque(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_pedido_detalle_guid ON pedido_detalle(guid);
CREATE INDEX idx_pedido_detalle_deleted_at ON pedido_detalle(deleted_at);
