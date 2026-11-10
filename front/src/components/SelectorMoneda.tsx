// front/src/components/SelectorMoneda.tsx
// Selector de moneda de la barra superior (API externa: ExchangeRate).
import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $moneda, $tiposDeCambio, MONEDAS, cargarTiposDeCambio } from '../lib/moneda';

export default function SelectorMoneda() {
  const moneda = useStore($moneda);
  const tipos = useStore($tiposDeCambio);

  useEffect(() => {
    if (moneda !== 'MXN') cargarTiposDeCambio();
  }, [moneda]);

  // Si la API no respondió, solo se ofrece MXN
  const disponibles = MONEDAS.filter(
    (m) => m.codigo === 'MXN' || !tipos || tipos.tasas.some((t) => t.moneda === m.codigo)
  );

  const actualizado = tipos?.actualizado
    ? new Date(tipos.actualizado).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    : null;

  return (
    <label className="selector-moneda" title={actualizado ? `Tipo de cambio del ${actualizado} (ExchangeRate API)` : 'Ver precios en otra moneda'}>
      <span className="sr-only">Ver precios en</span>
      <select
        value={moneda}
        onChange={(e) => {
          $moneda.set(e.target.value);
          cargarTiposDeCambio();
        }}
      >
        {disponibles.map((m) => (
          <option key={m.codigo} value={m.codigo}>
            {m.codigo}
          </option>
        ))}
      </select>
    </label>
  );
}
