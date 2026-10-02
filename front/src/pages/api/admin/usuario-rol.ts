import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

export const POST = accionFormulario('/admin', 'Rol actualizado.', (f, token) =>
  gql(
    `mutation ($id: ID!, $rolId: ID!) { cambiarRolUsuario(id: $id, rolId: $rolId) { id } }`,
    { id: String(f.get('usuarioId')), rolId: String(f.get('rolId')) },
    token
  )
);
