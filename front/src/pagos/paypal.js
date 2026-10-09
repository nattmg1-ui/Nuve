// back/src/pagos/paypal.js
// PayPal, Orders API v2 (redirección):
//   1. crearOrden: le decimos a PayPal cuánto cobrar y a dónde regresar.
//      Nos devuelve un link y mandamos al cliente ahí a aprobar el pago.
//   2. Al volver, la tienda trae ?token=<id de la orden>. Revisamos que la orden
//      sea de un pedido del usuario y la "capturamos" (es el momento del cobro).
// Docs: https://developer.paypal.com/docs/api/orders/v2/

import { PAGOS, urlResultado } from './config.js';
import { datosInvalidos } from '../auth/errores.js';

const { paypal: PP } = PAGOS;

// El token de acceso de PayPal dura varias horas: se guarda y se reutiliza
let tokenGuardado = { valor: null, vence: 0 };

async function tokenPaypal() {
  if (!PP.clientId || !PP.secret) {
    throw datosInvalidos('PayPal no está configurado (faltan PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en el backend).');
  }
  if (tokenGuardado.valor && Date.now() < tokenGuardado.vence) return tokenGuardado.valor;

  let respuesta;
  try {
    respuesta = await fetch(`${PP.api}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${PP.clientId}:${PP.secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
  } catch {
    throw datosInvalidos('No se pudo conectar con PayPal. Intenta de nuevo.');
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    console.error('[paypal] token', respuesta.status, JSON.stringify(datos));
    throw datosInvalidos('PayPal rechazó las credenciales. Revisa PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET.');
  }
  // Se renueva 5 minutos antes de que venza
  tokenGuardado = { valor: datos.access_token, vence: Date.now() + (Number(datos.expires_in) - 300) * 1000 };
  return tokenGuardado.valor;
}

async function llamarPaypal(ruta, opciones = {}) {
  const token = await tokenPaypal();
  let respuesta;
  try {
    respuesta = await fetch(`${PP.api}${ruta}`, {
      ...opciones,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opciones.headers || {}) },
    });
  } catch {
    throw datosInvalidos('No se pudo conectar con PayPal. Intenta de nuevo.');
  }
  const datos = await respuesta.json().catch(() => ({}));
  return { ok: respuesta.ok, status: respuesta.status, datos };
}

const errorPaypal = (r) => {
  console.error('[paypal]', r.status, JSON.stringify(r.datos));
  const detalle = r.datos?.details?.[0]?.description || r.datos?.message || r.status;
  return datosInvalidos(`PayPal rechazó la operación: ${detalle}`);
};

/** Crea la orden de PayPal de un pedido y devuelve el link para pagar. */
export async function crearOrden(pedido) {
  const r = await llamarPaypal('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: pedido.id,
          // custom_id viaja con la orden: así sabemos de qué pedido es al regresar
          custom_id: pedido.id,
          description: `Pedido Nuvé #${pedido.id}`,
          amount: { currency_code: PAGOS.moneda, value: pedido.total.toFixed(2) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'Nuvé',
            locale: 'es-MX',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: urlResultado({ metodo: 'paypal', pedido: pedido.id }),
            cancel_url: urlResultado({ metodo: 'paypal', pedido: pedido.id, cancelado: '1' }),
          },
        },
      },
    }),
  });
  if (!r.ok) throw errorPaypal(r);

  const link = r.datos.links?.find((l) => l.rel === 'payer-action' || l.rel === 'approve');
  if (!link) throw datosInvalidos('PayPal no devolvió el link de pago.');
  return link.href;
}

/** Pedido al que pertenece una orden de PayPal (sin cobrar todavía). */
export async function pedidoDeOrden(ordenId) {
  if (!/^[A-Z0-9]{5,40}$/.test(String(ordenId))) throw datosInvalidos('Orden de PayPal inválida.');
  const r = await llamarPaypal(`/v2/checkout/orders/${ordenId}`);
  if (!r.ok) throw errorPaypal(r);
  const unidad = r.datos.purchase_units?.[0];
  return { pedidoId: unidad?.custom_id ?? unidad?.reference_id ?? null, estado: r.datos.status };
}

/**
 * Cobra (captura) una orden ya aprobada por el cliente. Si ya se había cobrado,
 * solo la consulta. Devuelve el resultado (APROBADO, PENDIENTE o RECHAZADO),
 * el monto y el id del cobro.
 */
export async function capturarOrden(ordenId) {
  let r = await llamarPaypal(`/v2/checkout/orders/${ordenId}/capture`, { method: 'POST', body: '{}' });

  // Ya se había cobrado antes (por ejemplo, el cliente recargó la página): se consulta
  if (!r.ok && r.datos?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
    r = await llamarPaypal(`/v2/checkout/orders/${ordenId}`);
  }
  // El cliente regresó sin aprobar el pago
  if (!r.ok && r.datos?.details?.[0]?.issue === 'ORDER_NOT_APPROVED') {
    return { resultado: 'RECHAZADO', monto: 0, transaccionId: null, detalle: 'ORDER_NOT_APPROVED' };
  }
  if (!r.ok) throw errorPaypal(r);

  const captura = r.datos.purchase_units?.[0]?.payments?.captures?.[0];
  if (!captura) return { resultado: 'RECHAZADO', monto: 0, transaccionId: null, detalle: r.datos.status };

  let resultado = 'RECHAZADO';
  if (captura.status === 'COMPLETED') resultado = 'APROBADO';
  else if (captura.status === 'PENDING') resultado = 'PENDIENTE';

  if (captura.amount?.currency_code !== PAGOS.moneda) throw datosInvalidos('El pago se hizo en otra moneda.');

  return {
    resultado,
    monto: Number(captura.amount.value),
    transaccionId: captura.id,
    detalle: captura.status_details?.reason || captura.status,
  };
}