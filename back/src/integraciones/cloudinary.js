// back/src/integraciones/cloudinary.js
// API externa: Cloudinary (subida y optimización de imágenes).
// El admin sube la foto DIRECTO del navegador a Cloudinary; el backend solo
// genera la "firma" que autoriza esa subida. Así la API Secret nunca sale del
// servidor y no pasan archivos pesados por nuestro backend.
//
// Variables de entorno: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';

const CARPETA = process.env.CLOUDINARY_CARPETA || 'nuve/productos';

export function cloudinaryConfigurado() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Firma de subida (método oficial de Cloudinary): SHA-1 de los parámetros
 * ordenados alfabéticamente "a=1&b=2" + API Secret. Vale 1 hora.
 */
export function firmaSubidaImagen() {
  if (!cloudinaryConfigurado()) {
    throw new GraphQLError(
      'La subida de imágenes no está configurada. Agrega CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET al .env del back.',
      { extensions: { code: 'SERVICIO_NO_CONFIGURADO' } }
    );
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const parametros = `folder=${CARPETA}&timestamp=${timestamp}`;
  const firma = crypto
    .createHash('sha1')
    .update(parametros + process.env.CLOUDINARY_API_SECRET)
    .digest('hex');
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    carpeta: CARPETA,
    firma,
    // A dónde manda el navegador el archivo (API de subida de Cloudinary)
    urlSubida:
      process.env.CLOUDINARY_UPLOAD_URL ||
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(process.env.CLOUDINARY_CLOUD_NAME)}/image/upload`,
  };
}
