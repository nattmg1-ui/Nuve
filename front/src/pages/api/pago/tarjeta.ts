// Recibe el token de la tarjeta que generó el formulario de Mercado Pago y le pide
// al backend que haga el cobro. Responde JSON con el resultado (APROBADO,
// PENDIENTE o RECHAZADO). El monto lo pone el backend, no el navegador.
import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { json } from '../../../lib/acciones';

interface Cuerpo {
  pedidoId?: string;
  token?: string;
  metodoPagoId?: string;
  tipoPago?: string;
  cuotas?: number;
  email?: string;
  tipoIdentificacion?: string;
  numeroIdentificacion?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const c = (await request.json().catch(() => ({}))) as Cuerpo;

  if (!/^\d+$/.test(String(c.pedidoId ?? '')) || !c.token || !c.metodoPagoId || !c.email) {
    return json({ resultado: 'RECHAZADO', mensaje: 'Faltan datos del pago.' }, 400);
  }

  try {
    const { pagarConTarjeta } = await gql<{
      pagarConTarjeta: { resultado: string; mensaje: string; pedido: { id: string; estado: string } | null };
    }>(
      `mutation ($pedidoId: ID!, $tarjeta: TarjetaInput!) {
        pagarConTarjeta(pedidoId: $pedidoId, tarjeta: $tarjeta) { resultado mensaje pedido { id estado } }
      }`,
      {
        pedidoId: String(c.pedidoId),
        tarjeta: {
          token: c.token,
          metodoPagoId: c.metodoPagoId,
          tipoPago: c.tipoPago === 'debit_card' ? 'debit_card' : 'credit_card',
          cuotas: Number(c.cuotas) || 1,
          email: c.email,
          tipoIdentificacion: c.tipoIdentificacion || null,
          numeroIdentificacion: c.numeroIdentificacion || null,
        },
      },
      locals.accessToken
    );
    return json(pagarConTarjeta);
  } catch (e) {
    return json({ resultado: 'RECHAZADO', mensaje: e instanceof Error ? e.message : 'No se pudo procesar el pago.' }, 400);
  }
};