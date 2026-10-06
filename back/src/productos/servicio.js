// back/src/productos/servicio.js
// Guarda un producto completo (datos + variantes + existencias + imágenes)
// en una sola transacción: o se guarda todo o no se guarda nada.
//
// Al editar:
//   - Variantes con id se actualizan; las nuevas (sin id) se crean.
//   - Las variantes que ya no vienen se DESACTIVAN en lugar de borrarse,
//     porque pueden estar en pedidos anteriores.
//   - Las imágenes se reemplazan completas (no las usa ningún pedido).

import { pool } from '../db.js';
import { datosInvalidos } from '../auth/errores.js';

async function existe(client, tabla, id) {
  const { rowCount } = await client.query(`SELECT 1 FROM ${tabla} WHERE id = $1`, [id]);
  return rowCount > 0;
}

export async function guardarProductoCompleto(productoId, d) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!(await existe(client, 'categoria', d.categoriaId))) throw datosInvalidos('La categoría no existe.');
    if (!(await existe(client, 'marca', d.marcaId))) throw datosInvalidos('La marca no existe.');

    let id = productoId;
    if (id) {
      const { rowCount } = await client.query(
        `UPDATE producto SET categoria_id = $1, marca_id = $2, nombre = $3, descripcion = $4 WHERE id = $5`,
        [d.categoriaId, d.marcaId, d.nombre, d.descripcion, id]
      );
      if (rowCount === 0) throw datosInvalidos('El producto no existe.');
    } else {
      const { rows } = await client.query(
        `INSERT INTO producto (categoria_id, marca_id, nombre, descripcion, activo, fecha_registro)
         VALUES ($1, $2, $3, $4, TRUE, CURRENT_DATE) RETURNING id`,
        [d.categoriaId, d.marcaId, d.nombre, d.descripcion]
      );
      id = rows[0].id;
    }

    // --- Variantes ---
    const idsConservados = [];
    for (const v of d.variantes) {
      let varianteId = v.id;
      if (!varianteId) {
        // Si este producto ya tuvo una variante con ese SKU (quitada antes y por
        // eso desactivada), se reutiliza en lugar de crear una repetida.
        const previa = await client.query('SELECT id FROM variante_producto WHERE sku = $1 AND producto_id = $2', [
          v.sku,
          id,
        ]);
        if (previa.rows[0]) varianteId = previa.rows[0].id;
      }
      if (varianteId) {
        const { rowCount } = await client.query(
          `UPDATE variante_producto SET tono = $1, codigo_hex = $2, presentacion = $3, precio = $4, sku = $5, activo = TRUE
           WHERE id = $6 AND producto_id = $7`,
          [v.tono, v.codigoHex, v.presentacion, v.precio, v.sku, varianteId, id]
        );
        if (rowCount === 0) throw datosInvalidos(`La variante ${v.sku} no pertenece a este producto.`);
      } else {
        const { rows } = await client.query(
          `INSERT INTO variante_producto (producto_id, tono, codigo_hex, presentacion, precio, sku, activo)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id`,
          [id, v.tono, v.codigoHex, v.presentacion, v.precio, v.sku]
        );
        varianteId = rows[0].id;
      }
      idsConservados.push(varianteId);

      // Existencias: crea o actualiza su fila de inventario
      await client.query(
        `INSERT INTO inventario (variante_id, cantidad, fecha_actualizacion)
         VALUES ($1, $2, CURRENT_DATE)
         ON CONFLICT (variante_id) DO UPDATE SET cantidad = EXCLUDED.cantidad, fecha_actualizacion = CURRENT_DATE`,
        [varianteId, v.existencias]
      );
    }

    // Desactiva las variantes que se quitaron en el formulario
    await client.query(
      `UPDATE variante_producto SET activo = FALSE WHERE producto_id = $1 AND NOT (id = ANY($2::int[]))`,
      [id, idsConservados.map(Number)]
    );

    // --- Imágenes: se reemplazan todas ---
    await client.query('DELETE FROM imagen_producto WHERE producto_id = $1', [id]);
    for (const img of d.imagenes) {
      await client.query('INSERT INTO imagen_producto (producto_id, url_imagen, principal) VALUES ($1, $2, $3)', [
        id,
        img.urlImagen,
        img.principal,
      ]);
    }

    await client.query('COMMIT');
    return id;
  } catch (err) {
    await client.query('ROLLBACK');
    // SKU duplicado contra otro producto (restricción UNIQUE de la tabla)
    if (err.code === '23505' && String(err.constraint ?? '').includes('sku')) {
      throw datosInvalidos('Uno de los SKU ya lo usa otro producto. Cada SKU debe ser único.');
    }
    throw err;
  } finally {
    client.release();
  }
}