CREATE TABLE sat_metodos_pago (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(5) NOT NULL,
    descripcion VARCHAR(250) NOT NULL,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_sat_metodos_pago_guid ON sat_metodos_pago(guid);
CREATE UNIQUE INDEX idx_sat_metodos_pago_clave ON sat_metodos_pago(clave);
CREATE INDEX idx_sat_metodos_pago_deleted_at ON sat_metodos_pago(deleted_at);
