// Genera la ficha para pagar en efectivo en OXXO (Mercado Pago, Checkout API)
// y manda al cliente a la página con su referencia. Si ya tenía una ficha
// vigente, el backend regresa la misma. El monto lo pone el backend.
import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { conMensaje } from '../../../lib/mensajes';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const pedidoId = String(form.get('pedidoId') ?? '');
  if (!/^\d+$/.test(pedidoId)) {
    return redirect(conMensaje('/mi-cuenta', 'error', 'Pedido inválido.'), 303);
  }

  try {
    await gql(`mutation ($pedidoId: ID!) { pagarEnOxxo(pedidoId: $pedidoId) { id } }`, { pedidoId }, locals.accessToken);
    return redirect(`/pago/oxxo/${pedidoId}`, 303);
  } catch (e) {
    const texto = e instanceof Error ? e.message : 'No se pudo generar la ficha de OXXO.';
    return redirect(conMensaje(`/pago/${pedidoId}`, 'error', texto), 303);
  }
};