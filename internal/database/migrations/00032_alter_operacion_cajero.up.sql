-- Migración 00032: Alinear tabla operacion_cajero con el modelo C# de KommerzeApiCloud
-- Renombrar columnas existentes
ALTER TABLE operacion_cajero
    RENAME COLUMN importe_apertura TO fondo_caja_apertura;

ALTER TABLE operacion_cajero
    RENAME COLUMN importe_cierre TO fondo_caja_cierre;

-- Agregar columnas faltantes para alineación completa con el modelo cloud
ALTER TABLE operacion_cajero
    ADD COLUMN IF NOT EXISTS retiros_efectivo      DECIMAL(18,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ingreso_efectivo      DECIMAL(18,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ingreso_tarjetas      DECIMAL(18,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ingreso_cheques       DECIMAL(18,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ingreso_transferencia DECIMAL(18,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ingreso_otros         DECIMAL(18,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS caja_nombre           VARCHAR(100);
