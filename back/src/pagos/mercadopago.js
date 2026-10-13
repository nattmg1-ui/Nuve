// back/src/pagos/mercadopago.js
// Mercado Pago, Checkout API (Orders API).
// Dos formas de pago con la misma API:
//   1) Tarjeta: se cobra al momento (pagarConTarjeta).
//   2) Efectivo en OXXO: se genera una ficha y el cliente paga después en tienda
//      (crearFichaOxxo, consultarOrden, cancelarOrden).
//
// Tarjeta: el cliente escribe su tarjeta DENTRO de Nuvé, en el formulario de Mercado Pago
// (Card Payment Brick). Ese formulario no nos manda la tarjeta: la convierte en un
// "token" de un solo uso. Aquí el backend cobra con ese token:
//   POST /v1/orders  -> Mercado Pago procesa el pago y responde al momento
//                        si se aprobó (processed) o se rechazó (failed).
// Docs: https://www.mercadopago.com.mx/developers/es/docs/checkout-api-orders

import crypto from 'node:crypto';
import { PAGOS } from './config.js';
import { datosInvalidos } from '../auth/errores.js';

const { mercadoPago: MP, oxxo: OXXO } = PAGOS;

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

// ======================================================================
// OXXO (pago en efectivo)
// ======================================================================
// Flujo:
//   1. POST /v1/orders con payment_method { id: 'oxxo', type: 'ticket' }.
//      Mercado Pago responde con la ficha: referencia, código de barras y link.
//      La orden queda en "action_required" (esperando pago).
//   2. El cliente paga en caja. Puede tardar horas o días.
//   3. Para saber si ya pagó: GET /v1/orders/{id}. Si está "processed", se pagó.
//   4. Si la ficha vence sin pago, se cancela la orden y el pedido.

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Llamada genérica a la API de Mercado Pago. Devuelve { ok, status, cuerpo }. */
async function peticionMp(ruta, { method = 'GET', body, llave } = {}) {
  if (!MP.accessToken) throw datosInvalidos('Mercado Pago no está configurado (falta MP_ACCESS_TOKEN en el backend).');
  const headers = { Authorization: `Bearer ${MP.accessToken}` };
  if (body) headers['Content-Type'] = 'application/json';
  if (method === 'POST') headers['X-Idempotency-Key'] = llave ?? crypto.randomUUID();

  let respuesta;
  try {
    respuesta = await fetch(`${MP.api}${ruta}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
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
  return { ok: respuesta.ok, status: respuesta.status, cuerpo };
}

/** Saca de la orden los datos de la ficha (están dentro del pago). */
function datosFicha(order) {
  const metodo = order?.transactions?.payments?.[0]?.payment_method ?? {};
  return {
    url: metodo.ticket_url ?? null,
    referencia: metodo.reference ?? null,
    codigoBarras: metodo.barcode_content ?? null,
  };
}

/**
 * Genera la ficha de OXXO de un pedido.
 * "intento" hace única la llave de idempotencia: si el cliente da doble clic,
 * Mercado Pago regresa la misma ficha en lugar de crear dos.
 * Devuelve { ordenId, url, referencia, codigoBarras, vence }.
 */
export async function crearFichaOxxo(pedido, intento = 'primera') {
  const monto = pedido.total.toFixed(2);
  const payer = { email: MP.emailPrueba || pedido.correo };
  if (pedido.nombre) payer.first_name = pedido.nombre.split(' ')[0];

  const { ok, cuerpo } = await peticionMp('/v1/orders', {
    method: 'POST',
    llave: `nuve-oxxo-${pedido.id}-${intento}`,
    body: {
      type: 'online',
      processing_mode: 'automatic',
      total_amount: monto,
      external_reference: pedido.id,
      // Tiempo para pagar, en formato ISO 8601: P3D = 3 días
      expiration_time: `P${OXXO.diasVigencia}D`,
      payer,
      transactions: {
        payments: [{ amount: monto, payment_method: { id: 'oxxo', type: 'ticket' } }],
      },
    },
  });

  if (!ok || !cuerpo?.id) {
    console.error('[mercadopago] no se generó la ficha OXXO', JSON.stringify(cuerpo));
    const detalle = (cuerpo?.errors ?? []).map((e) => e.message).filter(Boolean).join(' ');
    throw datosInvalidos(`No se pudo generar la ficha de OXXO.${detalle ? ` (${detalle})` : ''}`);
  }

  // La orden puede llegar todavía "processing", sin la ficha. Se consulta unas veces más.
  let order = cuerpo;
  let ficha = datosFicha(order);
  for (let i = 0; i < 3 && !ficha.referencia; i += 1) {
    await esperar(1000);
    const consulta = await peticionMp(`/v1/orders/${encodeURIComponent(order.id)}`);
    if (consulta.ok) {
      order = consulta.cuerpo;
      ficha = datosFicha(order);
    }
  }

  return {
    ordenId: String(order.id),
    ...ficha,
    vence: new Date(Date.now() + OXXO.diasVigencia * 24 * 60 * 60 * 1000),
  };
}

/**
 * Consulta en Mercado Pago cómo va una orden.
 * Devuelve { estado, pagado, terminado, monto, url, referencia, codigoBarras }.
 *   pagado    -> el cliente ya pagó en OXXO
 *   terminado -> la orden ya no se puede pagar (venció, se canceló o falló)
 */
export async function consultarOrden(ordenId) {
  const { ok, cuerpo } = await peticionMp(`/v1/orders/${encodeURIComponent(ordenId)}`);
  if (!ok) throw datosInvalidos('No se pudo consultar el pago en Mercado Pago. Intenta más tarde.');
  const estado = cuerpo.status;
  return {
    estado,
    pagado: estado === 'processed',
    terminado: ['expired', 'canceled', 'cancelled', 'failed'].includes(estado),
    monto: Number(cuerpo.total_paid_amount ?? cuerpo.transactions?.payments?.[0]?.paid_amount ?? 0),
    ...datosFicha(cuerpo),
  };
}

/**
 * Cancela una ficha que ya no se va a usar (venció, se canceló el pedido o se pagó
 * de otra forma). Si falla no detiene nada: solo se registra en la consola.
 */
export async function cancelarOrden(ordenId) {
  try {
    const { ok, cuerpo } = await peticionMp(`/v1/orders/${encodeURIComponent(ordenId)}/cancel`, {
      method: 'POST',
      llave: `nuve-cancelar-${ordenId}`,
    });
    if (!ok) console.warn('[mercadopago] no se canceló la orden', ordenId, JSON.stringify(cuerpo));
  } catch (e) {
    console.warn('[mercadopago] no se canceló la orden', ordenId, e.message);
  }
}