-- Migración 00033: Agregar campo synced_at para tracking de sincronización con la nube
-- Cuando synced_at IS NULL, el registro está pendiente de enviar al cloud.
ALTER TABLE operaciones_sucursal
    ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;

ALTER TABLE operacion_cajero
    ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;
