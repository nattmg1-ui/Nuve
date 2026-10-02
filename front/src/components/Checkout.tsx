import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $cart, $totalPrecio, vaciarCarrito } from '../lib/cart';
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
    setError(null);
    const datos = Object.fromEntries(new FormData(formulario).entries());
    try {
      const { direccion } = await llamar('/api/direccion', datos);
      setDirecciones((prev) => [...prev, direccion]);
      setDireccionId(direccion.id);
      setMostrarForm(false);
    } catch (err) {
      setError((err as Error).message);
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
      window.location.href = `/mi-cuenta?ok=${encodeURIComponent(`Pedido #${pedidoId} registrado. ¡Gracias por tu compra!`)}`;
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
              className="panel-form"
              onSubmit={(e) => {
                e.preventDefault();
                void guardarDireccion(e.currentTarget);
              }}
            >
              <input className="input" name="calle" placeholder="Calle" required />
              <input className="input" name="numero" placeholder="Número" />
              <input className="input" name="colonia" placeholder="Colonia" />
              <input className="input" name="ciudad" placeholder="Ciudad" required />
              <input className="input" name="estado" placeholder="Estado" required />
              <input className="input" name="codigoPostal" placeholder="Código postal" />
              <button type="submit" className="btn btn-primary">
                Guardar dirección
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
