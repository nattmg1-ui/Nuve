import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

export const POST = accionFormulario('/admin', 'Usuario creado.', (f, token) =>
  gql(
    `mutation ($datos: UsuarioInput!) { crearUsuario(datos: $datos) { id } }`,
    {
      datos: {
        rolId: String(f.get('rolId')),
        nombre: String(f.get('nombre')),
        correo: String(f.get('correo')),
        password: String(f.get('password')),
      },
    },
    token
  )
);
