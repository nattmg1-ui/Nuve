// src/auth/config.js
// Configuración del sistema de autenticación (se lee de .env).

import 'dotenv/config';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-cambia-esto-en-.env';
if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET no está definido en .env: se usa un valor de desarrollo. Define uno propio.');
}

// Vida del access token (corta: si lo roban, dura poco).
export const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';

// Vida del refresh token en días (larga, pero guardado en BD y revocable).
export const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);

// Roles del sistema (coinciden con la columna rol.nombre en la BD).
export const ROLES = { ADMIN: 'ADMIN', OPERADOR: 'OPERADOR', CLIENTE: 'CLIENTE' };
