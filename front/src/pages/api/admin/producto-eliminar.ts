import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

export const POST = accionFormulario('/admin#productos', 'Producto eliminado.', (f, token) =>
  gql(`mutation ($id: ID!) { eliminarProducto(id: $id) }`, { id: String(f.get('productoId')) }, token)
);
