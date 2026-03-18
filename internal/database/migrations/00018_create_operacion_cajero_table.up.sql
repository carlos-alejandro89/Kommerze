CREATE TABLE operacion_cajero (
    id SERIAL PRIMARY KEY,
    operacion_id INT NOT NULL,
    caja_id INT,
    responsable_caja_id INT NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    importe_apertura DECIMAL(18,6) DEFAULT 0,
    importe_cierre DECIMAL(18,6) DEFAULT 0,
    estatus_id INT,
    bloqueada BOOLEAN DEFAULT FALSE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_operacion_cajero_caja FOREIGN KEY (caja_id) REFERENCES cajas(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_operacion_cajero_responsable_caja FOREIGN KEY (responsable_caja_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_operacion_cajero_estatus FOREIGN KEY (estatus_id) REFERENCES estatus(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_operacion_cajero_guid ON operacion_cajero(guid);
CREATE INDEX idx_operacion_cajero_deleted_at ON operacion_cajero(deleted_at);
CREATE INDEX idx_operacion_cajero_fecha_inicio ON operacion_cajero(fecha_inicio);
