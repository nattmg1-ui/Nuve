// front/src/components/ResenasProducto.tsx
// Opiniones de un producto (Módulos 4 y 7): promedio, lista de reseñas y, si el
// cliente compró el producto, el formulario para escribir o editar la suya.
import { useMemo, useState } from 'react';
import Estrellas from './Estrellas';
import type { ResenaPublica } from '../lib/types';
import './Resenas.css';

interface Props {
  productoId: string;
  resenas: ResenaPublica[];
  puedoResenar: boolean;
  conSesion: boolean;
}

const fechaLarga = (f: string) =>
  new Date(`${f}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

export default function ResenasProducto({ productoId, resenas: iniciales, puedoResenar, conSesion }: Props) {
  const [resenas, setResenas] = useState(iniciales);
  const mia = resenas.find((r) => r.esMia) ?? null;
  const [editando, setEditando] = useState(!mia);
  const [estrellas, setEstrellas] = useState(mia?.calificacion ?? 0);
  const [comentario, setComentario] = useState(mia?.comentario ?? '');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const promedio = useMemo(
    () => (resenas.length ? resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length : null),
    [resenas]
  );

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (estrellas < 1) return setAviso({ tipo: 'error', texto: 'Elige de 1 a 5 estrellas.' });
    setEnviando(true);
    setAviso(null);
    try {
      const r = await fetch('/api/resena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId, calificacion: estrellas, comentario }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error ?? 'No se pudo guardar.');
      setResenas((lista) => [d.resena, ...lista.filter((x) => !x.esMia)]);
      setEditando(false);
      setAviso({ tipo: 'ok', texto: mia ? 'Actualizamos tu reseña.' : 'Gracias por tu opinión.' });
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo guardar.' });
    } finally {
      setEnviando(false);
    }
  }

  async function borrar() {
    setEnviando(true);
    setAviso(null);
    try {
      const r = await fetch('/api/resena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId, eliminar: true }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error ?? 'No se pudo borrar.');
      setResenas((lista) => lista.filter((x) => !x.esMia));
      setEstrellas(0);
      setComentario('');
      setEditando(true);
      setAviso({ tipo: 'ok', texto: 'Borramos tu reseña.' });
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo borrar.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="resenas" aria-labelledby="resenas-titulo">
      <div className="resenas__cabecera">
        <h2 id="resenas-titulo">Opiniones</h2>
        {promedio !== null ? (
          <Estrellas valor={promedio} total={resenas.length} tamano="md" />
        ) : (
          <span className="resenas__vacio">Aún no hay opiniones de este producto.</span>
        )}
      </div>

      {aviso && (
        <p className={`resenas__aviso resenas__aviso--${aviso.tipo}`} role="status">
          {aviso.texto}
        </p>
      )}

      {/* Formulario: solo si compró y pagó el producto */}
      {puedoResenar && editando && (
        <form className="resenas__form" onSubmit={enviar}>
          <fieldset className="resenas__selector">
            <legend>{mia ? 'Edita tu calificación' : 'Califica este producto'}</legend>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={`resenas__opcion${estrellas >= n ? ' resenas__opcion--activa' : ''}`}>
                <input
                  type="radio"
                  name="calificacion"
                  value={n}
                  checked={estrellas === n}
                  onChange={() => setEstrellas(n)}
                  className="sr-only"
                />
                <span aria-hidden="true">★</span>
                <span className="sr-only">
                  {n} estrella{n === 1 ? '' : 's'}
                </span>
              </label>
            ))}
          </fieldset>
          <label htmlFor="resena-comentario">Tu opinión (opcional)</label>
          <textarea
            id="resena-comentario"
            className="input"
            rows={3}
            maxLength={1000}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="¿Cómo te quedó el tono? ¿Cuánto dura?"
          />
          <div className="resenas__acciones">
            <button className="btn btn-primary" type="submit" disabled={enviando}>
              {mia ? 'Guardar cambios' : 'Publicar opinión'}
            </button>
            {mia && (
              <button className="btn btn-secondary" type="button" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {!puedoResenar && (
        <p className="resenas__nota">
          {conSesion
            ? 'Podrás opinar sobre este producto cuando lo compres.'
            : 'Inicia sesión y compra este producto para dejar tu opinión.'}
        </p>
      )}

      {resenas.length > 0 && (
        <ul className="resenas__lista">
          {resenas.map((r) => (
            <li key={r.id} className={`resenas__item${r.esMia ? ' resenas__item--mia' : ''}`}>
              <div className="resenas__meta">
                <Estrellas valor={r.calificacion} />
                <strong>{r.esMia ? 'Tu opinión' : r.autor}</strong>
                {r.compraVerificada && <span className="resenas__verificada">Compra verificada</span>}
                <span className="resenas__fecha">{fechaLarga(r.fecha)}</span>
              </div>
              {r.comentario && <p>{r.comentario}</p>}
              {r.esMia && !editando && (
                <div className="resenas__acciones">
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditando(true)}>
                    Editar
                  </button>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={borrar} disabled={enviando}>
                    Borrar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
