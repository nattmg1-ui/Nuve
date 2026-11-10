// front/src/lib/turnstile.ts
// API externa: Cloudflare Turnstile (verificación anti-bots, sin acertijos de imágenes).
// El navegador muestra el widget y obtiene un token; aquí, en el servidor de Astro,
// ese token se confirma con Cloudflare antes de iniciar sesión o crear la cuenta.
//
// Variables de entorno del front:
//   PUBLIC_TURNSTILE_SITE_KEY   llave pública (va en la página)
//   TURNSTILE_SECRET_KEY        llave secreta (solo en el servidor)
// Si no están, la verificación se omite y el formulario funciona como antes.
// Para pruebas locales Cloudflare da llaves que siempre aprueban:
//   sitio 1x00000000000000000000AA  ·  secreta 1x0000000000000000000000000000000AA

const leer = (nombre: string): string =>
  process.env[nombre] ?? ((import.meta.env as Record<string, string | undefined>)[nombre] ?? '');

export const turnstileSiteKey = () => leer('PUBLIC_TURNSTILE_SITE_KEY');
const secreta = () => leer('TURNSTILE_SECRET_KEY');
const urlVerificacion = () =>
  leer('TURNSTILE_VERIFY_URL') || 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const turnstileActivo = () => Boolean(turnstileSiteKey() && secreta());

/**
 * Confirma con Cloudflare el token que mandó el formulario.
 * Devuelve null si todo bien, o un mensaje de error para mostrar.
 */
export async function verificarTurnstile(form: FormData, request: Request): Promise<string | null> {
  if (!turnstileActivo()) return null;
  const token = String(form.get('cf-turnstile-response') ?? '');
  if (!token) return 'Completa la verificación de seguridad antes de continuar.';

  const cuerpo = new URLSearchParams({ secret: secreta(), response: token });
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (ip) cuerpo.set('remoteip', ip);

  try {
    const r = await fetch(urlVerificacion(), { method: 'POST', body: cuerpo });
    const datos = (await r.json()) as { success: boolean; 'error-codes'?: string[] };
    if (datos.success) return null;
    console.warn('[turnstile] rechazado:', datos['error-codes']);
    return 'No pudimos verificar que eres una persona. Vuelve a intentarlo.';
  } catch {
    return 'No se pudo completar la verificación de seguridad. Intenta de nuevo en un momento.';
  }
}
