import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { guardarSesion, rutaInternaSegura, rutaInicialPorRol } from '../../../lib/sesion';

const MUTATION = `
  mutation ($correo: String!, $password: String!) {
    iniciarSesion(correo: $correo, password: $password) {
      accessToken refreshToken usuario { rol { nombre } }
    }
  }`;

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const correo = String(form.get('correo') ?? '');
  const password = String(form.get('password') ?? '');
  const next = rutaInternaSegura(String(form.get('next') ?? ''));

  try {
    const { iniciarSesion } = await gql<{
      iniciarSesion: { accessToken: string; refreshToken: string; usuario: { rol: { nombre: string } } };
    }>(MUTATION, { correo, password });

    guardarSesion(cookies, iniciarSesion, url.protocol === 'https:');
    return redirect(next ?? rutaInicialPorRol(iniciarSesion.usuario.rol.nombre), 303);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : 'No se pudo iniciar sesión.';
    const destino = `/login?error=${encodeURIComponent(mensaje)}${next ? `&next=${encodeURIComponent(next)}` : ''}`;
    return redirect(destino, 303);
  }
};
