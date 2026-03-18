CREATE TABLE sucursal_producto (
    id SERIAL PRIMARY KEY,
    nivel_id INT NOT NULL,
    precio_compra DECIMAL(18,6) NOT NULL DEFAULT 0,
    precio_venta DECIMAL(18,6) NOT NULL DEFAULT 0,
    precio_venta2 DECIMAL(18,6) NOT NULL DEFAULT 0,
    precio_venta3 DECIMAL(18,6) NOT NULL DEFAULT 0,
    descuento DECIMAL(18,6) NOT NULL DEFAULT 0,
    existencia DECIMAL(18,6) NOT NULL DEFAULT 0,
    minimo DECIMAL(18,6) DEFAULT 0,
    maximo DECIMAL(18,6) DEFAULT 0,
    sync BOOLEAN DEFAULT FALSE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_sucursal_producto_nivel FOREIGN KEY (nivel_id) REFERENCES nivel_empaque(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_sucursal_producto_guid ON sucursal_producto(guid);
CREATE INDEX idx_sucursal_producto_deleted_at ON sucursal_producto(deleted_at);
