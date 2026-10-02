import type { APIRoute } from 'astro';
import { gql } from '../../lib/graphql';
import { json } from '../../lib/acciones';

const MUTATION = `
  mutation ($datos: PedidoInput!) {
    crearPedido(datos: $datos) { id total estado }
  }`;

export const POST: APIRoute = async ({ request, locals }) => {
  const cuerpo = (await request.json()) as { direccionId?: string; items?: { varianteId: string; cantidad: number }[] };

  const items = Array.isArray(cuerpo.items) ? cuerpo.items : [];
  if (!cuerpo.direccionId) return json({ error: 'Elige una dirección de envío.' }, 400);
  if (items.length === 0) return json({ error: 'Tu carrito está vacío.' }, 400);

  // Solo se mandan id y cantidad: el PRECIO lo calcula el backend desde la BD.
  const detalles = items.map((i) => ({ varianteId: String(i.varianteId), cantidad: Number(i.cantidad) }));

  try {
    const r = await gql<{ crearPedido: { id: string } }>(
      MUTATION,
      { datos: { direccionId: cuerpo.direccionId, detalles } },
      locals.accessToken
    );
    return json({ ok: true, pedidoId: r.crearPedido.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'No se pudo registrar el pedido.' }, 400);
  }
};
