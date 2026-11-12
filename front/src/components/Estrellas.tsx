// front/src/components/Estrellas.tsx
// Muestra una calificación de 1 a 5 con estrellas (Módulos 4 y 7).
// Las estrellas son decorativas: el lector de pantalla escucha "4.5 de 5".
import './Resenas.css';

interface Props {
  valor: number;
  /** Número de reseñas, se muestra entre paréntesis. */
  total?: number;
  tamano?: 'sm' | 'md';
}

export default function Estrellas({ valor, total, tamano = 'sm' }: Props) {
  const redondeado = Math.round(valor * 2) / 2; // a medias estrellas
  return (
    <span className={`estrellas estrellas--${tamano}`}>
      <span className="sr-only">
        {valor.toFixed(1)} de 5{total != null ? `, ${total} reseña${total === 1 ? '' : 's'}` : ''}
      </span>
      <span aria-hidden="true" className="estrellas__iconos">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={
              'estrellas__estrella' +
              (redondeado >= n ? ' estrellas__estrella--llena' : redondeado >= n - 0.5 ? ' estrellas__estrella--media' : '')
            }
          >
            ★
          </span>
        ))}
      </span>
      <span aria-hidden="true" className="estrellas__texto">
        {valor.toFixed(1)}
        {total != null ? ` (${total})` : ''}
      </span>
    </span>
  );
}
