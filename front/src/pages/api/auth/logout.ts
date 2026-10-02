import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { COOKIE_REFRESH, borrarSesion } from '../../../lib/sesion';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const refresh = cookies.get(COOKIE_REFRESH)?.value;
  if (refresh) {
    // Revoca el refresh token en la BD (aunque falle, igual se borran las cookies)
    try {
      await gql(`mutation ($t: String!) { cerrarSesion(refreshToken: $t) }`, { t: refresh });
    } catch {
      /* ignorar */
    }
  }
  borrarSesion(cookies);
  return redirect('/', 303);
};
