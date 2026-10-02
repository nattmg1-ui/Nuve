import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

export const POST = accionFormulario('/operador', 'Estado del pedido actualizado.', (f, token) =>
  gql(
    `mutation ($id: ID!, $estado: StatusPedido!) { actualizarPedido(id: $id, estado: $estado) { id } }`,
    { id: String(f.get('pedidoId')), estado: String(f.get('estado')) },
    token
  )
);
