CREATE TABLE estatus (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_estatus_guid ON estatus(guid);
CREATE UNIQUE INDEX idx_estatus_nombre ON estatus(nombre);
CREATE INDEX idx_estatus_deleted_at ON estatus(deleted_at);
