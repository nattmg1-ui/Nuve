// front/src/components/AsistenteRecomendaciones.tsx
// "Asesora Nuvé": chat flotante para que el cliente pida recomendaciones
// (API externa de IA: Gemini, a través del backend).
// Solo responde con productos y tonos del catálogo que tienen existencias.
// Requiere sesión: sin sesión, el panel invita a iniciar sesión.
import { useEffect, useRef, useState } from 'react';
import Precio from './Precio';
import './Asistente.css';

interface Recomendacion {
  productoId: string;
  varianteId: string;
  nombre: string;
  marca: string;
  tono: string | null;
  codigoHex: string | null;
  precio: number;
  imagenUrl: string | null;
  motivo: string | null;
}

interface Mensaje {
  rol: 'USUARIO' | 'ASISTENTE';
  texto: string;
  recomendaciones?: Recomendacion[];
  error?: boolean;
}

const SUGERENCIAS = [
  'Busco un labial rojo que dure todo el día',
  'Una base para piel morena clara con subtono cálido',
  'Algo para un look natural de día, menos de $250',
];

const CLAVE = 'nuve_asesora';

const leerGuardado = (): Mensaje[] => {
  try {
    const g = sessionStorage.getItem(CLAVE);
    return g ? (JSON.parse(g) as Mensaje[]) : [];
  } catch {
    return [];
  }
};

interface Props {
  conSesion: boolean;
  nombre?: string | null;
}

export default function AsistenteRecomendaciones({ conSesion, nombre }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  // La conversación se conserva al cambiar de página (solo en esta pestaña)
  useEffect(() => setMensajes(leerGuardado()), []);
  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(mensajes.slice(-20)));
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes]);

  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

  async function enviar(pregunta: string) {
    const limpio = pregunta.trim();
    if (!limpio || enviando) return;
    // Al backend van los textos (sin errores). En las respuestas se anota qué tonos se
    // recomendaron, para que la IA no repita los mismos y ofrezca alternativas.
    const historial = mensajes
      .filter((m) => !m.error)
      .slice(-10)
      .map(({ rol, texto, recomendaciones }) => ({
        rol,
        texto: recomendaciones?.length
          ? `${texto}\n[Tonos recomendados: ${recomendaciones.map((r) => `${r.nombre} - ${r.tono ?? 'tono único'} (varianteId ${r.varianteId})`).join('; ')}]`
          : texto,
      }));
    setMensajes((m) => [...m, { rol: 'USUARIO', texto: limpio }]);
    setTexto('');
    setEnviando(true);
    try {
      const r = await fetch('/api/asistente/recomendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: limpio, historial }),
      });
      const datos = await r.json();
      if (!r.ok || datos.error) throw new Error(datos.error ?? 'El asistente no está disponible.');
      setMensajes((m) => [...m, { rol: 'ASISTENTE', texto: datos.respuesta, recomendaciones: datos.recomendaciones }]);
    } catch (e) {
      setMensajes((m) => [
        ...m,
        { rol: 'ASISTENTE', texto: e instanceof Error ? e.message : 'No se pudo obtener respuesta.', error: true },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  const reiniciar = () => {
    setMensajes([]);
    try {
      sessionStorage.removeItem(CLAVE);
    } catch {
      /* nada */
    }
  };

  return (
    <>
      <button
        type="button"
        className="asesora-boton"
        aria-expanded={abierto}
        aria-controls="asesora-panel"
        onClick={() => setAbierto((a) => !a)}
      >
        {abierto ? 'Cerrar' : 'Pide una recomendación'}
      </button>

      {abierto && (
        <section id="asesora-panel" className="asistente asistente--flotante" aria-label="Asesora Nuvé">
          <header className="asistente__encabezado">
            <div>
              <strong>Asesora Nuvé</strong>
              <span>Recomendaciones del catálogo con existencias</span>
            </div>
            {mensajes.length > 0 && (
              <button type="button" className="asistente__reiniciar" onClick={reiniciar}>
                Nueva conversación
              </button>
            )}
          </header>

          {!conSesion ? (
            <div className="asistente__vacio">
              <p>Inicia sesión para pedir recomendaciones de productos y tonos.</p>
              <a
                className="btn btn-primary btn-sm"
                href={`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
              >
                Iniciar sesión
              </a>
            </div>
          ) : (
            <>
              <div className="asistente__mensajes" ref={lista} aria-live="polite">
                {mensajes.length === 0 && (
                  <div className="asistente__vacio">
                    <p>
                      Hola{nombre ? `, ${nombre}` : ''}. Cuéntame qué buscas (producto, acabado, ocasión, tu tono de piel o
                      presupuesto) y te recomiendo tonos de la tienda.
                    </p>
                    <div className="asistente__sugerencias">
                      {SUGERENCIAS.map((s) => (
                        <button key={s} type="button" onClick={() => void enviar(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {mensajes.map((m, i) => (
                  <div key={i} className={`asistente__msg asistente__msg--${m.rol === 'USUARIO' ? 'usuario' : 'ia'}${m.error ? ' asistente__msg--error' : ''}`}>
                    <p>{m.texto}</p>
                    {m.recomendaciones && m.recomendaciones.length > 0 && (
                      <ul className="asesora-recs">
                        {m.recomendaciones.map((r) => (
                          <li key={r.varianteId}>
                            <a href={`/producto/${r.productoId}?variante=${r.varianteId}`} className="asesora-rec">
                              {r.imagenUrl ? (
                                <img src={r.imagenUrl} alt="" />
                              ) : (
                                <span className="asesora-rec__color" style={{ background: r.codigoHex ?? '#E5DAD1' }} />
                              )}
                              <span className="asesora-rec__datos">
                                <strong>{r.nombre}</strong>
                                <span>
                                  {r.codigoHex && <span className="asesora-rec__punto" style={{ background: r.codigoHex }} />}
                                  {r.tono ?? 'Tono único'} · {r.marca}
                                </span>
                                <span className="asesora-rec__precio">
                                  <Precio valor={r.precio} />
                                </span>
                                {r.motivo && <span className="asesora-rec__motivo">{r.motivo}</span>}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {enviando && <div className="asistente__msg asistente__msg--ia asistente__escribiendo">Buscando en el catálogo...</div>}
              </div>

              <form
                className="asistente__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void enviar(texto);
                }}
              >
                <label htmlFor="asesora-texto" className="sr-only">
                  Escribe qué buscas
                </label>
                <textarea
                  id="asesora-texto"
                  ref={campo}
                  rows={2}
                  maxLength={500}
                  value={texto}
                  placeholder="Ej. un rubor natural para piel clara"
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void enviar(texto);
                    }
                  }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={enviando || !texto.trim()}>
                  Enviar
                </button>
              </form>
              <p className="asistente__nota">Respuestas generadas con IA (Gemini). Revisa el tono en la ficha del producto antes de comprar.</p>
            </>
          )}
        </section>
      )}
    </>
  );
}
