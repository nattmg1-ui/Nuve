// back/src/tiempoReal/eventos.js
// Eventos en tiempo real (GraphQL Subscriptions).
//
// PubSub es un "tablero de avisos" en memoria:
//   - publish(evento, datos): una parte del backend avisa que algo pasó
//     (se creó un pedido, cambió de estado, se pagó…).
//   - asyncIterableIterator(evento): cada navegador suscrito recibe ese aviso
//     por su conexión WebSocket.
//
// Solo se manda el id del pedido y de su dueño. Los datos completos los arma el
// resolver de la Subscription, así cada quien recibe solo los campos que pidió.
//
// Nota: este PubSub vive en la memoria de UN proceso de Node. Si algún día el
// backend corre en varios servidores, se cambia por uno compartido (Redis o
// LISTEN/NOTIFY de PostgreSQL) sin tocar el resto del código.

import { PubSub } from 'graphql-subscriptions';
import { query } from '../db.js';

export const pubsub = new PubSub();

export const EVENTOS = {
  PEDIDO_NUEVO: 'PEDIDO_NUEVO',
  PEDIDO_ACTUALIZADO: 'PEDIDO_ACTUALIZADO',
  INVENTARIO_ACTUALIZADO: 'INVENTARIO_ACTUALIZADO',
};

/** Avisa que se creó un pedido (lo escuchan admin y operador). */
export function avisarPedidoNuevo(pedidoId, usuarioId) {
  pubsub
    .publish(EVENTOS.PEDIDO_NUEVO, { pedidoId: String(pedidoId), usuarioId: String(usuarioId) })
    .catch((e) => console.warn('[tiempo real] no se pudo avisar pedido nuevo', e.message));
}

/**
 * Avisa que cambiaron existencias o productos (lo escuchan admin y operador).
 * Las ventas y cancelaciones también cambian el stock, pero esas ya avisan con
 * PEDIDO_NUEVO / PEDIDO_ACTUALIZADO.
 */
export function avisarInventarioActualizado() {
  pubsub
    .publish(EVENTOS.INVENTARIO_ACTUALIZADO, { cuando: new Date().toISOString() })
    .catch((e) => console.warn('[tiempo real] no se pudo avisar inventario', e.message));
}

/**
 * Avisa que un pedido cambió (estado, pago o ficha de OXXO).
 * Lo escuchan admin, operador y el cliente dueño del pedido.
 * Si no se conoce el dueño, se busca en la base. Un error aquí nunca detiene la operación.
 */
export async function avisarPedidoActualizado(pedidoId, usuarioId) {
  try {
    let dueño = usuarioId;
    if (!dueño) {
      const { rows } = await query('SELECT usuario_id FROM pedido WHERE id = $1', [pedidoId]);
      dueño = rows[0]?.usuario_id;
    }
    if (!dueño) return;
    await pubsub.publish(EVENTOS.PEDIDO_ACTUALIZADO, { pedidoId: String(pedidoId), usuarioId: String(dueño) });
  } catch (e) {
    console.warn('[tiempo real] no se pudo avisar pedido actualizado', e.message);
  }
}