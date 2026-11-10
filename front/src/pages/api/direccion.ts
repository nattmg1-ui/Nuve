import type { APIRoute } from 'astro';
import { gql } from '../../lib/graphql';
import { json } from '../../lib/acciones';

const MUTATION = `
  mutation ($datos: DireccionInput!) {
    crearDireccion(datos: $datos) { id calle numero colonia ciudad estado codigoPostal referencias }
  }`;

export const POST: APIRoute = async ({ request, locals }) => {
  const cuerpo = (await request.json()) as Record<string, unknown>;
  const texto = (campo: string) => {
    const valor = String(cuerpo[campo] ?? '').trim();
    return valor === '' ? null : valor;
  };
  const numero = (campo: string) => {
    const valor = texto(campo);
    const n = valor === null ? NaN : Number(valor);
    return Number.isFinite(n) ? n : null;
  };
  const datos = {
    calle: texto('calle'),
    numero: texto('numero'),
    colonia: texto('colonia'),
    ciudad: texto('ciudad'),
    estado: texto('estado'),
    codigoPostal: texto('codigoPostal'),
    referencias: texto('referencias'),
    // Ubicación elegida en el mapa (OpenStreetMap); si no se marcó, va vacía
    latitud: numero('latitud'),
    longitud: numero('longitud'),
  };
  try {
    const r = await gql<{ crearDireccion: unknown }>(MUTATION, { datos }, locals.accessToken);
    return json({ direccion: r.crearDireccion });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'No se pudo guardar la dirección.' }, 400);
  }
};