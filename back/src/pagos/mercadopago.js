// back/src/pagos/mercadopago.js
// Mercado Pago, Checkout Pro (redirección):
//   1. crearPreferencia: le decimos a Mercado Pago cuánto cobrar y a dónde regresar.
//      Nos devuelve un link (init_point) y mandamos al cliente ahí a pagar.
//   2. Al volver, la tienda trae ?payment_id=... y llamamos consultarPago para
//      preguntarle a Mercado Pago, directamente, si ese pago se aprobó y de qué pedido es.
// Docs: https://www.mercadopago.com.mx/developers/es/docs/checkout-pro

import { PAGOS, urlResultado } from './config.js';
import { datosInvalidos } from '../auth/errores.js';

const { mercadoPago: MP } = PAGOS;

async function llamarMP(ruta, opciones = {}) {
  if (!MP.accessToken) throw datosInvalidos('Mercado Pago no está configurado (falta MP_ACCESS_TOKEN en el backend).');
  let respuesta;
  try {
    respuesta = await fetch(`${MP.api}${ruta}`, {
      ...opciones,
      headers: {
        Authorization: `Bearer ${MP.accessToken}`,
        'Content-Type': 'application/json',
        ...(opciones.headers || {}),
      },
    });
  } catch {
    throw datosInvalidos('No se pudo conectar con Mercado Pago. Intenta de nuevo.');
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    console.error('[mercadopago]', respuesta.status, JSON.stringify(datos));
    throw datosInvalidos(`Mercado Pago rechazó la operación: ${datos.message || respuesta.status}`);
  }
  return datos;
}

/** Crea la preferencia de pago de un pedido y devuelve el link para pagar. */
export async function crearPreferencia(pedido) {
  const volver = urlResultado({ metodo: 'mercadopago', pedido: pedido.id });
  const preferencia = await llamarMP('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        {
          id: `pedido-${pedido.id}`,
          title: `Pedido Nuvé #${pedido.id}`,
          quantity: 1,
          currency_id: PAGOS.moneda,
          unit_price: pedido.total,
        },
      ],
      // Con esto sabemos a qué pedido pertenece el pago cuando regresa
      external_reference: pedido.id,
      back_urls: { success: volver, pending: volver, failure: volver },
      // Mercado Pago solo regresa solo (auto_return) a sitios https; en localhost
      // el cliente da clic en "Volver al sitio".
      ...(PAGOS.frontUrl.startsWith('https://') ? { auto_return: 'approved' } : {}),
      // Solo pagos inmediatos (tarjeta y saldo). Sin OXXO ni transferencias,
      // que quedan pendientes días y necesitarían avisos automáticos (webhooks).
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }],
        installments: 1,
      },
      statement_descriptor: 'NUVE',
    }),
  });
  return preferencia.init_point;
}

/**
 * Busca en Mercado Pago los pagos de un pedido (por su external_reference).
 * Sirve cuando el cliente pagó pero no regresó a la tienda: así el pedido se
 * puede marcar como pagado después. Devuelve el pago aprobado si existe; si no,
 * el más reciente; o null si nunca se intentó pagar con Mercado Pago.
 */
export async function buscarPagoDePedido(pedidoId) {
  const params = new URLSearchParams({
    external_reference: String(pedidoId),
    sort: 'date_created',
    criteria: 'desc',
    limit: '20',
  });
  const { results = [] } = await llamarMP(`/v1/payments/search?${params}`);
  const pago = results.find((p) => p.status === 'approved') ?? results[0];
  return pago ? consultarPago(pago.id) : null;
}

/**
 * Consulta un pago en Mercado Pago. Devuelve el pedido al que pertenece,
 * el resultado (APROBADO, PENDIENTE o RECHAZADO), el monto y su id.
 */
export async function consultarPago(pagoId) {
  if (!/^\d{1,20}$/.test(String(pagoId))) throw datosInvalidos('Número de pago inválido.');
  const pago = await llamarMP(`/v1/payments/${pagoId}`);

  let resultado = 'RECHAZADO';
  if (pago.status === 'approved') resultado = 'APROBADO';
  else if (['pending', 'in_process', 'authorized'].includes(pago.status)) resultado = 'PENDIENTE';

  if (pago.currency_id && pago.currency_id !== PAGOS.moneda) {
    throw datosInvalidos('El pago se hizo en otra moneda.');
  }

  return {
    pedidoId: pago.external_reference ? String(pago.external_reference) : null,
    resultado,
    monto: Number(pago.transaction_amount),
    transaccionId: String(pago.id),
    detalle: pago.status_detail || pago.status,
  };
}