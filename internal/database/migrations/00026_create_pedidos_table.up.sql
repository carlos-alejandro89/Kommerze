CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    estatus_id INT,
    cliente_id INT,
    operacion_cajero_id INT NOT NULL,
    tipo_pedido_id INT,
    factura_id INT,
    folio INT,
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    es_credito BOOLEAN DEFAULT FALSE,
    sync BOOLEAN DEFAULT FALSE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_pedidos_estatus FOREIGN KEY (estatus_id) REFERENCES estatus(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pedidos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pedidos_operacion_cajero FOREIGN KEY (operacion_cajero_id) REFERENCES operacion_cajero(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pedidos_tipo_pedido FOREIGN KEY (tipo_pedido_id) REFERENCES tipos_pedido(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pedidos_factura FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_pedidos_guid ON pedidos(guid);
CREATE INDEX idx_pedidos_deleted_at ON pedidos(deleted_at);
CREATE INDEX idx_pedidos_folio ON pedidos(folio);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha);
