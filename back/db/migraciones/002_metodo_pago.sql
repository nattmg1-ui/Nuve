-- back/db/migraciones/002_metodo_pago.sql
-- Agrega al pedido con qué se pagó (Mercado Pago o PayPal) y cuándo se pagó.
-- El número de la transacción ya existía: transaccion_pago_id.
--
-- No borra datos y se puede correr más de una vez.
--
-- Uso:
--   psql -U postgres -d nuve_ecommerce -f db/migraciones/002_metodo_pago.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metodo_pago') THEN
    CREATE TYPE metodo_pago AS ENUM ('MERCADO_PAGO', 'PAYPAL');
  END IF;
END $$;

ALTER TABLE pedido ADD COLUMN IF NOT EXISTS metodo_pago metodo_pago;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;

-- Un mismo pago (de Mercado Pago o de PayPal) no puede registrarse en dos pedidos
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedido_pago_unico
  ON pedido (metodo_pago, transaccion_pago_id)
  WHERE metodo_pago IS NOT NULL;