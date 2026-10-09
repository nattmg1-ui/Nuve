// back/src/pagos/servicio.js
// Reglas comunes a Mercado Pago y PayPal:
//   - Solo el dueño del pedido puede pagarlo, y solo mientras esté PENDIENTE.
//   - El monto siempre es el total guardado en la base (el navegador no lo manda).
//   - Un pedido se marca PAGADO solo después de que el servicio de pago confirma
//     el cobro, y una sola vez (si llega dos veces la misma confirmación, no pasa nada).

import { pool, query } from '../db.js';
import { ROLES } from '../auth/config.js';
import { datosInvalidos, sinPermiso } from '../auth/errores.js';

/** Pedido listo para cobrarse. Lanza un error si no es del usuario o ya no está pendiente. */
export async function pedidoParaPagar(ctx, pedidoId) {
  const { rows } = await query('SELECT id, usuario_id, total, estado FROM pedido WHERE id = $1', [pedidoId]);
  const pedido = rows[0];
  if (!pedido) throw datosInvalidos('El pedido no existe.');
  if (String(pedido.usuario_id) !== String(ctx.usuario.id)) throw sinPermiso('Ese pedido no es tuyo.');
  if (pedido.estado !== 'PENDIENTE') throw datosInvalidos(`Este pedido ya no se puede pagar (está ${pedido.estado}).`);

  const { rows: usuario } = await query('SELECT correo, nombre FROM usuario WHERE id = $1', [pedido.usuario_id]);
  return {
    id: String(pedido.id),
    total: Number(pedido.total),
    correo: usuario[0]?.correo ?? null,
    nombre: usuario[0]?.nombre ?? null,
  };
}

/** Revisa que el pedido exista y sea del usuario (o que el usuario sea personal de la tienda). */
export async function asegurarPedidoDelUsuario(ctx, pedidoId) {
  const { rows } = await query('SELECT usuario_id FROM pedido WHERE id = $1', [pedidoId]);
  if (!rows[0]) throw datosInvalidos('El pedido no existe.');
  const esStaff = ctx.usuario.rol === ROLES.ADMIN || ctx.usuario.rol === ROLES.OPERADOR;
  if (!esStaff && String(rows[0].usuario_id) !== String(ctx.usuario.id)) throw sinPermiso('Ese pedido no es tuyo.');
}

/**
 * Marca el pedido como PAGADO con los datos del cobro ya confirmado por el servicio.
 * Devuelve true si quedó pagado (o ya lo estaba con ese mismo pago).
 */
export async function registrarPago({ pedidoId, metodo, transaccionId, monto }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // FOR UPDATE: si la misma confirmación llega dos veces al mismo tiempo, la segunda espera
    const { rows } = await client.query(
      'SELECT estado, total, metodo_pago, transaccion_pago_id FROM pedido WHERE id = $1 FOR UPDATE',
      [pedidoId]
    );
    const pedido = rows[0];
    if (!pedido) throw datosInvalidos('El pedido no existe.');

    // Ya estaba pagado con este mismo cobro: no se hace nada
    if (pedido.metodo_pago === metodo && pedido.transaccion_pago_id === String(transaccionId)) {
      await client.query('COMMIT');
      return true;
    }
    if (pedido.estado !== 'PENDIENTE') {
      throw datosInvalidos(
        `El cobro se recibió, pero el pedido #${pedidoId} está ${pedido.estado}. Contacta a la tienda para revisarlo.`
      );
    }
    if (Math.abs(Number(pedido.total) - Number(monto)) > 0.01) {
      throw datosInvalidos(`El monto cobrado ($${monto}) no coincide con el total del pedido ($${pedido.total}).`);
    }

    await client.query(
      `UPDATE pedido SET estado = 'PAGADO', metodo_pago = $1, transaccion_pago_id = $2, fecha_pago = NOW()
       WHERE id = $3`,
      [metodo, String(transaccionId), pedidoId]
    );
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}