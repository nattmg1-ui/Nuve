// Guarda el nombre y el tema visual del usuario con sesión (Mi cuenta > Mi perfil).
// El backend solo modifica la cuenta del dueño del token, nunca la de otro usuario.
import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

const TEMAS = ['SISTEMA', 'CLARO', 'OSCURO'];

export const POST = accionFormulario('/mi-cuenta/perfil', 'Tu perfil se actualizó.', (f, token) => {
  const tema = String(f.get('tema') ?? 'SISTEMA');
  return gql(
    `mutation ($nombre: String!, $tema: TemaVisual!) { actualizarMiPerfil(nombre: $nombre, tema: $tema) { id } }`,
    { nombre: String(f.get('nombre') ?? ''), tema: TEMAS.includes(tema) ? tema : 'SISTEMA' },
    token
  );
});