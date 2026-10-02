import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

export const POST = accionFormulario('/mi-cuenta', 'Pedido cancelado.', (f, token) =>
  gql(`mutation ($id: ID!) { cancelarPedido(id: $id) { id } }`, { id: String(f.get('pedidoId')) }, token)
);
