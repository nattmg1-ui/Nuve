// back/src/integraciones/tipoCambio.js
// API externa: ExchangeRate API (open.er-api.com), plan abierto, sin llave.
// Da el tipo de cambio del peso (MXN) a otras monedas. Se usa solo para MOSTRAR
// precios aproximados en otras monedas: los cobros siempre son en pesos.
//
// Las tasas se actualizan una vez al día en la API, así que se guardan en
// memoria 6 horas para no consultarla en cada visita. Si la API no responde,
// se siguen usando las últimas tasas obtenidas.

const URL_API = process.env.EXCHANGE_API_URL || 'https://open.er-api.com/v6/latest/MXN';
const DURACION_CACHE_MS = 6 * 60 * 60 * 1000;

// Monedas que ofrece la tienda (además de MXN)
export const MONEDAS = ['USD', 'EUR', 'CAD', 'GBP', 'COP'];

let cache = null; // { base, actualizado, tasas, obtenido }

async function consultarApi() {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), 8000);
  try {
    const r = await fetch(URL_API, { signal: control.signal });
    if (!r.ok) throw new Error(`ExchangeRate API respondió ${r.status}`);
    const datos = await r.json();
    if (datos.result !== 'success' || !datos.rates) throw new Error('ExchangeRate API no devolvió tasas');
    return {
      base: datos.base_code ?? 'MXN',
      actualizado: datos.time_last_update_utc
        ? new Date(datos.time_last_update_utc).toISOString()
        : new Date().toISOString(),
      tasas: MONEDAS.filter((m) => typeof datos.rates[m] === 'number').map((m) => ({ moneda: m, tasa: datos.rates[m] })),
      obtenido: Date.now(),
    };
  } finally {
    clearTimeout(t);
  }
}

/** Tipos de cambio desde MXN. Nunca lanza error: si no hay datos, regresa la lista vacía. */
export async function tiposDeCambio() {
  if (cache && Date.now() - cache.obtenido < DURACION_CACHE_MS) return conFuente(cache);
  try {
    cache = await consultarApi();
  } catch (e) {
    console.error('[tipo de cambio]', e.message);
    if (!cache) return { base: 'MXN', actualizado: null, tasas: [], fuente: 'ExchangeRate API (sin conexión)' };
  }
  return conFuente(cache);
}

const conFuente = (c) => ({ base: c.base, actualizado: c.actualizado, tasas: c.tasas, fuente: 'ExchangeRate API' });
