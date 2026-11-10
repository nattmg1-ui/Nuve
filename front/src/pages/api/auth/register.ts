import type { APIRoute } from 'astro';
import { gql } from '../../../lib/graphql';
import { guardarSesion } from '../../../lib/sesion';
import { verificarTurnstile } from '../../../lib/turnstile';

const MUTATION = `
  mutation ($datos: RegistroInput!) {
    registrar(datos: $datos) { accessToken refreshToken }
  }`;

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const datos = {
    nombre: String(form.get('nombre') ?? ''),
    correo: String(form.get('correo') ?? ''),
    password: String(form.get('password') ?? ''),
  };

  try {
    // API anti-bots (Cloudflare Turnstile)
    const errorVerificacion = await verificarTurnstile(form, request);
    if (errorVerificacion) throw new Error(errorVerificacion);

    const { registrar } = await gql<{ registrar: { accessToken: string; refreshToken: string } }>(MUTATION, { datos });
    guardarSesion(cookies, registrar, url.protocol === 'https:');
    return redirect('/', 303);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : 'No se pudo crear la cuenta.';
    return redirect(`/registro?error=${encodeURIComponent(mensaje)}`, 303);
  }
};
