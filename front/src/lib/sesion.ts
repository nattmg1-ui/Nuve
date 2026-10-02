// src/lib/sesion.ts
// Manejo de las cookies de sesión. Ambas son httpOnly (JavaScript del navegador
// no puede leerlas) y SameSite=Lax (no se envían en POST desde otros sitios).

import type { AstroCookies } from 'astro';

export const COOKIE_ACCESS = 'nuve_access';
export const COOKIE_REFRESH = 'nuve_refresh';

const MINUTOS_ACCESS = 15; // igual que ACCESS_TOKEN_TTL del backend
const DIAS_REFRESH = 7; // igual que REFRESH_TOKEN_DAYS del backend

export function guardarSesion(
  cookies: AstroCookies,
  tokens: { accessToken: string; refreshToken: string },
  seguro: boolean
) {
  const base = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: seguro };
  cookies.set(COOKIE_ACCESS, tokens.accessToken, { ...base, maxAge: 60 * MINUTOS_ACCESS });
  cookies.set(COOKIE_REFRESH, tokens.refreshToken, { ...base, maxAge: 60 * 60 * 24 * DIAS_REFRESH });
}

export function borrarSesion(cookies: AstroCookies) {
  cookies.delete(COOKIE_ACCESS, { path: '/' });
  cookies.delete(COOKIE_REFRESH, { path: '/' });
}

/** Solo se permite volver a rutas internas (evita "open redirect" con ?next=https://malo.com). */
export function rutaInternaSegura(ruta: string | null | undefined): string | null {
  if (!ruta || !ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('\\')) return null;
  return ruta;
}

export function rutaInicialPorRol(rol: string): string {
  if (rol === 'ADMIN') return '/admin';
  if (rol === 'OPERADOR') return '/operador';
  return '/';
}
