CREATE TABLE sucursales (
    id SERIAL PRIMARY KEY,
    empresa_id INT,
    clave VARCHAR(5),
    nombre_sucursal VARCHAR(100),
    calle VARCHAR(150),
    exterior VARCHAR(20),
    interior VARCHAR(20),
    colonia VARCHAR(150),
    ciudad VARCHAR(150),
    estado VARCHAR(100),
    codigo_postal VARCHAR(5),
    telefono VARCHAR(20),
    telefono2 VARCHAR(20),
    correo VARCHAR(200),
    licencia VARCHAR(20),
    comision_ventas DECIMAL(18,6) DEFAULT 0,
    valor_inventario DECIMAL(18,6) DEFAULT 0,
    serie_cfdi VARCHAR(20),
    sync BOOLEAN DEFAULT FALSE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_sucursales_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_sucursales_guid ON sucursales(guid);
CREATE INDEX idx_sucursales_deleted_at ON sucursales(deleted_at);
