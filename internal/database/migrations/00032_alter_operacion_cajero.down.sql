-- Rollback migración 00032
ALTER TABLE operacion_cajero
    RENAME COLUMN fondo_caja_apertura TO importe_apertura;

ALTER TABLE operacion_cajero
    RENAME COLUMN fondo_caja_cierre TO importe_cierre;

ALTER TABLE operacion_cajero
    DROP COLUMN IF EXISTS retiros_efectivo,
    DROP COLUMN IF EXISTS ingreso_efectivo,
    DROP COLUMN IF EXISTS ingreso_tarjetas,
    DROP COLUMN IF EXISTS ingreso_cheques,
    DROP COLUMN IF EXISTS ingreso_transferencia,
    DROP COLUMN IF EXISTS ingreso_otros,
    DROP COLUMN IF EXISTS caja_nombre;
