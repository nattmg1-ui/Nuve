// front/src/pages/api/admin/asistente.ts
// Asistente de reportes del panel (API de Gemini, a través del backend). Solo ADMIN.
import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { json } from '../../../lib/acciones';

const MUTATION = `
  mutation ($mensaje: String!, $historial: [MensajeChat!]) {
    preguntarReportes(mensaje: $mensaje, historial: $historial) { respuesta }
  }`;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { mensaje, historial } = (await request.json()) as { mensaje?: string; historial?: unknown[] };
    const r = await gql<{ preguntarReportes: { respuesta: string } }>(
      MUTATION,
      { mensaje: String(mensaje ?? ''), historial: Array.isArray(historial) ? historial : [] },
      locals.accessToken
    );
    return json(r.preguntarReportes);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'El asistente no está disponible.' }, 400);
  }
};
