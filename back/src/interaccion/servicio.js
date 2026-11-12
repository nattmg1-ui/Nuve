// back/src/interaccion/servicio.js
// Módulos 4 y 7 de la propuesta: favoritos, reseñas, calificación,
// popularidad y productos relacionados.
//
// Reglas:
//   - Favoritos: cada cliente tiene su lista; agregar dos veces el mismo producto no duplica.
//   - Reseñas: solo puede opinar quien COMPRÓ el producto (pedido PAGADO, ENVIADO o ENTREGADO).
//     Una reseña por persona y producto: si vuelve a escribir, se actualiza la suya.
//   - En la tienda, el autor de una reseña se muestra como "Valeria G." (sin correo).
import { query } from '../db.js';
import { datosInvalidos } from '../auth/errores.js';

const ESTADOS_COBRADOS = "('PAGADO', 'ENVIADO', 'ENTREGADO')";

/** "Valeria Gomez" -> "Valeria G." */
export function nombrePublico(nombre) {
  const partes = String(nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'Cliente';
  return partes.length > 1 ? `${partes[0]} ${partes[1][0].toUpperCase()}.` : partes[0];
}

const fechaIso = (f) => (f instanceof Date ? f.toISOString().slice(0, 10) : String(f).slice(0, 10));

// ---------------------------------------------------------------------
// Calificación y popularidad
// ---------------------------------------------------------------------

export async function estadisticasResenas(productoId) {
  const { rows } = await query(
    'SELECT AVG(calificacion)::float AS promedio, COUNT(*)::int AS total FROM resena WHERE producto_id = $1',
    [productoId]
  );
  return {
    promedio: rows[0].total > 0 ? Math.round(rows[0].promedio * 10) / 10 : null,
    total: rows[0].total,
  };
}

/** Piezas vendidas del producto (pedidos cobrados). Se usa para ordenar por popularidad. */
export async function piezasVendidas(productoId) {
  const { rows } = await query(
    `SELECT COALESCE(SUM(d.cantidad), 0)::int AS piezas
     FROM detalle_pedido d
     JOIN pedido p ON p.id = d.pedido_id
     JOIN variante_producto v ON v.id = d.variante_id
     WHERE v.producto_id = $1 AND p.estado IN ${ESTADOS_COBRADOS}`,
    [productoId]
  );
  return rows[0].piezas;
}

// ---------------------------------------------------------------------
// Favoritos
// ---------------------------------------------------------------------

export async function esFavorito(ctx, productoId) {
  if (!ctx.usuario) return false;
  const { rowCount } = await query('SELECT 1 FROM favorito WHERE usuario_id = $1 AND producto_id = $2', [
    ctx.usuario.id,
    productoId,
  ]);
  return rowCount > 0;
}

/** Agrega o quita el producto de los favoritos. Devuelve true si quedó como favorito. */
export async function alternarFavorito(ctx, productoId) {
  const { rowCount: existeProducto } = await query('SELECT 1 FROM producto WHERE id = $1', [productoId]);
  if (!existeProducto) throw datosInvalidos('El producto no existe.');

  const borrado = await query('DELETE FROM favorito WHERE usuario_id = $1 AND producto_id = $2', [
    ctx.usuario.id,
    productoId,
  ]);
  if (borrado.rowCount > 0) return false;

  await query(
    `INSERT INTO favorito (usuario_id, producto_id, fecha_agregado) VALUES ($1, $2, CURRENT_DATE)
     ON CONFLICT (usuario_id, producto_id) DO NOTHING`,
    [ctx.usuario.id, productoId]
  );
  return true;
}

/** Productos favoritos del usuario (solo los que siguen activos), del más reciente al más antiguo. */
export async function misFavoritos(ctx) {
  const { rows } = await query(
    `SELECT p.* FROM favorito f JOIN producto p ON p.id = f.producto_id
     WHERE f.usuario_id = $1 AND p.activo = TRUE
     ORDER BY f.fecha_agregado DESC, f.id DESC`,
    [ctx.usuario.id]
  );
  return rows;
}

// ---------------------------------------------------------------------
// Reseñas
// ---------------------------------------------------------------------

/** ¿El usuario compró (y pagó) alguna variante de este producto? */
export async function comproProducto(usuarioId, productoId) {
  const { rowCount } = await query(
    `SELECT 1 FROM pedido p
     JOIN detalle_pedido d ON d.pedido_id = p.id
     JOIN variante_producto v ON v.id = d.variante_id
     WHERE p.usuario_id = $1 AND v.producto_id = $2 AND p.estado IN ${ESTADOS_COBRADOS}
     LIMIT 1`,
    [usuarioId, productoId]
  );
  return rowCount > 0;
}

export async function puedoResenar(ctx, productoId) {
  if (!ctx.usuario) return false;
  return comproProducto(ctx.usuario.id, productoId);
}

const mapResenaPublica = (r, ctx) => ({
  id: String(r.id),
  autor: nombrePublico(r.nombre),
  calificacion: r.calificacion,
  comentario: r.comentario,
  compraVerificada: r.compra_verificada,
  fecha: fechaIso(r.fecha),
  esMia: Boolean(ctx.usuario && String(ctx.usuario.id) === String(r.usuario_id)),
});

/** Reseñas visibles en la tienda (la propia primero, luego de la más reciente). */
export async function resenasPublicas(ctx, productoId) {
  const { rows } = await query(
    `SELECT r.*, u.nombre FROM resena r JOIN usuario u ON u.id = r.usuario_id
     WHERE r.producto_id = $1
     ORDER BY (r.usuario_id = $2) DESC, r.fecha DESC, r.id DESC`,
    [productoId, ctx.usuario?.id ?? 0]
  );
  return rows.map((r) => mapResenaPublica(r, ctx));
}

/** Crea o actualiza la reseña del usuario para ese producto. */
export async function escribirResena(ctx, { productoId, calificacion, comentario }) {
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    throw datosInvalidos('Elige una calificación de 1 a 5 estrellas.');
  }
  const texto = typeof comentario === 'string' ? comentario.trim() : '';
  if (texto.length > 1000) throw datosInvalidos('La reseña es muy larga (máximo 1000 caracteres).');

  if (!(await comproProducto(ctx.usuario.id, productoId))) {
    throw datosInvalidos('Solo puedes opinar sobre productos que compraste y pagaste.');
  }

  const actualizada = await query(
    `UPDATE resena SET calificacion = $1, comentario = $2, compra_verificada = TRUE, fecha = CURRENT_DATE
     WHERE usuario_id = $3 AND producto_id = $4 RETURNING id`,
    [calificacion, texto || null, ctx.usuario.id, productoId]
  );
  let resenaId = actualizada.rows[0]?.id;
  if (!resenaId) {
    const nueva = await query(
      `INSERT INTO resena (usuario_id, producto_id, calificacion, comentario, compra_verificada, fecha)
       VALUES ($1, $2, $3, $4, TRUE, CURRENT_DATE) RETURNING id`,
      [ctx.usuario.id, productoId, calificacion, texto || null]
    );
    resenaId = nueva.rows[0].id;
  }

  const { rows } = await query(
    'SELECT r.*, u.nombre FROM resena r JOIN usuario u ON u.id = r.usuario_id WHERE r.id = $1',
    [resenaId]
  );
  return mapResenaPublica(rows[0], ctx);
}

export async function eliminarMiResena(ctx, productoId) {
  const { rowCount } = await query('DELETE FROM resena WHERE usuario_id = $1 AND producto_id = $2', [
    ctx.usuario.id,
    productoId,
  ]);
  return rowCount > 0;
}

// ---------------------------------------------------------------------
// Productos relacionados
// ---------------------------------------------------------------------

/**
 * Productos parecidos: primero de la misma categoría, luego de la misma marca.
 * Solo activos y con al menos un tono con existencias.
 */
export async function relacionados(producto, limite = 4) {
  const tope = Math.min(Math.max(Number(limite) || 4, 1), 12);
  const { rows } = await query(
    `SELECT p.* FROM producto p
     WHERE p.id <> $1 AND p.activo = TRUE
       AND (p.categoria_id = $2 OR p.marca_id = $3)
       AND EXISTS (
         SELECT 1 FROM variante_producto v JOIN inventario i ON i.variante_id = v.id
         WHERE v.producto_id = p.id AND v.activo = TRUE AND i.cantidad > 0
       )
     ORDER BY (p.categoria_id = $2) DESC, (p.marca_id = $3) DESC, p.id
     LIMIT $4`,
    [producto.id, producto.categoriaId, producto.marcaId, tope]
  );
  return rows;
}
