-- back/db/migraciones/006_catalogo_y_resenas.sql
-- Ajustes para los módulos 2, 7 y 9 de la propuesta.
--
-- 1) Categorías: se completan las 11 de la propuesta. Las que ya existen se
--    renombran al plural (Rubor -> Rubores, Iluminador -> Iluminadores) y se
--    agregan las que faltan. No se borra nada.
-- 2) Reseñas: una reseña por persona y producto (si vuelve a opinar, se actualiza la suya).
--
-- Se puede correr más de una vez. Uso (desde la carpeta back):
--   node db/migrar.js db/migraciones/006_catalogo_y_resenas.sql

-- Evita choques de id si los datos de ejemplo se cargaron con ids fijos
SELECT setval(pg_get_serial_sequence('categoria', 'id'), COALESCE((SELECT MAX(id) FROM categoria), 1));
SELECT setval(pg_get_serial_sequence('resena', 'id'), COALESCE((SELECT MAX(id) FROM resena), 1));

UPDATE categoria SET nombre = 'Rubores' WHERE nombre = 'Rubor';
UPDATE categoria SET nombre = 'Iluminadores' WHERE nombre = 'Iluminador';

INSERT INTO categoria (nombre, descripcion, activo)
SELECT v.nombre, v.descripcion, TRUE
FROM (VALUES
  ('Correctores', 'Correctores líquidos y en barra para ojeras e imperfecciones'),
  ('Polvos', 'Polvos sueltos y compactos para sellar el maquillaje'),
  ('Máscaras de pestañas', 'Rímel para volumen, largo y definición'),
  ('Productos para cejas', 'Lápices, geles y pomadas para cejas'),
  ('Sets de maquillaje', 'Kits y paletas combinadas')
) AS v(nombre, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM categoria c WHERE lower(c.nombre) = lower(v.nombre));

-- Si hubiera reseñas repetidas de la misma persona para el mismo producto, se conserva la más reciente
DELETE FROM resena r
USING resena r2
WHERE r.usuario_id = r2.usuario_id AND r.producto_id = r2.producto_id
  AND (r.fecha < r2.fecha OR (r.fecha = r2.fecha AND r.id < r2.id));

CREATE UNIQUE INDEX IF NOT EXISTS uq_resena_usuario_producto ON resena (usuario_id, producto_id);
