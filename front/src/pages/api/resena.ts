// front/src/pages/api/resena.ts
// Escribe, actualiza o borra mi reseña de un producto (Módulo 7). Requiere sesión.
// El backend solo la acepta si el cliente compró y pagó el producto.
import type { APIRoute } from 'astro';
import { gql } from '../../lib/graphql';
import { json } from '../../lib/acciones';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { productoId, calificacion, comentario, eliminar } = (await request.json()) as {
      productoId?: string;
      calificacion?: number;
      comentario?: string;
      eliminar?: boolean;
    };
    if (eliminar) {
      await gql(`mutation ($p: ID!) { eliminarMiResena(productoId: $p) }`, { p: String(productoId ?? '') }, locals.accessToken);
      return json({ ok: true });
    }
    const r = await gql<{ escribirResena: unknown }>(
      `mutation ($p: ID!, $c: Int!, $t: String) {
        escribirResena(productoId: $p, calificacion: $c, comentario: $t) { id autor calificacion comentario compraVerificada fecha esMia }
      }`,
      { p: String(productoId ?? ''), c: Number(calificacion), t: comentario ?? null },
      locals.accessToken
    );
    return json({ resena: r.escribirResena });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'No se pudo guardar la reseña.' }, 400);
  }
};
