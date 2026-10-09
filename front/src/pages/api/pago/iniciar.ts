// Recibe el método elegido, pide al backend que cree el cobro y manda al cliente
// a la página de pago de Mercado Pago o PayPal. El monto lo pone el backend.
import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { conMensaje } from '../../../lib/mensajes';

const METODOS = ['MERCADO_PAGO', 'PAYPAL'];

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const pedidoId = String(form.get('pedidoId') ?? '');
  const metodo = String(form.get('metodo') ?? '');
  const volver = `/pago/${encodeURIComponent(pedidoId)}`;

  if (!/^\d+$/.test(pedidoId) || !METODOS.includes(metodo)) {
    return redirect(conMensaje('/mi-cuenta', 'error', 'Elige un método de pago válido.'), 303);
  }

  try {
    const { iniciarPago } = await gql<{ iniciarPago: { url: string } }>(
      `mutation ($pedidoId: ID!, $metodo: MetodoPago!) { iniciarPago(pedidoId: $pedidoId, metodo: $metodo) { url } }`,
      { pedidoId, metodo },
      locals.accessToken
    );
    if (!/^https?:\/\//.test(iniciarPago.url)) throw new Error('Link de pago inválido.');
    // Redirección a otro sitio (Mercado Pago / PayPal)
    return new Response(null, { status: 303, headers: { Location: iniciarPago.url } });
  } catch (e) {
    return redirect(conMensaje(volver, 'error', e instanceof Error ? e.message : 'No se pudo iniciar el pago.'), 303);
  }
};