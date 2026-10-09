// back/src/pagos/mercadopago.js
// Mercado Pago, Checkout API (Orders API).
// El cliente escribe su tarjeta DENTRO de Nuvé, en el formulario de Mercado Pago
// (Card Payment Brick). Ese formulario no nos manda la tarjeta: la convierte en un
// "token" de un solo uso. Aquí el backend cobra con ese token:
//   POST /v1/orders  -> Mercado Pago procesa el pago y responde al momento
//                        si se aprobó (processed) o se rechazó (failed).
// Docs: https://www.mercadopago.com.mx/developers/es/docs/checkout-api-orders

import crypto from 'node:crypto';
import { PAGOS } from './config.js';
import { datosInvalidos } from '../auth/errores.js';

const { mercadoPago: MP } = PAGOS;

// Mensajes claros para los rechazos más comunes
const RECHAZOS = {
  cc_rejected_insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
  cc_rejected_bad_filled_security_code: 'El código de seguridad (CVV) es incorrecto.',
  cc_rejected_bad_filled_date: 'La fecha de vencimiento es incorrecta.',
  cc_rejected_bad_filled_card_number: 'El número de tarjeta es incorrecto.',
  cc_rejected_bad_filled_other: 'Revisa los datos de la tarjeta.',
  cc_rejected_call_for_authorize: 'Tu banco necesita que autorices este pago. Llámales e intenta de nuevo.',
  cc_rejected_card_disabled: 'La tarjeta está desactivada. Actívala con tu banco o usa otra.',
  cc_rejected_duplicated_payment: 'Ya hiciste un pago igual hace un momento.',
  cc_rejected_high_risk: 'El pago fue rechazado por seguridad. Intenta con otra tarjeta.',
  cc_rejected_max_attempts: 'Llegaste al límite de intentos. Usa otra tarjeta.',
  cc_rejected_other_reason: 'El banco rechazó el pago. Intenta con otra tarjeta.',
};

/** Busca el status_detail del pago dentro de la respuesta de Mercado Pago. */
function detalleDe(order, cuerpo) {
  const pago = order?.transactions?.payments?.[0];
  if (pago?.status_detail) return pago.status_detail;
  if (order?.status_detail) return order.status_detail;
  // En los rechazos, el detalle a veces viene en errors[].details: ["pay_xxx: cc_rejected_..."]
  const texto = (cuerpo?.errors ?? []).flatMap((e) => e.details ?? []).join(' ');
  return texto.match(/cc_rejected_[a-z_]+/)?.[0] ?? null;
}

/**
 * Cobra un pedido con el token de la tarjeta.
 * El monto sale del pedido guardado en la base, nunca de lo que mande el navegador.
 * Devuelve { resultado: APROBADO | PENDIENTE | RECHAZADO, transaccionId, monto, mensaje }.
 */
export async function pagarConTarjeta(pedido, tarjeta) {
  if (!MP.accessToken) throw datosInvalidos('Mercado Pago no está configurado (falta MP_ACCESS_TOKEN en el backend).');

  const monto = pedido.total.toFixed(2);
  const payer = { email: tarjeta.email };
  if (tarjeta.tipoIdentificacion && tarjeta.numeroIdentificacion) {
    payer.identification = { type: tarjeta.tipoIdentificacion, number: tarjeta.numeroIdentificacion };
  }

  let respuesta;
  try {
    respuesta = await fetch(`${MP.api}/v1/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP.accessToken}`,
        'Content-Type': 'application/json',
        // Llave única por intento: si la misma petición llega dos veces, Mercado Pago no cobra doble
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        type: 'online',
        processing_mode: 'automatic',
        total_amount: monto,
        // Con esto sabemos a qué pedido pertenece el pago
        external_reference: pedido.id,
        payer,
        transactions: {
          payments: [
            {
              amount: monto,
              payment_method: {
                id: tarjeta.metodoPagoId, // marca: visa, master, amex, debvisa…
                type: tarjeta.tipoPago, // credit_card o debit_card
                token: tarjeta.token,
                installments: tarjeta.cuotas,
              },
            },
          ],
        },
      }),
    });
  } catch {
    throw datosInvalidos('No se pudo conectar con Mercado Pago. Intenta de nuevo.');
  }

  const cuerpo = await respuesta.json().catch(() => ({}));

  if (respuesta.status === 401 || respuesta.status === 403) {
    console.error('[mercadopago]', respuesta.status, JSON.stringify(cuerpo));
    throw datosInvalidos('Mercado Pago rechazó las credenciales. Revisa MP_ACCESS_TOKEN.');
  }
  if (respuesta.status === 429 || respuesta.status >= 500) {
    console.error('[mercadopago]', respuesta.status, JSON.stringify(cuerpo));
    throw datosInvalidos('Mercado Pago no respondió. Espera unos segundos e intenta de nuevo.');
  }

  // Si el pago se rechaza, Mercado Pago responde con error y los datos de la order en "data"
  const order = respuesta.ok ? cuerpo : (cuerpo.data ?? cuerpo);
  if (!respuesta.ok) console.warn('[mercadopago] pago no aprobado', respuesta.status, JSON.stringify(cuerpo));

  const detalle = detalleDe(order, cuerpo);
  const estado = order?.status;

  if (respuesta.ok && estado === 'processed') {
    return {
      resultado: 'APROBADO',
      transaccionId: String(order.id),
      monto: Number(order.total_paid_amount ?? order.transactions?.payments?.[0]?.paid_amount ?? monto),
      mensaje: null,
    };
  }
  if (respuesta.ok && ['action_required', 'processing', 'in_process'].includes(estado)) {
    return { resultado: 'PENDIENTE', transaccionId: String(order.id), monto: 0, mensaje: null };
  }
  return {
    resultado: 'RECHAZADO',
    transaccionId: order?.id ? String(order.id) : null,
    monto: 0,
    mensaje: RECHAZOS[detalle] ?? 'La tarjeta fue rechazada. Revisa los datos o intenta con otra tarjeta.',
  };
}