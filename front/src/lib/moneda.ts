// front/src/lib/moneda.ts
// Moneda en la que el cliente quiere VER los precios (API externa: ExchangeRate).
// Los precios de la tienda y los cobros siempre son en pesos (MXN); las otras
// monedas son solo una referencia aproximada.
import { persistentAtom } from '@nanostores/persistent';
import { atom } from 'nanostores';

export const MONEDAS: { codigo: string; nombre: string }[] = [
  { codigo: 'MXN', nombre: 'Peso mexicano' },
  { codigo: 'USD', nombre: 'Dólar estadounidense' },
  { codigo: 'EUR', nombre: 'Euro' },
  { codigo: 'CAD', nombre: 'Dólar canadiense' },
  { codigo: 'GBP', nombre: 'Libra esterlina' },
  { codigo: 'COP', nombre: 'Peso colombiano' },
];

/** Moneda elegida (se recuerda entre páginas). */
export const $moneda = persistentAtom<string>('nuve_moneda', 'MXN');

export interface TiposDeCambio {
  base: string;
  actualizado: string | null;
  fuente: string;
  tasas: { moneda: string; tasa: number }[];
}

/** Tipos de cambio desde MXN (null mientras cargan). */
export const $tiposDeCambio = atom<TiposDeCambio | null>(null);

let cargando: Promise<void> | null = null;

/** Pide los tipos de cambio una sola vez por página. */
export function cargarTiposDeCambio() {
  if (typeof window === 'undefined' || cargando) return;
  cargando = fetch('/api/tipo-cambio')
    .then((r) => r.json())
    .then((d: TiposDeCambio) => $tiposDeCambio.set(d))
    .catch(() => $tiposDeCambio.set({ base: 'MXN', actualizado: null, fuente: 'ExchangeRate API', tasas: [] }));
}

export const formatoMoneda = (valor: number, moneda: string) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: moneda,
    currencyDisplay: moneda === 'MXN' ? 'symbol' : 'code',
    maximumFractionDigits: moneda === 'COP' ? 0 : 2,
  }).format(valor);

/** Convierte un precio en MXN a la moneda elegida. Null si no hay tasa. */
export function convertir(valorMxn: number, moneda: string, tipos: TiposDeCambio | null): number | null {
  if (moneda === 'MXN') return valorMxn;
  const tasa = tipos?.tasas.find((t) => t.moneda === moneda)?.tasa;
  return tasa ? valorMxn * tasa : null;
}
