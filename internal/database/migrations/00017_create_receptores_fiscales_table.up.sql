CREATE TABLE receptores_fiscales (
    id SERIAL PRIMARY KEY,
    regimen_id INT,
    razon_social VARCHAR(400) NOT NULL,
    rfc VARCHAR(20),
    codigo_postal VARCHAR(6),
    correo VARCHAR(150),
    whatsapp VARCHAR(20),
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_receptores_fiscales_regimen FOREIGN KEY (regimen_id) REFERENCES sat_regimen_fiscal(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_receptores_fiscales_guid ON receptores_fiscales(guid);
CREATE INDEX idx_receptores_fiscales_deleted_at ON receptores_fiscales(deleted_at);
CREATE INDEX idx_receptores_fiscales_rfc ON receptores_fiscales(rfc);
