import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

export const POST = accionFormulario('/admin/productos', 'Producto actualizado.', (f, token) =>
  gql(
    `mutation ($id: ID!, $activo: Boolean!) { cambiarActivoProducto(id: $id, activo: $activo) { id } }`,
    { id: String(f.get('productoId')), activo: f.get('activo') === 'true' },
    token
  )
);