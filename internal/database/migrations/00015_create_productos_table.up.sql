CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    producto_base_id INT,
    sat_producto_id INT,
    prefijo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    objeto_impuesto TEXT,
    fraccionable BOOLEAN DEFAULT FALSE,
    informacion_producto JSONB,
    caracteristicas JSONB,
    instrucciones_uso JSONB,
    linea_id INT,
    marca_id INT,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_productos_linea FOREIGN KEY (linea_id) REFERENCES lineas(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_productos_marca FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_productos_sat_producto FOREIGN KEY (sat_producto_id) REFERENCES sat_productos(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_productos_guid ON productos(guid);
CREATE INDEX idx_productos_deleted_at ON productos(deleted_at);
CREATE INDEX idx_productos_prefijo ON productos(prefijo);
CREATE INDEX idx_productos_informacion_producto ON productos USING GIN (informacion_producto);
CREATE INDEX idx_productos_caracteristicas ON productos USING GIN (caracteristicas);
CREATE INDEX idx_productos_instrucciones_uso ON productos USING GIN (instrucciones_uso);
