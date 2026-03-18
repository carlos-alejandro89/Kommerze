CREATE TABLE nivel_empaque (
    id SERIAL PRIMARY KEY,
    producto_id INT,
    empaque_id INT,
    codigo VARCHAR(255),
    codigo_barra VARCHAR(255),
    img_referencia TEXT,
    activo BOOLEAN DEFAULT TRUE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_nivel_empaque_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_nivel_empaque_empaque FOREIGN KEY (empaque_id) REFERENCES empaques(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_nivel_empaque_guid ON nivel_empaque(guid);
CREATE INDEX idx_nivel_empaque_deleted_at ON nivel_empaque(deleted_at);
