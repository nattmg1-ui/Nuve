import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $cart, $totalPrecio, vaciarCarrito } from '../lib/cart';
import { ESTADOS_MX } from '../lib/estadosMx';
import './Main.css';
import './Checkout.css';
import './Panel.css';

interface Direccion {
  id: string;
  calle: string;
  numero: string | null;
  colonia: string | null;
  ciudad: string;
  estado: string;
  codigoPostal: string | null;
}

const etiqueta = (d: Direccion) =>
  `${d.calle} ${d.numero ?? ''}${d.colonia ? `, ${d.colonia}` : ''}, ${d.ciudad}, ${d.estado}${d.codigoPostal ? ` CP ${d.codigoPostal}` : ''}`;

export default function Checkout({ direcciones: iniciales }: { direcciones: Direccion[] }) {
  const items = useStore($cart);
  const totalPrecio = useStore($totalPrecio);

  const [direcciones, setDirecciones] = useState(iniciales);
  const [direccionId, setDireccionId] = useState(iniciales[0]?.id ?? '');
  const [mostrarForm, setMostrarForm] = useState(iniciales.length === 0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDireccion, setErrorDireccion] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function llamar(url: string, cuerpo: unknown) {
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error ?? 'Ocurrió un error.');
    return datos;
  }

  async function guardarDireccion(formulario: HTMLFormElement) {
    setErrorDireccion(null);
    setGuardando(true);
    const datos = Object.fromEntries(new FormData(formulario).entries());
    try {
      const { direccion } = await llamar('/api/direccion', datos);
      setDirecciones((prev) => [...prev, direccion]);
      setDireccionId(direccion.id);
      setMostrarForm(false);
    } catch (err) {
      // El backend valida de nuevo y explica qué campo está mal
      setErrorDireccion((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarPedido() {
    setEnviando(true);
    setError(null);
    try {
      const { pedidoId } = await llamar('/api/checkout', {
        direccionId,
        items: items.map((i) => ({ varianteId: i.varianteId, cantidad: i.cantidad })),
      });
      vaciarCarrito();
      // El pedido queda PENDIENTE: ahora el cliente elige cómo pagarlo
      window.location.href = `/pago/${pedidoId}`;
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <div className="checkout">
      <a className="btn btn-secondary" href="/carrito" style={{ marginBottom: 16 }}>
        Volver
      </a>

      <h2 style={{ font: 'var(--text-h2)', marginBottom: 20 }}>Confirmar pedido</h2>

      {items.length === 0 ? (
        <p style={{ color: 'var(--color-slate)' }}>
          Tu carrito está vacío. <a href="/">Ir al catálogo</a>
        </p>
      ) : (
        <>
          <ul className="checkout-resumen">
            {items.map((item) => (
              <li key={item.varianteId}>
                {item.cantidad} × {item.nombre} {item.tono ? `(${item.tono})` : ''} — $
                {(item.precioUnitario * item.cantidad).toFixed(2)}
              </li>
            ))}
          </ul>

          <p style={{ font: 'var(--text-h3)', marginTop: 16 }}>Total: ${totalPrecio.toFixed(2)}</p>

          <h3 className="panel-subtitulo">Dirección de envío</h3>

          {direcciones.length > 0 && (
            <ul className="checkout-direcciones" role="radiogroup" aria-label="Dirección de envío">
              {direcciones.map((d) => (
                <li key={d.id}>
                  <label>
                    <input
                      type="radio"
                      name="direccion"
                      checked={direccionId === d.id}
                      onChange={() => setDireccionId(d.id)}
                    />{' '}
                    {etiqueta(d)}
                  </label>
                </li>
              ))}
            </ul>
          )}

          {!mostrarForm && (
            <button type="button" className="btn btn-secondary" onClick={() => setMostrarForm(true)}>
              Agregar otra dirección
            </button>
          )}

          {mostrarForm && (
            <form
              className="panel-form auth-form"
              onSubmit={(e) => {
                e.preventDefault();
                void guardarDireccion(e.currentTarget);
              }}
            >
              <label htmlFor="dir-calle">Calle</label>
              <input
                className="input"
                id="dir-calle"
                name="calle"
                autoComplete="address-line1"
                required
                minLength={3}
                maxLength={100}
                placeholder="Av. Vallarta"
              />

              <label htmlFor="dir-numero">Número exterior</label>
              <input
                className="input"
                id="dir-numero"
                name="numero"
                required
                maxLength={12}
                pattern="[Ss] ?/ ?[Nn]|[0-9]{1,6} ?[A-Za-z]?(-[0-9A-Za-z]{1,4})?"
                title="Ejemplos: 123, 45B, 12-A o S/N si no tiene número"
                placeholder="123, 45B o S/N"
              />

              <label htmlFor="dir-colonia">Colonia</label>
              <input
                className="input"
                id="dir-colonia"
                name="colonia"
                required
                minLength={2}
                maxLength={80}
                placeholder="Americana"
              />

              <label htmlFor="dir-cp">Código postal</label>
              <input
                className="input"
                id="dir-cp"
                name="codigoPostal"
                autoComplete="postal-code"
                inputMode="numeric"
                required
                maxLength={5}
                pattern="[0-9]{5}"
                title="5 dígitos, por ejemplo 44160"
                placeholder="44160"
                onInput={(e) => {
                  // Solo deja escribir números
                  const campo = e.currentTarget;
                  campo.value = campo.value.replace(/[^0-9]/g, '').slice(0, 5);
                }}
              />

              <label htmlFor="dir-ciudad">Ciudad o municipio</label>
              <input
                className="input"
                id="dir-ciudad"
                name="ciudad"
                autoComplete="address-level2"
                required
                minLength={2}
                maxLength={60}
                pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'\-]+"
                title="Solo letras"
                placeholder="Guadalajara"
              />

              <label htmlFor="dir-estado">Estado</label>
              <select className="input" id="dir-estado" name="estado" required defaultValue="">
                <option value="" disabled>
                  Elige tu estado
                </option>
                {ESTADOS_MX.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>

              <label htmlFor="dir-referencias">Referencias (opcional)</label>
              <input
                className="input"
                id="dir-referencias"
                name="referencias"
                maxLength={150}
                placeholder="Entre calles, color de la casa, número interior..."
              />

              {errorDireccion && (
                <div role="alert" className="aviso aviso--error" style={{ marginBottom: 0 }}>
                  {errorDireccion}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar dirección'}
              </button>
            </form>
          )}

          {error && (
            <div role="alert" className="main-error" style={{ marginTop: 16 }}>
              <p>{error}</p>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={confirmarPedido}
            disabled={enviando || !direccionId}
            style={{ marginTop: 16 }}
          >
            {enviando ? 'Enviando...' : 'Confirmar pedido'}
          </button>
        </>
      )}
    </div>
  );
}