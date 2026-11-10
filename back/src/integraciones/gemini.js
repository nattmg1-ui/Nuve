// back/src/integraciones/gemini.js
// API externa: Google Gemini (inteligencia artificial).
// La usan los dos asistentes de Nuvé:
//   - Recomendaciones para el cliente (src/asistente/servicio.js)
//   - Reportes para el administrador (Módulo 8 de la propuesta)
//
// Variables de entorno:
//   GEMINI_API_KEY   llave de Google AI Studio (aistudio.google.com > Get API key). Gratis, sin tarjeta.
//   GEMINI_MODEL     opcional. Por defecto "gemini-flash-lite-latest": el modelo rápido de Google
//                    (responde en pocos segundos). Si no está disponible, se intenta "gemini-flash-latest".
//   GEMINI_TIMEOUT_MS opcional. Tiempo máximo de espera (por defecto 60000 = 60 s).
//
// IMPORTANTE: con la capa gratis, Google puede usar lo que se le manda para mejorar
// sus productos. Por eso a Gemini nunca se le mandan nombres, correos ni direcciones
// de clientes: solo el catálogo y números agregados de ventas.
import { GraphQLError } from 'graphql';

const API = () => (process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
const MODELO = () => process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const MODELO_RESPALDO = 'gemini-flash-latest';
const TIEMPO_MAXIMO = () => Number(process.env.GEMINI_TIMEOUT_MS) || 60000;

export const geminiConfigurado = () => Boolean(process.env.GEMINI_API_KEY);

const errorServicio = (mensaje, code = 'SERVICIO_NO_DISPONIBLE') => new GraphQLError(mensaje, { extensions: { code } });

/** Una llamada a la API con tiempo máximo de espera. */
async function llamar(modelo, cuerpo) {
  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), TIEMPO_MAXIMO());
  const inicio = Date.now();
  try {
    const r = await fetch(`${API()}/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: 'POST',
      signal: control.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: cuerpo,
    });
    const datos = await r.json().catch(() => ({}));
    console.log(`[gemini] ${modelo} respondió ${r.status} en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
    return { r, datos };
  } catch (e) {
    console.error(`[gemini] ${modelo} sin respuesta tras ${((Date.now() - inicio) / 1000).toFixed(1)} s:`, e.message);
    throw errorServicio(
      e.name === 'AbortError' ? 'El asistente tardó demasiado en responder. Intenta de nuevo.' : 'No se pudo conectar con el asistente.'
    );
  } finally {
    clearTimeout(limite);
  }
}

/**
 * Manda la conversación a Gemini y devuelve el texto de la respuesta.
 * @param {object} p
 * @param {string} p.sistema     instrucciones fijas (reglas del asistente + datos de la tienda)
 * @param {{rol: 'USUARIO'|'ASISTENTE', texto: string}[]} p.historial  mensajes anteriores
 * @param {string} p.mensaje     pregunta actual
 * @param {boolean} [p.json]     true para pedir la respuesta en JSON
 * @param {number} [p.temperatura] 0 = respuestas más fijas, 1 = más variadas
 */
export async function preguntarGemini({ sistema, historial = [], mensaje, json = false, temperatura = 0.4 }) {
  if (!geminiConfigurado()) {
    throw errorServicio(
      'El asistente no está configurado. Agrega GEMINI_API_KEY al .env del back.',
      'SERVICIO_NO_CONFIGURADO'
    );
  }

  const contents = [
    ...historial.map((m) => ({ role: m.rol === 'ASISTENTE' ? 'model' : 'user', parts: [{ text: m.texto }] })),
    { role: 'user', parts: [{ text: mensaje }] },
  ];

  const cuerpo = JSON.stringify({
    system_instruction: { parts: [{ text: sistema }] },
    contents,
    generationConfig: {
      temperature: temperatura,
      maxOutputTokens: 2048,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  });

  let { r, datos } = await llamar(MODELO(), cuerpo);
  // Si el modelo elegido no existe para esta llave, se intenta con el de respaldo
  if (r.status === 404 && MODELO() !== MODELO_RESPALDO) {
    console.warn(`[gemini] El modelo ${MODELO()} no está disponible; se usa ${MODELO_RESPALDO}.`);
    ({ r, datos } = await llamar(MODELO_RESPALDO, cuerpo));
  }

  if (!r.ok) {
    console.error('[gemini]', r.status, datos?.error?.message);
    if (r.status === 429) throw errorServicio('El asistente recibió muchas preguntas. Espera un momento e intenta de nuevo.');
    if (r.status === 400 || r.status === 403) throw errorServicio('La llave de Gemini no es válida o el modelo no está disponible.');
    throw errorServicio('El asistente no está disponible en este momento.');
  }

  const candidato = datos.candidates?.[0];
  const texto = candidato?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!texto) {
    if (candidato?.finishReason === 'SAFETY' || datos.promptFeedback?.blockReason) {
      throw errorServicio('No puedo responder a eso. Prueba preguntando de otra forma.', 'DATOS_INVALIDOS');
    }
    throw errorServicio('El asistente no dio una respuesta. Intenta de nuevo.');
  }
  return texto;
}
