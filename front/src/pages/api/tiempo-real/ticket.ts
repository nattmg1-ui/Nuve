// Entrega al navegador un ticket de 60 segundos para abrir la conexión WebSocket
// de las Subscriptions (tiempo real), y la dirección a la que debe conectarse.
//
// El access token NUNCA sale de la cookie httpOnly: el servidor de Astro lo usa
// para pedirle el ticket al backend (mutation ticketTiempoReal). El ticket solo
// sirve para abrir el WebSocket, no para hacer consultas ni compras.
import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';

const URL_BACKEND: string =
  process.env.GRAPHQL_URL ?? (import.meta.env.GRAPHQL_URL as string | undefined) ?? 'http://localhost:4000/';

// Dirección del WebSocket: la misma del backend con ws:// (o wss:// si es https).
// Se puede cambiar con GRAPHQL_WS_URL en el .env del front.
const URL_WS: string =
  process.env.GRAPHQL_WS_URL ??
  (import.meta.env.GRAPHQL_WS_URL as string | undefined) ??
  URL_BACKEND.replace(/^http/, 'ws');

const respuesta = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const GET: APIRoute = async ({ locals }) => {
  try {
    const { ticketTiempoReal } = await gql<{ ticketTiempoReal: string }>(
      `mutation { ticketTiempoReal }`,
      {},
      locals.accessToken
    );
    return respuesta({ ticket: ticketTiempoReal, url: URL_WS }, 200);
  } catch (e) {
    return respuesta({ error: e instanceof Error ? e.message : 'No se pudo obtener el ticket.' }, 401);
  }
};