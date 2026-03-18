CREATE TABLE tipos_pedido (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    icon VARCHAR(255),
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_tipos_pedido_guid ON tipos_pedido(guid);
CREATE UNIQUE INDEX idx_tipos_pedido_nombre ON tipos_pedido(nombre);
CREATE INDEX idx_tipos_pedido_deleted_at ON tipos_pedido(deleted_at);
