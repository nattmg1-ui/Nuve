// src/lib/tiempoReal.ts
// Conexión en tiempo real (GraphQL Subscriptions) desde el NAVEGADOR.
//
// Es la única parte del front que habla directo con el backend, porque los avisos
// tienen que llegar al navegador sin recargar la página. Para no exponer el access
// token, antes de conectarse se pide un ticket de 60 s a /api/tiempo-real/ticket
// (lo genera el servidor de Astro con la cookie de sesión).
//
// Si la conexión se cae (se reinicia el backend, se va el internet), graphql-ws
// vuelve a intentar solo, pidiendo un ticket nuevo cada vez.

import { createClient, type Client } from 'graphql-ws';

interface Ticket {
  ticket: string;
  url: string;
}

async function pedirTicket(): Promise<Ticket> {
  const r = await fetch('/api/tiempo-real/ticket', { credentials: 'same-origin', cache: 'no-store' });
  if (!r.ok) throw new Error('No se pudo obtener el ticket de tiempo real.');
  return (await r.json()) as Ticket;
}

export type EstadoConexion = 'conectando' | 'en-vivo' | 'reconectando';

/** Crea la conexión. onEstado avisa si está conectada o reconectando. */
export async function conectarTiempoReal(onEstado: (estado: EstadoConexion) => void): Promise<Client> {
  const primero = await pedirTicket();
  let usado = false;

  return createClient({
    url: primero.url,
    // Se llama en cada (re)conexión: la primera usa el ticket que ya se pidió
    connectionParams: async () => {
      if (!usado) {
        usado = true;
        return { ticket: primero.ticket };
      }
      return { ticket: (await pedirTicket()).ticket };
    },
    lazy: false, // conectarse de una vez, aunque todavía no haya suscripciones
    retryAttempts: Infinity,
    shouldRetry: () => true,
    on: {
      connected: () => onEstado('en-vivo'),
      closed: () => onEstado('reconectando'),
    },
  });
}

/** Se suscribe a una Subscription. Devuelve una función para cancelar. */
export function suscribir<T>(cliente: Client, query: string, alRecibir: (datos: T) => void): () => void {
  return cliente.subscribe<T>(
    { query },
    {
      next: ({ data, errors }) => {
        if (errors?.length) console.warn('[tiempo real]', errors[0].message);
        if (data) alRecibir(data as T);
      },
      error: (e) => console.warn('[tiempo real]', e),
      complete: () => {},
    }
  );
}