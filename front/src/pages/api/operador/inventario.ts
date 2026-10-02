import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

export const POST = accionFormulario('/operador#inventario', 'Inventario actualizado.', (f, token) =>
  gql(
    `mutation ($id: ID!, $cantidad: Int!) { actualizarInventario(id: $id, cantidad: $cantidad) { id } }`,
    { id: String(f.get('inventarioId')), cantidad: Number(f.get('cantidad')) },
    token
  )
);
