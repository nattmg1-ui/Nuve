// src/middleware.ts
// Se ejecuta en CADA petición a una página o endpoint, antes de ella. Hace tres cosas:
//   1. Identifica al usuario: valida el access token (cookie) contra el backend.
//   2. Si el access token expiró, usa el refresh token para pedir un par nuevo
//      y actualiza las cookies (el usuario ni se entera).
//   3. Protege rutas por rol: sin sesión -> /login; con sesión pero sin permiso -> 403.

import { defineMiddleware } from 'astro:middleware';
import { ErrorGraphQL, gql } from './lib/graphql';
import { COOKIE_ACCESS, COOKIE_REFRESH, borrarSesion, guardarSesion } from './lib/sesion';
import type { UsuarioSesion } from './lib/types';

const CAMPOS_USUARIO = 'id nombre correo rol { nombre }';

const Q_YO = `query { yo { ${CAMPOS_USUARIO} } }`;
const M_REFRESH = `
  mutation ($refreshToken: String!) {
    refrescarToken(refreshToken: $refreshToken) {
      accessToken refreshToken usuario { ${CAMPOS_USUARIO} }
    }
  }`;

// Reglas de acceso: el primer prefijo que coincida decide.
// roles = undefined -> basta con tener sesión.
const REGLAS: { prefijo: string; roles?: string[] }[] = [
  { prefijo: '/admin', roles: ['ADMIN'] },
  { prefijo: '/api/admin', roles: ['ADMIN'] },
  { prefijo: '/operador', roles: ['OPERADOR', 'ADMIN'] },
  { prefijo: '/api/operador', roles: ['OPERADOR', 'ADMIN'] },
  { prefijo: '/mi-cuenta' },
  { prefijo: '/checkout' },
  { prefijo: '/api/checkout' },
  { prefijo: '/api/direccion' },
  { prefijo: '/api/pedido' },
  { prefijo: '/pago' },
  { prefijo: '/api/pago' },
];

const coincide = (ruta: string, prefijo: string) => ruta === prefijo || ruta.startsWith(prefijo + '/');

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url, locals } = context;
  locals.usuario = null;
  locals.accessToken = null;

  const access = cookies.get(COOKIE_ACCESS)?.value;
  const refresh = cookies.get(COOKIE_REFRESH)?.value;

  // 1) ¿El access token sigue siendo válido?
  if (access) {
    try {
      const { yo } = await gql<{ yo: UsuarioSesion | null }>(Q_YO, {}, access);
      if (yo) {
        locals.usuario = yo;
        locals.accessToken = access;
      }
    } catch {
      /* expirado o backend caído: se intenta con el refresh token */
    }
  }

  // 2) Si no, intentar renovar con el refresh token
  if (!locals.usuario && refresh) {
    try {
      const { refrescarToken } = await gql<{
        refrescarToken: { accessToken: string; refreshToken: string; usuario: UsuarioSesion };
      }>(M_REFRESH, { refreshToken: refresh });
      guardarSesion(cookies, refrescarToken, url.protocol === 'https:');
      locals.usuario = refrescarToken.usuario;
      locals.accessToken = refrescarToken.accessToken;
    } catch (error) {
      // Solo se borra la sesión si el backend dijo que el token ya no vale
      // (si el backend está caído no debemos cerrarle la sesión al usuario).
      if (error instanceof ErrorGraphQL && error.esDeAutenticacion) borrarSesion(cookies);
    }
  }

  // 3) Protección de rutas
  const regla = REGLAS.find((r) => coincide(url.pathname, r.prefijo));
  if (regla) {
    const esApi = url.pathname.startsWith('/api/');

    if (!locals.usuario) {
      if (esApi) return json({ error: 'Debes iniciar sesión.' }, 401);
      return context.redirect(`/login?next=${encodeURIComponent(url.pathname + url.search)}`);
    }
    if (regla.roles && !regla.roles.includes(locals.usuario.rol.nombre)) {
      if (esApi) return json({ error: 'No tienes permiso para esta operación.' }, 403);
      return context.rewrite('/sin-permiso');
    }
  }

  return next();
});

function json(cuerpo: unknown, status: number) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
}