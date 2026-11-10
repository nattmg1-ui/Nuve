// front/src/pages/api/tipo-cambio.ts
// Entrega al navegador los tipos de cambio (ExchangeRate API, consultada por el backend).
import type { APIRoute } from 'astro';
import { gql } from '../../lib/graphql';
import { json } from '../../lib/acciones';

const QUERY = `{ tiposDeCambio { base actualizado fuente tasas { moneda tasa } } }`;

export const GET: APIRoute = async () => {
  try {
    const r = await gql<{ tiposDeCambio: unknown }>(QUERY);
    return new Response(JSON.stringify(r.tiposDeCambio), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' },
    });
  } catch {
    return json({ base: 'MXN', actualizado: null, fuente: 'ExchangeRate API', tasas: [] });
  }
};
