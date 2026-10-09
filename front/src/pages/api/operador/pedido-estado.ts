// Cambia el estado de un pedido desde el panel de operación o de administración.
// El backend valida que el cambio esté permitido (por ejemplo, un pedido
// ENTREGADO ya no se puede modificar) y que el usuario sea operador o admin.
import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { conMensaje } from '../../../lib/mensajes';

// Páginas a las que se puede regresar después de guardar
const DESTINOS = ['/operador', '/admin/pedidos'];

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const pedidoId = String(form.get('pedidoId') ?? '');
  const estado = String(form.get('estado') ?? '');
  const pedida = String(form.get('volver') ?? '');
  const volver = `${DESTINOS.includes(pedida) ? pedida : '/operador'}#pedidos`;

  if (!/^\d+$/.test(pedidoId) || !estado) {
    return redirect(conMensaje(volver, 'error', 'Elige el nuevo estado del pedido.'), 303);
  }

  try {
    await gql(
      `mutation ($id: ID!, $estado: StatusPedido!) { actualizarPedido(id: $id, estado: $estado) { id } }`,
      { id: pedidoId, estado },
      locals.accessToken
    );
    return redirect(conMensaje(volver, 'ok', `Pedido #${pedidoId} actualizado a ${estado}.`), 303);
  } catch (e) {
    return redirect(conMensaje(volver, 'error', e instanceof Error ? e.message : 'No se pudo actualizar el pedido.'), 303);
  }
};