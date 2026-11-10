// front/src/components/AsistenteReportes.tsx
// Asistente de reportes del panel de administración (Módulo 8 de la propuesta).
// Responde con los datos de ventas, inventario y pedidos de la base
// (API externa de IA: Gemini, a través del backend). Solo ADMIN.
import { useEffect, useRef, useState } from 'react';
import './Asistente.css';

interface Mensaje {
  rol: 'USUARIO' | 'ASISTENTE';
  texto: string;
  error?: boolean;
}

const SUGERENCIAS = [
  '¿Qué productos y tonos se vendieron más este mes?',
  '¿Qué tonos debo resurtir pronto?',
  'Compara las ventas de esta semana con la anterior',
  '¿Cuántos pedidos están pendientes de pago o de envío?',
];

export default function AsistenteReportes() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const lista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes, enviando]);

  async function enviar(pregunta: string) {
    const limpio = pregunta.trim();
    if (!limpio || enviando) return;
    const historial = mensajes.filter((m) => !m.error).slice(-10).map(({ rol, texto }) => ({ rol, texto }));
    setMensajes((m) => [...m, { rol: 'USUARIO', texto: limpio }]);
    setTexto('');
    setEnviando(true);
    try {
      const r = await fetch('/api/admin/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: limpio, historial }),
      });
      const datos = await r.json();
      if (!r.ok || datos.error) throw new Error(datos.error ?? 'El asistente no está disponible.');
      setMensajes((m) => [...m, { rol: 'ASISTENTE', texto: datos.respuesta }]);
    } catch (e) {
      setMensajes((m) => [
        ...m,
        { rol: 'ASISTENTE', texto: e instanceof Error ? e.message : 'No se pudo obtener respuesta.', error: true },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="asistente asistente--panel" aria-label="Asistente de reportes">
      <header className="asistente__encabezado">
        <div>
          <strong>Asistente de reportes</strong>
          <span>Responde solo con los datos registrados en Nuvé</span>
        </div>
        {mensajes.length > 0 && (
          <button type="button" className="asistente__reiniciar" onClick={() => setMensajes([])}>
            Nueva conversación
          </button>
        )}
      </header>

      <div className="asistente__mensajes" ref={lista} aria-live="polite">
        {mensajes.length === 0 && (
          <div className="asistente__vacio">
            <p>Pregunta sobre ventas, productos, tonos, inventario o pedidos. Por ejemplo:</p>
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
          </div>
        ))}
        {enviando && <div className="asistente__msg asistente__msg--ia asistente__escribiendo">Revisando los datos...</div>}
      </div>

      <form
        className="asistente__form"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(texto);
        }}
      >
        <label htmlFor="reportes-texto" className="sr-only">
          Escribe tu pregunta
        </label>
        <textarea
          id="reportes-texto"
          rows={2}
          maxLength={500}
          value={texto}
          placeholder="Ej. ¿Cuál fue el ticket promedio de los últimos 30 días?"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void enviar(texto);
            }
          }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={enviando || !texto.trim()}>
          Preguntar
        </button>
      </form>
      <p className="asistente__nota">
        Respuestas generadas con IA (Gemini) a partir de las ventas, el inventario y los pedidos. No se envían nombres, correos ni
        direcciones de clientes. Verifica las cifras importantes en Resumen.
      </p>
    </section>
  );
}
