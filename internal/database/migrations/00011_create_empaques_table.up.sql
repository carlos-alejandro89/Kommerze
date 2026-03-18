CREATE TABLE empaques (
    id SERIAL PRIMARY KEY,
    codigo_empaque VARCHAR(255),
    empaque VARCHAR(255),
    contenido FLOAT,
    sync BOOLEAN DEFAULT FALSE,
    unidad_id INT,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_empaques_guid ON empaques(guid);
CREATE UNIQUE INDEX idx_empaques_codigo_empaque ON empaques(codigo_empaque);
CREATE INDEX idx_empaques_deleted_at ON empaques(deleted_at);
