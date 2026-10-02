// src/auth/tokens.js
// Access token = JWT firmado (stateless, vida corta).
// Refresh token = cadena aleatoria opaca; en la BD solo se guarda su hash SHA-256.

import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { JWT_SECRET, ACCESS_TTL } from './config.js';

export function firmarAccessToken(usuarioId, rolNombre) {
  return jwt.sign({ rol: rolNombre }, JWT_SECRET, {
    subject: String(usuarioId),
    expiresIn: ACCESS_TTL,
    issuer: 'nuve',
  });
}

/** Devuelve { id, rol } si el JWT es válido y no ha expirado; si no, null. */
export function verificarAccessToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'nuve' });
    return { id: payload.sub, rol: payload.rol };
  } catch {
    return null;
  }
}

export const generarRefreshToken = () => crypto.randomBytes(48).toString('hex');

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
