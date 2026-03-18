CREATE TABLE sat_productos (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_sat_productos_guid ON sat_productos(guid);
CREATE UNIQUE INDEX idx_sat_productos_clave ON sat_productos(clave);
CREATE INDEX idx_sat_productos_deleted_at ON sat_productos(deleted_at);
