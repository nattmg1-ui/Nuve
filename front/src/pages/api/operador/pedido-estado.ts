import type { APIRoute } from 'astro';
import { accionFormulario } from '../../../lib/acciones';
import { gql } from '../../../lib/graphql';

// Este endpoint lo usan los paneles de operación y de administración.
// "volver" indica a cuál regresar; solo se aceptan esas dos rutas.
const DESTINOS = ['/operador', '/admin'];

export const POST: APIRoute = async (contexto) => {
  // Se lee una copia del formulario para saber a dónde regresar;
  // accionFormulario vuelve a leer el original.
  const form = await contexto.request.clone().formData();
  const volver = String(form.get('volver') ?? '');
  const destino = `${DESTINOS.includes(volver) ? volver : '/operador'}#pedidos`;

  return accionFormulario(destino, 'Estado del pedido actualizado.', (f, token) =>
    gql(
      `mutation ($id: ID!, $estado: StatusPedido!) { actualizarPedido(id: $id, estado: $estado) { id } }`,
      { id: String(f.get('pedidoId')), estado: String(f.get('estado')) },
      token
    )
  )(contexto);
};