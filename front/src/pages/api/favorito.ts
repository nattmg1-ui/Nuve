// front/src/pages/api/favorito.ts
// Agrega o quita un producto de mis favoritos (Módulo 7). Requiere sesión.
// Responde { favorito: true | false } con el estado nuevo.
import type { APIRoute } from 'astro';
import { gql } from '../../lib/graphql';
import { json } from '../../lib/acciones';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { productoId } = (await request.json()) as { productoId?: string };
    const r = await gql<{ alternarFavorito: boolean }>(
      `mutation ($p: ID!) { alternarFavorito(productoId: $p) }`,
      { p: String(productoId ?? '') },
      locals.accessToken
    );
    return json({ favorito: r.alternarFavorito });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'No se pudo actualizar tus favoritos.' }, 400);
  }
};
