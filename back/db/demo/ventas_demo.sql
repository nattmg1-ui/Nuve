-- back/db/demo/ventas_demo.sql
-- Pedidos de prueba para ver las gráficas del Resumen (Día, Semana y Mes).
-- Crea 60 pedidos cobrados repartidos en los últimos 30 días (5 de ellos hoy),
-- a horas distintas, con 1 a 3 productos cada uno y los precios reales de las variantes.
-- No descuenta inventario. Todos llevan transaccion_pago_id = 'DEMO' para poder borrarlos:
--   DELETE FROM detalle_pedido WHERE pedido_id IN (SELECT id FROM pedido WHERE transaccion_pago_id = 'DEMO');
--   DELETE FROM pedido WHERE transaccion_pago_id = 'DEMO';

DO $$
DECLARE
  dir RECORD;
  v RECORD;
  pid INTEGER;
  cuando TIMESTAMPTZ;
  hoy_local TIMESTAMP := date_trunc('day', NOW() AT TIME ZONE 'America/Mexico_City');
  piezas INTEGER;
  suma NUMERIC(10,2);
  i INTEGER;
  j INTEGER;
BEGIN
  -- Usa la primera dirección que exista (cualquier usuario con dirección)
  SELECT id, usuario_id INTO dir FROM direccion ORDER BY id LIMIT 1;
  IF dir.id IS NULL THEN
    RAISE EXCEPTION 'No hay direcciones. Registra una dirección (haz una compra) y vuelve a correr este archivo.';
  END IF;

  FOR i IN 1..60 LOOP
    IF i <= 5 THEN
      -- 5 pedidos de hoy, entre las 9:00 y la hora actual
      cuando := (hoy_local + make_interval(hours => 9 + (random() * GREATEST(EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/Mexico_City') - 9, 0))::int,
                                           mins => (random() * 59)::int)) AT TIME ZONE 'America/Mexico_City';
      IF cuando > NOW() THEN cuando := NOW() - interval '5 minutes'; END IF;
    ELSE
      -- el resto, en los 29 días anteriores, entre las 8:00 y las 22:59
      cuando := (hoy_local - make_interval(days => 1 + (random() * 28)::int)
                 + make_interval(hours => 8 + (random() * 14)::int, mins => (random() * 59)::int)) AT TIME ZONE 'America/Mexico_City';
    END IF;

    INSERT INTO pedido (usuario_id, direccion_id, fecha, subtotal, total, estado, transaccion_pago_id)
    VALUES (dir.usuario_id, dir.id, cuando, 0, 0,
            (ARRAY['PAGADO','ENVIADO','ENTREGADO','ENTREGADO']::status_pedido[])[1 + (random() * 3)::int],
            'DEMO')
    RETURNING id INTO pid;

    suma := 0;
    FOR j IN 1..(1 + (random() * 2)::int) LOOP
      SELECT id, precio INTO v FROM variante_producto WHERE activo = TRUE ORDER BY random() LIMIT 1;
      piezas := 1 + (random() * 2)::int;
      INSERT INTO detalle_pedido (pedido_id, variante_id, cantidad, precio_unitario, subtotal)
      VALUES (pid, v.id, piezas, v.precio, v.precio * piezas);
      suma := suma + v.precio * piezas;
    END LOOP;

    UPDATE pedido SET subtotal = suma, total = suma WHERE id = pid;
  END LOOP;
END $$;

SELECT COUNT(*) AS pedidos_demo, SUM(total) AS ventas_demo FROM pedido WHERE transaccion_pago_id = 'DEMO';