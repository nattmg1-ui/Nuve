-- back/db/migraciones/003_pago_oxxo.sql
-- Pago en efectivo en OXXO (Mercado Pago, Checkout API).
-- Guarda en el pedido la ficha que genera Mercado Pago: el número de la orden,
-- la referencia que se dicta en caja, el código de barras, el link de la ficha
-- y la fecha en que vence.
--
-- No se agrega un método de pago nuevo: OXXO se cobra a través de Mercado Pago,
-- así que el pedido pagado queda con metodo_pago = 'MERCADO_PAGO'.
--
-- No borra datos y se puede correr más de una vez.
--
-- Uso:
--   psql -U postgres -d nuve_ecommerce -f db/migraciones/003_pago_oxxo.sql

ALTER TABLE pedido ADD COLUMN IF NOT EXISTS oxxo_orden_id TEXT;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS oxxo_referencia TEXT;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS oxxo_codigo_barras TEXT;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS oxxo_url TEXT;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS oxxo_vence TIMESTAMPTZ;