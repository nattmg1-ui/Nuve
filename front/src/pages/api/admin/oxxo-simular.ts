// Solo pruebas: el admin marca como pagada una ficha de OXXO.
// En sandbox de Mercado Pago no se puede pagar una ficha en una tienda real.
// El backend solo lo permite si tiene OXXO_SIMULAR=true.
import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

export const POST = accionFormulario('/admin/pedidos#pedidos', 'Pago de OXXO simulado: el pedido quedó PAGADO.', (f, token) =>
  gql(
    `mutation ($pedidoId: ID!) { simularPagoOxxo(pedidoId: $pedidoId) { resultado } }`,
    { pedidoId: String(f.get('pedidoId')) },
    token
  )
);