CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    razon_social VARCHAR(200) NOT NULL,
    rfc VARCHAR(20),
    correo VARCHAR(150),
    telefono VARCHAR(30),
    credito_maximo DECIMAL(18,6) DEFAULT 0,
    dias_credito INT DEFAULT 0,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_clientes_guid ON clientes(guid);
CREATE INDEX idx_clientes_deleted_at ON clientes(deleted_at);
CREATE INDEX idx_clientes_razon_social ON clientes(razon_social);
CREATE INDEX idx_clientes_rfc ON clientes(rfc);
