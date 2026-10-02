// src/db.js
// Conexión a PostgreSQL (pool de conexiones con el paquete "pg").
// La cadena de conexión viene de la variable de entorno DATABASE_URL
// (ver .env.example). Todos los resolvers importan `pool` de aquí.

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    '[db] No se encontró DATABASE_URL en el entorno. Copia .env.example a .env y ' +
      'configura tu cadena de conexión a PostgreSQL.'
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Activa SSL solo si tu proveedor lo exige (ej. algunas bases en la nube).
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[db] Error inesperado en una conexión inactiva del pool:', err);
});

/** Atajo para pool.query, usado por todos los resolvers. */
export function query(text, params) {
  return pool.query(text, params);
}
