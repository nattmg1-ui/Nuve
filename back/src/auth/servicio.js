// src/auth/servicio.js
// Lógica de registro, login, refresh y logout. Devuelve filas SQL crudas;
// resolvers.js las convierte al formato GraphQL.

import bcrypt from 'bcryptjs';
import { pool, query } from '../db.js';
import { ROLES, REFRESH_DAYS } from './config.js';
import { firmarAccessToken, generarRefreshToken, hashToken } from './tokens.js';
import { datosInvalidos, noAutenticado } from './errores.js';

const RONDAS_BCRYPT = 10;
// Hash falso para comparar aunque el correo no exista (evita revelar por tiempo de respuesta si un correo está registrado).
const HASH_FALSO = bcrypt.hashSync('no-existe', RONDAS_BCRYPT);

export const hashearPassword = (password) => bcrypt.hash(password, RONDAS_BCRYPT);

export function validarPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw datosInvalidos('La contraseña debe tener al menos 8 caracteres.');
  }
}

async function emitirSesion(usuarioRow) {
  const { rows } = await query('SELECT nombre FROM rol WHERE id = $1', [usuarioRow.rol_id]);
  const rolNombre = rows[0].nombre;

  const refreshToken = generarRefreshToken();
  await query(
    `INSERT INTO refresh_token (usuario_id, token_hash, expira_en)
     VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
    [usuarioRow.id, hashToken(refreshToken), String(REFRESH_DAYS)]
  );

  return {
    accessToken: firmarAccessToken(usuarioRow.id, rolNombre),
    refreshToken,
    usuarioRow,
  };
}

export async function registrar({ nombre, correo, password }) {
  const nombreLimpio = String(nombre ?? '').trim();
  const correoLimpio = String(correo ?? '').trim().toLowerCase();
  if (!nombreLimpio) throw datosInvalidos('El nombre es obligatorio.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) throw datosInvalidos('Correo inválido.');
  validarPassword(password);

  const existe = await query('SELECT 1 FROM usuario WHERE correo = $1', [correoLimpio]);
  if (existe.rowCount > 0) throw datosInvalidos('Ese correo ya está registrado.');

  // Todo registro público entra como CLIENTE; los roles superiores los asigna un admin.
  const rol = await query('SELECT id FROM rol WHERE nombre = $1', [ROLES.CLIENTE]);
  const { rows } = await query(
    `INSERT INTO usuario (rol_id, nombre, correo, password, activo, fecha_registro)
     VALUES ($1, $2, $3, $4, TRUE, CURRENT_DATE) RETURNING *`,
    [rol.rows[0].id, nombreLimpio, correoLimpio, await hashearPassword(password)]
  );
  return emitirSesion(rows[0]);
}

export async function iniciarSesion({ correo, password }) {
  const correoLimpio = String(correo ?? '').trim().toLowerCase();
  const { rows } = await query('SELECT * FROM usuario WHERE correo = $1', [correoLimpio]);
  const usuario = rows[0];

  const coincide = await bcrypt.compare(String(password ?? ''), usuario ? usuario.password : HASH_FALSO);
  if (!usuario || !coincide || !usuario.activo) {
    throw noAutenticado('Correo o contraseña incorrectos.');
  }
  return emitirSesion(usuario);
}

/**
 * Rotación de refresh tokens: cada refresh token sirve UNA sola vez.
 * Si llega uno ya usado (posible robo), se revocan todas las sesiones del usuario.
 */
export async function refrescar(refreshToken) {
  const hash = hashToken(String(refreshToken ?? ''));

  const usado = await query(
    `UPDATE refresh_token SET revocado = TRUE, revocado_en = NOW()
     WHERE token_hash = $1 AND revocado = FALSE AND expira_en > NOW()
     RETURNING usuario_id`,
    [hash]
  );

  if (usado.rowCount === 0) {
    const previo = await query(
      `SELECT usuario_id, revocado, (revocado_en > NOW() - INTERVAL '10 seconds') AS reciente
       FROM refresh_token WHERE token_hash = $1`,
      [hash]
    );
    // Si se revocó hace menos de 10 s probablemente son dos peticiones simultáneas del mismo
    // navegador (no un robo): solo se rechaza. Si es más viejo, se asume reuso y se cierran TODAS las sesiones.
    if (previo.rowCount > 0 && previo.rows[0].revocado && !previo.rows[0].reciente) {
      await query('UPDATE refresh_token SET revocado = TRUE, revocado_en = NOW() WHERE usuario_id = $1', [previo.rows[0].usuario_id]);
    }
    throw noAutenticado('Sesión expirada. Inicia sesión de nuevo.');
  }

  const { rows } = await query('SELECT * FROM usuario WHERE id = $1', [usado.rows[0].usuario_id]);
  if (!rows[0] || !rows[0].activo) throw noAutenticado('Usuario inactivo.');
  return emitirSesion(rows[0]);
}

export async function cerrarSesion(refreshToken) {
  await query('UPDATE refresh_token SET revocado = TRUE, revocado_en = NOW() WHERE token_hash = $1', [hashToken(String(refreshToken ?? ''))]);
  return true;
}

export const revocarSesionesDeUsuario = (usuarioId) =>
  query('UPDATE refresh_token SET revocado = TRUE, revocado_en = NOW() WHERE usuario_id = $1', [usuarioId]);

export { pool };
