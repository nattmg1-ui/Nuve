// front/src/components/BotonFavorito.tsx
// "Agregar a favoritos" en la ficha del producto (Módulos 4 y 7).
// Sin sesión, lleva a iniciar sesión y regresa al producto.
import { useState } from 'react';
import './Resenas.css';

interface Props {
  productoId: string;
  inicial: boolean;
  conSesion: boolean;
}

export default function BotonFavorito({ productoId, inicial, conSesion }: Props) {
  const [favorito, setFavorito] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!conSesion) {
    const volver = typeof window !== 'undefined' ? window.location.pathname + window.location.search : `/producto/${productoId}`;
    return (
      <a className="btn btn-secondary favorito-boton" href={`/login?next=${encodeURIComponent(volver)}`}>
        <span aria-hidden="true">♡</span> Inicia sesión para guardar en favoritos
      </a>
    );
  }

  async function alternar() {
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch('/api/favorito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error ?? 'No se pudo actualizar.');
      setFavorito(Boolean(d.favorito));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="favorito">
      <button
        type="button"
        className={`btn btn-secondary favorito-boton${favorito ? ' favorito-boton--activo' : ''}`}
        aria-pressed={favorito}
        onClick={alternar}
        disabled={enviando}
      >
        <span aria-hidden="true">{favorito ? '♥' : '♡'}</span> {favorito ? 'En tus favoritos' : 'Agregar a favoritos'}
      </button>
      {favorito && (
        <a className="favorito__enlace" href="/mi-cuenta/favoritos">
          Ver mis favoritos
        </a>
      )}
      {error && (
        <p className="favorito__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
