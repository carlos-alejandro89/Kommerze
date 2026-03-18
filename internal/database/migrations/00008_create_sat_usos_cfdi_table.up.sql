CREATE TABLE sat_usos_cfdi (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(5) NOT NULL,
    descripcion VARCHAR(250) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_sat_usos_cfdi_guid ON sat_usos_cfdi(guid);
CREATE UNIQUE INDEX idx_sat_usos_cfdi_clave ON sat_usos_cfdi(clave);
CREATE INDEX idx_sat_usos_cfdi_deleted_at ON sat_usos_cfdi(deleted_at);
