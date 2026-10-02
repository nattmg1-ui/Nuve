import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

export const POST = accionFormulario('/admin', 'Estado de la cuenta actualizado.', (f, token) =>
  gql(
    `mutation ($id: ID!, $activo: Boolean!) { cambiarActivoUsuario(id: $id, activo: $activo) { id } }`,
    { id: String(f.get('usuarioId')), activo: f.get('activo') === 'true' },
    token
  )
);
