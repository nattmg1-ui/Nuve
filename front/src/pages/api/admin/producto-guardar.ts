import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { json } from '../../../lib/acciones';

// Recibe el formulario de producto (JSON) y lo manda al backend en una sola
// operación. El backend valida todo; aquí solo se aseguran los tipos numéricos.

const MUTATION = `
  mutation ($id: ID, $datos: ProductoCompletoInput!) {
    guardarProducto(id: $id, datos: $datos) { id nombre }
  }`;

interface VarianteEntrada {
  id?: string | null;
  tono?: string;
  codigoHex?: string;
  presentacion?: string;
  precio: unknown;
  sku: string;
  existencias: unknown;
}

export const POST: APIRoute = async ({ request, locals }) => {
  let cuerpo: { id?: string | null; datos?: Record<string, unknown> };
  try {
    cuerpo = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  const datos = cuerpo.datos ?? {};
  const variantes = (Array.isArray(datos.variantes) ? datos.variantes : []) as VarianteEntrada[];

  const variantesLimpias = [];
  for (const [i, v] of variantes.entries()) {
    const precio = Number(v.precio);
    const existencias = Number(v.existencias);
    if (!Number.isFinite(precio) || !Number.isInteger(existencias)) {
      return json({ error: `Variante ${i + 1}: revisa el precio y las existencias.` }, 400);
    }
    variantesLimpias.push({
      id: v.id || null,
      tono: v.tono ?? null,
      codigoHex: v.codigoHex ?? null,
      presentacion: v.presentacion ?? null,
      precio,
      sku: String(v.sku ?? ''),
      existencias,
    });
  }

  try {
    const r = await gql<{ guardarProducto: { id: string; nombre: string } }>(
      MUTATION,
      {
        id: cuerpo.id || null,
        datos: {
          nombre: String(datos.nombre ?? ''),
          descripcion: datos.descripcion ? String(datos.descripcion) : null,
          categoriaId: String(datos.categoriaId ?? ''),
          marcaId: String(datos.marcaId ?? ''),
          variantes: variantesLimpias,
          imagenes: Array.isArray(datos.imagenes) ? datos.imagenes : [],
        },
      },
      locals.accessToken
    );
    return json({ ok: true, producto: r.guardarProducto });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'No se pudo guardar el producto.' }, 400);
  }
};