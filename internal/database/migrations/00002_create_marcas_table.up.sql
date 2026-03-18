CREATE TABLE marcas (
    id SERIAL PRIMARY KEY,
    nombre_marca VARCHAR(150) NOT NULL,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_marcas_guid ON marcas(guid);
CREATE UNIQUE INDEX idx_marcas_nombre_marca ON marcas(nombre_marca);
CREATE INDEX idx_marcas_deleted_at ON marcas(deleted_at);
