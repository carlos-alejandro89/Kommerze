CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    estatus_id INT,
    centro_id INT,
    sincronizado BOOLEAN DEFAULT FALSE,
    fecha TIMESTAMP,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_auditoria_estatus FOREIGN KEY (estatus_id) REFERENCES estatus(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_auditoria_guid ON auditoria(guid);
CREATE INDEX idx_auditoria_deleted_at ON auditoria(deleted_at);
