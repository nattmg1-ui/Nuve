// Botón "Ya pagué, verificar": le pregunta al backend si Mercado Pago ya recibió
// el pago de la ficha de OXXO.
//   APROBADO  -> el pedido quedó PAGADO, regresa a Mi cuenta.
//   PENDIENTE -> todavía no se paga, se queda en la página de la ficha.
//   RECHAZADO -> la ficha venció y el pedido se canceló, regresa a Mi cuenta.
import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { conMensaje } from '../../../lib/mensajes';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const pedidoId = String(form.get('pedidoId') ?? '');
  if (!/^\d+$/.test(pedidoId)) {
    return redirect(conMensaje('/mi-cuenta', 'error', 'Pedido inválido.'), 303);
  }
  const ficha = `/pago/oxxo/${pedidoId}`;

  try {
    const { verificarPagoOxxo: r } = await gql<{ verificarPagoOxxo: { resultado: string; mensaje: string } }>(
      `mutation ($pedidoId: ID!) { verificarPagoOxxo(pedidoId: $pedidoId) { resultado mensaje } }`,
      { pedidoId },
      locals.accessToken
    );
    if (r.resultado === 'APROBADO') return redirect(conMensaje('/mi-cuenta', 'ok', r.mensaje), 303);
    if (r.resultado === 'RECHAZADO') return redirect(conMensaje('/mi-cuenta', 'error', r.mensaje), 303);
    return redirect(conMensaje(ficha, 'ok', r.mensaje), 303);
  } catch (e) {
    return redirect(conMensaje(ficha, 'error', e instanceof Error ? e.message : 'No se pudo verificar el pago.'), 303);
  }
};