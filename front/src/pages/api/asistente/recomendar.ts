// front/src/pages/api/asistente/recomendar.ts
// Asistente de compras (API de Gemini, a través del backend). Requiere sesión.
import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { json } from '../../../lib/acciones';

const MUTATION = `
  mutation ($mensaje: String!, $historial: [MensajeChat!]) {
    pedirRecomendacion(mensaje: $mensaje, historial: $historial) {
      respuesta
      recomendaciones { productoId varianteId nombre marca tono codigoHex precio imagenUrl motivo }
    }
  }`;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { mensaje, historial } = (await request.json()) as { mensaje?: string; historial?: unknown[] };
    const r = await gql<{ pedirRecomendacion: unknown }>(
      MUTATION,
      { mensaje: String(mensaje ?? ''), historial: Array.isArray(historial) ? historial : [] },
      locals.accessToken
    );
    return json(r.pedirRecomendacion);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'El asistente no está disponible.' }, 400);
  }
};
