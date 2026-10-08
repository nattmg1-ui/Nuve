-- back/db/migraciones/001_fecha_pedido_con_hora.sql
-- La fecha del pedido pasa de DATE (solo día) a TIMESTAMPTZ (día y hora),
-- para poder graficar las ventas por hora en el panel de administración.
--
-- No borra datos. Los pedidos que ya existen quedan a las 00:00 (hora de
-- la Ciudad de México) de su mismo día. Se puede correr más de una vez:
-- si la columna ya tiene hora, no vuelve a convertirla.
--
-- Uso:
--   psql -U postgres -d nuve_ecommerce -f db/migraciones/001_fecha_pedido_con_hora.sql

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'pedido' AND column_name = 'fecha') = 'date' THEN
    ALTER TABLE pedido
      ALTER COLUMN fecha TYPE TIMESTAMPTZ
      USING (fecha::timestamp AT TIME ZONE 'America/Mexico_City');
  END IF;
END $$;

ALTER TABLE pedido ALTER COLUMN fecha SET DEFAULT NOW();

-- Acelera los reportes de ventas, que siempre filtran por fecha
CREATE INDEX IF NOT EXISTS idx_pedido_fecha ON pedido(fecha);