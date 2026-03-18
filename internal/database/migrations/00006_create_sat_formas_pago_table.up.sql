CREATE TABLE sat_formas_pago (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(5) NOT NULL,
    descripcion VARCHAR(250) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_sat_formas_pago_guid ON sat_formas_pago(guid);
CREATE UNIQUE INDEX idx_sat_formas_pago_clave ON sat_formas_pago(clave);
CREATE INDEX idx_sat_formas_pago_deleted_at ON sat_formas_pago(deleted_at);
