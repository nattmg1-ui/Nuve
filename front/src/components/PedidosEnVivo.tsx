import { useEffect } from 'react';
import type { Client } from 'graphql-ws';
import { conectarTiempoReal, suscribir } from '../lib/tiempoReal';

// Tiempo real (GraphQL Subscriptions): partes de la página que se actualizan solas.
//   modo "staff"   (admin / operador): pedidos nuevos, cambios de cualquier pedido
//                  y cambios de inventario o productos.
//   modo "cliente" (Mi cuenta, ficha OXXO): cambios de SUS pedidos (el backend filtra).
//
// No muestra nada en pantalla. Cuando llega un evento, vuelve a pedir la misma
// página al servidor y reemplaza SOLO los bloques indicados en "region"
// (por id), así no se mueve el scroll ni se pierde lo demás.
//
// Si el usuario está usando un bloque (tiene un campo seleccionado o lo tocó hace
// menos de 15 segundos), ese bloque espera; los demás se actualizan de inmediato.

interface Props {
  modo: 'staff' | 'cliente';
  /** id del bloque (o lista de ids) que se reemplaza */
  region: string | string[];
}

const SUB_NUEVO = 'subscription { pedidoNuevo { id } }';
const SUB_ACTUALIZADO = 'subscription { pedidoActualizado { id } }';
const SUB_INVENTARIO = 'subscription { inventarioActualizado }';
const ESPERA_MS = 400; // junta varios eventos seguidos en una sola actualización
const REINTENTO_MS = 2000; // si el usuario está ocupado, vuelve a revisar cada 2 s
const USO_RECIENTE_MS = 15000; // tiempo que se espera después de tocar un bloque

export default function PedidosEnVivo({ modo, region }: Props) {
  const regiones = Array.isArray(region) ? region : [region];
  const clave = regiones.join(',');

  useEffect(() => {
    let cliente: Client | null = null;
    let cancelado = false;
    let temporizador: number | undefined;
    let primeraConexion = true;
    const cancelaciones: (() => void)[] = [];
    const ultimoUso = new Map<string, number>(); // id del bloque -> última vez que se tocó
    const pendientes = new Set<string>(); // bloques que faltan por actualizar

    // Guarda cuándo fue la última vez que el usuario tocó cada bloque
    const marcarUso = (e: Event) => {
      if (!(e.target instanceof Node)) return;
      for (const id of regiones) {
        if (document.getElementById(id)?.contains(e.target)) ultimoUso.set(id, Date.now());
      }
    };
    const eventosDeUso = ['focusin', 'input', 'change', 'pointerdown'];
    eventosDeUso.forEach((ev) => document.addEventListener(ev, marcarUso, true));

    /** true si el usuario está usando ese bloque y no conviene reemplazarlo todavía. */
    function estaOcupado(id: string) {
      const bloque = document.getElementById(id);
      const activo = document.activeElement;
      if (bloque && activo && bloque.contains(activo) && activo.matches('select, input, textarea, button')) return true;
      return Date.now() - (ultimoUso.get(id) ?? 0) < USO_RECIENTE_MS;
    }

    async function actualizar() {
      if (cancelado) return;
      const listos = [...pendientes].filter((id) => !estaOcupado(id));
      if (listos.length > 0) {
        try {
          const r = await fetch(location.href, { credentials: 'same-origin', cache: 'no-store' });
          if (r.ok) {
            const html = new DOMParser().parseFromString(await r.text(), 'text/html');
            for (const id of listos) {
              const nuevo = html.getElementById(id);
              const vigente = document.getElementById(id);
              // Se revisa otra vez por si el usuario empezó a usarlo mientras llegaba la respuesta
              if (nuevo && vigente && !estaOcupado(id)) {
                vigente.replaceWith(document.importNode(nuevo, true));
                pendientes.delete(id);
              }
            }
          }
        } catch {
          // sin red: se reintenta abajo
        }
      }
      if (pendientes.size > 0) temporizador = window.setTimeout(actualizar, REINTENTO_MS);
    }

    const programar = () => {
      regiones.forEach((id) => pendientes.add(id));
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(actualizar, ESPERA_MS);
    };

    conectarTiempoReal((estado) => {
      if (estado !== 'en-vivo') return;
      // Si se cayó la conexión y regresó, pudieron perderse eventos: se actualiza
      if (!primeraConexion) programar();
      primeraConexion = false;
    })
      .then((c) => {
        if (cancelado) {
          void c.dispose();
          return;
        }
        cliente = c;
        if (modo === 'staff') {
          cancelaciones.push(suscribir(c, SUB_NUEVO, programar));
          cancelaciones.push(suscribir(c, SUB_INVENTARIO, programar));
        }
        cancelaciones.push(suscribir(c, SUB_ACTUALIZADO, programar));
      })
      .catch(() => {
        // sin sesión o sin backend: la página sigue funcionando normal, sin tiempo real
      });

    return () => {
      cancelado = true;
      window.clearTimeout(temporizador);
      eventosDeUso.forEach((ev) => document.removeEventListener(ev, marcarUso, true));
      cancelaciones.forEach((cancelar) => cancelar());
      void cliente?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, clave]);

  return null;
}