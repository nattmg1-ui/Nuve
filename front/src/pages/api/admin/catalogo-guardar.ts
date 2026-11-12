// front/src/pages/api/admin/catalogo-guardar.ts
// Crea o edita una categoría o una marca (Módulo 9). Solo ADMIN (lo revisa el middleware y el back).
// Campos del formulario: tipo (categoria | marca), id (vacío = nueva), nombre, descripcion, activo.
import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

const OPERACIONES = {
  categoria: {
    crear: `mutation ($datos: CategoriaInput!) { crearCategoria(datos: $datos) { id } }`,
    editar: `mutation ($id: ID!, $datos: CategoriaInput!) { actualizarCategoria(id: $id, datos: $datos) { id } }`,
  },
  marca: {
    crear: `mutation ($datos: MarcaInput!) { crearMarca(datos: $datos) { id } }`,
    editar: `mutation ($id: ID!, $datos: MarcaInput!) { actualizarMarca(id: $id, datos: $datos) { id } }`,
  },
} as const;

export const POST = accionFormulario('/admin/catalogo', 'Cambios guardados.', async (f, token) => {
  const tipo = String(f.get('tipo')) as keyof typeof OPERACIONES;
  if (!(tipo in OPERACIONES)) throw new Error('Tipo inválido.');
  const id = String(f.get('id') ?? '').trim();
  const datos = {
    nombre: String(f.get('nombre') ?? ''),
    descripcion: String(f.get('descripcion') ?? '') || null,
    // Al crear siempre queda activa; al editar se respeta la casilla
    activo: id ? f.get('activo') === 'on' : true,
  };
  return id
    ? gql(OPERACIONES[tipo].editar, { id, datos }, token)
    : gql(OPERACIONES[tipo].crear, { datos }, token);
});
