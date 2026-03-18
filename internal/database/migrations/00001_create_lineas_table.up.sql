CREATE TABLE lineas (
    id SERIAL PRIMARY KEY,
    nombre_linea VARCHAR(150) NOT NULL,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_lineas_guid ON lineas(guid);
CREATE UNIQUE INDEX idx_lineas_nombre_linea ON lineas(nombre_linea);
CREATE INDEX idx_lineas_deleted_at ON lineas(deleted_at);
