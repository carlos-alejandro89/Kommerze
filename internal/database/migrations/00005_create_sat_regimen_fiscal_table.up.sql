CREATE TABLE sat_regimen_fiscal (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(10) NOT NULL,
    descripcion VARCHAR(250) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_sat_regimen_fiscal_guid ON sat_regimen_fiscal(guid);
CREATE UNIQUE INDEX idx_sat_regimen_fiscal_clave ON sat_regimen_fiscal(clave);
CREATE INDEX idx_sat_regimen_fiscal_deleted_at ON sat_regimen_fiscal(deleted_at);
