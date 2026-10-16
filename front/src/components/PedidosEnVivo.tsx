import { useEffect } from 'react';
import type { Client } from 'graphql-ws';
import { conectarTiempoReal, suscribir } from '../lib/tiempoReal';

// Tiempo real (GraphQL Subscriptions): la tabla de pedidos se actualiza sola.
//   modo "staff"   (admin / operador): pedidos nuevos + cambios de cualquier pedido.
//   modo "cliente" (Mi cuenta): cambios de SUS pedidos (el backend filtra).
//
// No muestra nada en pantalla. Cuando llega un evento, vuelve a pedir la misma
// página al servidor y reemplaza SOLO el bloque con id = "region" (la tabla),
// así no se mueve el scroll ni se pierde lo demás.
//
// Si el usuario está usando la tabla (tiene un campo seleccionado o la tocó hace
// menos de 15 segundos), la actualización espera a que termine.

interface Props {
  modo: 'staff' | 'cliente';
  /** id del elemento que se reemplaza (la tabla de pedidos) */
  region: string;
}

const SUB_NUEVO = 'subscription { pedidoNuevo { id } }';
const SUB_ACTUALIZADO = 'subscription { pedidoActualizado { id } }';
const ESPERA_MS = 400; // junta varios eventos seguidos en una sola actualización
const REINTENTO_MS = 2000; // si el usuario está ocupado, vuelve a revisar cada 2 s
const USO_RECIENTE_MS = 15000; // tiempo que se espera después de tocar la tabla

export default function PedidosEnVivo({ modo, region }: Props) {

  useEffect(() => {
    let cliente: Client | null = null;
    let cancelado = false;
    let temporizador: number | undefined;
    let primeraConexion = true;
    const cancelaciones: (() => void)[] = [];
    let ultimoUso = 0;

    // Guarda cuándo fue la última vez que el usuario tocó la tabla
    // (elegir en "Cambiar a...", escribir, dar clic en un botón)
    const marcarUso = (e: Event) => {
      const tabla = document.getElementById(region);
      if (tabla && e.target instanceof Node && tabla.contains(e.target)) ultimoUso = Date.now();
    };
    const eventosDeUso = ['focusin', 'input', 'change', 'pointerdown'];
    eventosDeUso.forEach((ev) => document.addEventListener(ev, marcarUso, true));

    /** true si el usuario está usando la tabla y no conviene reemplazarla todavía. */
    function estaOcupado(contenedor: HTMLElement) {
      const activo = document.activeElement;
      if (activo && contenedor.contains(activo) && activo.matches('select, input, textarea, button')) return true;
      return Date.now() - ultimoUso < USO_RECIENTE_MS;
    }

    async function actualizarTabla() {
      const actual = document.getElementById(region);
      if (!actual || cancelado) return;
      if (estaOcupado(actual)) {
        temporizador = window.setTimeout(actualizarTabla, REINTENTO_MS);
        return;
      }
      try {
        const r = await fetch(location.href, { credentials: 'same-origin', cache: 'no-store' });
        if (!r.ok) return;
        const html = new DOMParser().parseFromString(await r.text(), 'text/html');
        const nuevo = html.getElementById(region);
        const vigente = document.getElementById(region);
        // Se revisa otra vez por si el usuario empezó a usar la tabla mientras llegaba la respuesta
        if (nuevo && vigente && !estaOcupado(vigente)) vigente.replaceWith(nuevo);
      } catch {
        // sin red: se actualizará con el siguiente evento
      }
    }

    const programar = () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(actualizarTabla, ESPERA_MS);
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
        if (modo === 'staff') cancelaciones.push(suscribir(c, SUB_NUEVO, programar));
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
  }, [modo, region]);

  return null;
}