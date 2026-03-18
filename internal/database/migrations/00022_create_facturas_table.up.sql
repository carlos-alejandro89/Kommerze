CREATE TABLE facturas (
    id SERIAL PRIMARY KEY,
    receptor_id INT,
    uso_cfdi_id INT,
    metodo_pago_id INT,
    forma_pago_id INT,
    uuid VARCHAR(36),
    numero_certificado_emisor VARCHAR(30),
    numero_certificado_sat VARCHAR(30),
    sello_emisor TEXT,
    sello_sat TEXT,
    pac VARCHAR(150),
    version_tfd VARCHAR(20),
    fecha_factura TIMESTAMP NOT NULL,
    es_global BOOLEAN DEFAULT FALSE,
    subtotal DECIMAL(18,6) NOT NULL DEFAULT 0,
    impuestos DECIMAL(18,6) NOT NULL DEFAULT 0,
    descuento DECIMAL(18,6) NOT NULL DEFAULT 0,
    total DECIMAL(18,6) NOT NULL DEFAULT 0,
    estatus VARCHAR(30) DEFAULT 'vigente',
    archivo_xml TEXT,
    archivo_xml_cancelacion TEXT,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_facturas_receptor FOREIGN KEY (receptor_id) REFERENCES receptores_fiscales(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_facturas_uso_cfdi FOREIGN KEY (uso_cfdi_id) REFERENCES sat_usos_cfdi(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_facturas_metodo_pago FOREIGN KEY (metodo_pago_id) REFERENCES sat_metodos_pago(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_facturas_forma_pago FOREIGN KEY (forma_pago_id) REFERENCES sat_formas_pago(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_facturas_guid ON facturas(guid);
CREATE UNIQUE INDEX idx_facturas_uuid ON facturas(uuid);
CREATE INDEX idx_facturas_deleted_at ON facturas(deleted_at);
CREATE INDEX idx_facturas_fecha ON facturas(fecha_factura);
CREATE INDEX idx_facturas_estatus ON facturas(estatus);
