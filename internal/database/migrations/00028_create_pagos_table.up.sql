CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    forma_id INT,
    pedido_id INT,
    fecha TIMESTAMP,
    monto FLOAT,
    saldo FLOAT,
    sync BOOLEAN DEFAULT FALSE,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_pagos_forma FOREIGN KEY (forma_id) REFERENCES sat_formas_pago(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pagos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_pagos_guid ON pagos(guid);
CREATE INDEX idx_pagos_deleted_at ON pagos(deleted_at);
