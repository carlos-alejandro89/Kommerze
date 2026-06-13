-- Rollback migración 00033
ALTER TABLE operaciones_sucursal DROP COLUMN IF EXISTS synced_at;
ALTER TABLE operacion_cajero     DROP COLUMN IF EXISTS synced_at;
