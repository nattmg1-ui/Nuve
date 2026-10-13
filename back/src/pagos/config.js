// back/src/pagos/config.js
// Configuración de los pagos. Todo sale de variables de entorno (.env en local,
// "Environment" en Render). Las llaves NUNCA van en el código ni en el front.

import 'dotenv/config';

export const PAGOS = {
  // A dónde regresa el cliente después de pagar con PayPal (la tienda en Astro)
  frontUrl: (process.env.FRONT_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  moneda: 'MXN',

  mercadoPago: {
    // Access Token de prueba (empieza con APP_USR-). Es secreto: solo en el backend.
    accessToken: process.env.MP_ACCESS_TOKEN || '',
    api: (process.env.MP_API || 'https://api.mercadopago.com').replace(/\/+$/, ''),
    // Opcional, solo pruebas: correo con el que se generan las fichas de OXXO
    // (Mercado Pago pide un correo @testuser.com en sandbox). Vacío = correo del cliente.
    emailPrueba: process.env.MP_EMAIL_PRUEBA || '',
  },

  oxxo: {
    // Días que tiene el cliente para pagar la ficha (Mercado Pago permite de 1 a 30)
    diasVigencia: Math.min(30, Math.max(1, Number(process.env.OXXO_DIAS_VIGENCIA) || 3)),
    // En sandbox no se puede pagar una ficha de verdad. Con "true" el admin ve un
    // botón para simular el pago. En producción debe ir en false (o no ponerse).
    simular: process.env.OXXO_SIMULAR === 'true',
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    secret: process.env.PAYPAL_CLIENT_SECRET || '',
    // Sandbox mientras se prueba; en producción sería https://api-m.paypal.com
    api: (process.env.PAYPAL_API || 'https://api-m.sandbox.paypal.com').replace(/\/+$/, ''),
  },
};

/** URL de la página de resultado del pago en la tienda. */
export const urlResultado = (params) => `${PAGOS.frontUrl}/pago/resultado?${new URLSearchParams(params)}`;