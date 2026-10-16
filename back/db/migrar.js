// back/db/migrar.js
// Corre un archivo .sql contra la base de datos usando Node (no necesita psql).
//
// Uso (desde la carpeta back):
//   node db/migrar.js db/migraciones/003_pago_oxxo.sql
// Usa DATABASE_URL de tu .env. Si quieres otra base, pon la URL como segundo parámetro.

import 'dotenv/config';
import fs from 'node:fs';
import pg from 'pg';

const [archivo, urlArgumento] = process.argv.slice(2);
const url = urlArgumento || process.env.DATABASE_URL;

if (!archivo || !url) {
  console.error('Uso: node db/migrar.js <archivo.sql> "<url de la base>"');
  process.exit(1);
}

// Las bases en la nube (como Render) exigen conexión segura (SSL); la local no
const esLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const client = new pg.Client({ connectionString: url, ssl: esLocal ? false : { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(fs.readFileSync(archivo, 'utf8'));
  console.log(`Listo: se aplicó ${archivo}`);
} catch (e) {
  console.error('Error al aplicar la migración:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}