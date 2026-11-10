// front/src/pages/api/admin/firma-imagen.ts
// Pide al backend la firma para subir una imagen a Cloudinary (solo ADMIN).
// La API Secret de Cloudinary nunca llega al navegador: solo la firma.
import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { json } from '../../../lib/acciones';

const MUTATION = `mutation { firmaSubidaImagen { cloudName apiKey timestamp carpeta firma urlSubida } }`;

export const POST: APIRoute = async ({ locals }) => {
  try {
    const r = await gql<{ firmaSubidaImagen: unknown }>(MUTATION, {}, locals.accessToken);
    return json(r.firmaSubidaImagen);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'No se pudo preparar la subida.' }, 400);
  }
};
