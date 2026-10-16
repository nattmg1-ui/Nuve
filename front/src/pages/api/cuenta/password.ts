// Cambia la contraseña del usuario con sesión (Mi cuenta > Mi perfil).
// El backend revisa la contraseña actual y cierra TODAS las sesiones del usuario.
// Para no sacarlo de esta página, aquí mismo se inicia una sesión nueva con la
// contraseña nueva y se guardan las cookies otra vez.
import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { conMensaje } from '../../../lib/mensajes';
import { guardarSesion } from '../../../lib/sesion';

const VOLVER = '/mi-cuenta/perfil';

export const POST: APIRoute = async ({ request, locals, cookies, redirect, url }) => {
  const form = await request.formData();
  const actual = String(form.get('actual') ?? '');
  const nueva = String(form.get('nueva') ?? '');
  const confirmar = String(form.get('confirmar') ?? '');

  if (nueva !== confirmar) {
    return redirect(conMensaje(VOLVER, 'error', 'La contraseña nueva y su confirmación no coinciden.'), 303);
  }

  try {
    await gql(
      `mutation ($actual: String!, $nueva: String!) { cambiarMiPassword(actual: $actual, nueva: $nueva) }`,
      { actual, nueva },
      locals.accessToken
    );
  } catch (e) {
    return redirect(conMensaje(VOLVER, 'error', e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.'), 303);
  }

  // La contraseña ya cambió: se abre una sesión nueva para este navegador
  try {
    const { iniciarSesion } = await gql<{ iniciarSesion: { accessToken: string; refreshToken: string } }>(
      `mutation ($correo: String!, $password: String!) {
        iniciarSesion(correo: $correo, password: $password) { accessToken refreshToken }
      }`,
      { correo: locals.usuario!.correo, password: nueva }
    );
    guardarSesion(cookies, iniciarSesion, url.protocol === 'https:');
  } catch {
    // (la página de login solo muestra ?error=, por eso el mensaje va ahí)
    return redirect(conMensaje('/login', 'error', 'Tu contraseña se cambió. Inicia sesión con la nueva.'), 303);
  }
  return redirect(conMensaje(VOLVER, 'ok', 'Tu contraseña se cambió.'), 303);
};