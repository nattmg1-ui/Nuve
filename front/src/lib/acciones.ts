// Fábrica de endpoints para los formularios del panel (operador / admin / cuenta):
// leen el formulario, ejecutan UNA operación en el backend con el token del
// usuario, y redirigen de vuelta con un mensaje de éxito o de error.
// El backend es quien decide si el rol tiene permiso; aquí no se confía en nada.

import type { APIRoute } from 'astro';
import { conMensaje } from './mensajes';

export const accionFormulario =
  (volver: string, exito: string, ejecutar: (form: FormData, token: string) => Promise<unknown>): APIRoute =>
  async ({ request, locals, redirect }) => {
    const form = await request.formData();
    try {
      await ejecutar(form, locals.accessToken as string);
      return redirect(conMensaje(volver, 'ok', exito), 303);
    } catch (e) {
      return redirect(conMensaje(volver, 'error', e instanceof Error ? e.message : 'Ocurrió un error.'), 303);
    }
  };

export const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
