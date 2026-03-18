CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    nombre_comercial VARCHAR(150),
    razon_social VARCHAR(150),
    rfc VARCHAR(13),
    calle VARCHAR(150),
    exterior VARCHAR(20),
    interior VARCHAR(20),
    colonia VARCHAR(150),
    ciudad VARCHAR(150),
    estado VARCHAR(100),
    codigo_postal VARCHAR(5),
    telefono VARCHAR(20),
    correo VARCHAR(200),
    logo TEXT,
    regimen_fiscal_id INT,
    certificado TEXT,
    llave TEXT,
    password VARCHAR(50),
    sync BOOLEAN DEFAULT FALSE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_empresas_regimen_fiscal FOREIGN KEY (regimen_fiscal_id) REFERENCES sat_regimen_fiscal(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_empresas_guid ON empresas(guid);
CREATE INDEX idx_empresas_deleted_at ON empresas(deleted_at);
