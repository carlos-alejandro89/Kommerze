CREATE TABLE tipos_autorizacion (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(150) NOT NULL,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_tipos_autorizacion_guid ON tipos_autorizacion(guid);
CREATE INDEX idx_tipos_autorizacion_deleted_at ON tipos_autorizacion(deleted_at);
