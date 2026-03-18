CREATE TABLE auditoria_producto (
    id SERIAL PRIMARY KEY,
    auditoria_id INT,
    nivel_id INT,
    en_existencia FLOAT,
    conteo_fisico FLOAT,
    pcompra FLOAT,
    pventa FLOAT,
    nota TEXT,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_auditoria_producto_auditoria FOREIGN KEY (auditoria_id) REFERENCES auditoria(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_auditoria_producto_nivel FOREIGN KEY (nivel_id) REFERENCES nivel_empaque(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_auditoria_producto_guid ON auditoria_producto(guid);
CREATE INDEX idx_auditoria_producto_deleted_at ON auditoria_producto(deleted_at);
