// front/src/components/Precio.tsx
// Muestra un precio en pesos y, si el cliente eligió otra moneda, su equivalente
// aproximado con el tipo de cambio de ExchangeRate API.
import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $moneda, $tiposDeCambio, cargarTiposDeCambio, convertir, formatoMoneda } from '../lib/moneda';

interface Props {
  /** Precio en MXN. */
  valor: number;
  /** Texto antes del precio, por ejemplo "Desde". */
  prefijo?: string;
  sufijo?: string;
}

export default function Precio({ valor, prefijo, sufijo }: Props) {
  const moneda = useStore($moneda);
  const tipos = useStore($tiposDeCambio);

  useEffect(() => {
    if (moneda !== 'MXN') cargarTiposDeCambio();
  }, [moneda]);

  const convertido = moneda === 'MXN' ? null : convertir(valor, moneda, tipos);

  return (
    <>
      {prefijo ? `${prefijo} ` : ''}${valor.toFixed(2)}
      {sufijo ? ` ${sufijo}` : ''}
      {convertido !== null && (
        <span className="precio-aprox" title="Aproximado con el tipo de cambio del día. Se cobra en pesos (MXN).">
          {' '}≈ {formatoMoneda(convertido, moneda)}
        </span>
      )}
    </>
  );
}
