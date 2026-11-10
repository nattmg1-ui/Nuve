-- back/db/migraciones/005_imagen_por_tono.sql
-- Cada tono (variante) de un producto puede tener su propia foto.
-- Ejemplo: Labial Mate Pasión en "Rojo" y en "Rosa": cada uno con su imagen.
-- Si un tono no tiene imagen, la tienda muestra la imagen principal del producto.
-- (Las existencias ya son por tono: tabla inventario, una fila por variante.)
--
-- No borra datos y se puede correr más de una vez.
--
-- Uso (desde la carpeta back):
--   node db/migrar.js db/migraciones/005_imagen_por_tono.sql

ALTER TABLE variante_producto ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);
