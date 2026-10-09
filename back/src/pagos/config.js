// back/src/pagos/config.js
// Configuración de los pagos. Todo sale de variables de entorno (.env en local,
// "Environment" en Render). Las llaves NUNCA van en el código ni en el front.

import 'dotenv/config';

export const PAGOS = {
  // A dónde regresa el cliente después de pagar (la tienda en Astro)
  frontUrl: (process.env.FRONT_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  moneda: 'MXN',

  mercadoPago: {
    accessToken: process.env.MP_ACCESS_TOKEN || '',
    api: (process.env.MP_API || 'https://api.mercadopago.com').replace(/\/+$/, ''),
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    secret: process.env.PAYPAL_CLIENT_SECRET || '',
    // Sandbox mientras se prueba; en producción sería https://api-m.paypal.com
    api: (process.env.PAYPAL_API || 'https://api-m.sandbox.paypal.com').replace(/\/+$/, ''),
  },
};

/** true si hay llave de Mercado Pago configurada */
export const mercadoPagoConfigurado = () => Boolean(PAGOS.mercadoPago.accessToken);

/** URL de la página de resultado del pago en la tienda. */
export const urlResultado = (params) => `${PAGOS.frontUrl}/pago/resultado?${new URLSearchParams(params)}`;