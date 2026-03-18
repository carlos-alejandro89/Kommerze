CREATE TABLE cajas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    clave VARCHAR(20),
    activa BOOLEAN DEFAULT TRUE,
    permite_ventas BOOLEAN DEFAULT TRUE,
    es_principal BOOLEAN DEFAULT FALSE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_cajas_guid ON cajas(guid);
CREATE UNIQUE INDEX idx_cajas_clave ON cajas(clave);
CREATE INDEX idx_cajas_deleted_at ON cajas(deleted_at);
