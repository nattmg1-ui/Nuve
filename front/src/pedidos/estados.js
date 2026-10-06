// back/src/pedidos/estados.js
// Reglas para cambiar el estado de un pedido. El orden es fijo:
//   PENDIENTE -> PAGADO -> ENVIADO -> ENTREGADO
// CANCELADO solo se permite antes de que el pedido salga (PENDIENTE o PAGADO).
// ENTREGADO y CANCELADO son estados finales: ya no se pueden modificar,
// para evitar malentendidos con el cliente.

import { datosInvalidos } from '../auth/errores.js';

export const TRANSICIONES = {
  PENDIENTE: ['PAGADO', 'CANCELADO'],
  PAGADO: ['ENVIADO', 'CANCELADO'],
  ENVIADO: ['ENTREGADO'],
  ENTREGADO: [],
  CANCELADO: [],
};

/** Estados a los que puede pasar un pedido desde su estado actual. */
export const estadosSiguientes = (estado) => TRANSICIONES[estado] ?? [];

/** Lanza un error si el cambio de estado no está permitido. */
export function validarTransicion(actual, nuevo) {
  if (!(nuevo in TRANSICIONES)) {
    throw datosInvalidos('Estado de pedido inválido.');
  }
  if (actual === nuevo) {
    throw datosInvalidos(`El pedido ya está en estado ${nuevo}.`);
  }
  const permitidos = estadosSiguientes(actual);
  if (permitidos.length === 0) {
    throw datosInvalidos(`El pedido está ${actual} y ya no se puede modificar.`);
  }
  if (!permitidos.includes(nuevo)) {
    throw datosInvalidos(
      `Un pedido ${actual} no puede pasar a ${nuevo}. Opciones válidas: ${permitidos.join(' o ')}.`
    );
  }
}