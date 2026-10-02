// src/lib/cart.ts
// Carrito del lado del navegador, con nanostores. Se guarda en localStorage
// (persistentAtom) porque en Astro cada página es una carga completa: sin
// persistencia, el carrito se perdería al navegar. Todas las islas de React
// comparten este mismo store.

import { persistentAtom } from '@nanostores/persistent';
import { computed } from 'nanostores';
import type { CartItem } from './types';

export const $cart = persistentAtom<CartItem[]>('nuve_cart', [], {
  encode: JSON.stringify,
  decode: (valor) => {
    try {
      const datos = JSON.parse(valor);
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  },
});

export const $totalItems = computed($cart, (items) => items.reduce((acc, i) => acc + i.cantidad, 0));
export const $totalPrecio = computed($cart, (items) =>
  items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0)
);

export function agregarAlCarrito(item: Omit<CartItem, 'cantidad'>, cantidad = 1) {
  const items = $cart.get();
  const existente = items.find((i) => i.varianteId === item.varianteId);
  $cart.set(
    existente
      ? items.map((i) => (i.varianteId === item.varianteId ? { ...i, cantidad: i.cantidad + cantidad } : i))
      : [...items, { ...item, cantidad }]
  );
}

export function actualizarCantidad(varianteId: string, cantidad: number) {
  const items = $cart.get();
  $cart.set(
    cantidad <= 0
      ? items.filter((i) => i.varianteId !== varianteId)
      : items.map((i) => (i.varianteId === varianteId ? { ...i, cantidad } : i))
  );
}

export function eliminarDelCarrito(varianteId: string) {
  $cart.set($cart.get().filter((i) => i.varianteId !== varianteId));
}

export function vaciarCarrito() {
  $cart.set([]);
}
