import { useStore } from '@nanostores/react';
import { $cart, $totalPrecio, actualizarCantidad, eliminarDelCarrito } from '../lib/cart';
import './Main.css';
import './Carrito.css';

export default function Carrito() {
  const items = useStore($cart);
  const totalPrecio = useStore($totalPrecio);

  return (
    <div className="carrito">
      <a className="btn btn-secondary" href="/" style={{ marginBottom: 16 }}>
        Volver
      </a>

      <h2 style={{ font: 'var(--text-h2)', marginBottom: 20 }}>Tu carrito</h2>

      {items.length === 0 && <p style={{ color: 'var(--color-slate)' }}>Tu carrito está vacío por ahora.</p>}

      {items.length > 0 && (
        <>
          <ul className="carrito-lista">
            {items.map((item) => (
              <li key={item.varianteId} className="carrito-item">
                {item.imagenUrl && <img src={item.imagenUrl} alt={item.nombre} className="carrito-item-img" />}
                <div>
                  <p className="producto-nombre">{item.nombre}</p>
                  {item.tono && <p className="producto-marca">{item.tono}</p>}
                  <p className="producto-precio">${item.precioUnitario.toFixed(2)} c/u</p>
                </div>
                <input
                  type="number"
                  min={1}
                  value={item.cantidad}
                  aria-label={`Cantidad de ${item.nombre}`}
                  onChange={(e) => actualizarCantidad(item.varianteId, Math.max(1, Number(e.target.value)))}
                  className="carrito-item-cantidad"
                />
                <p className="producto-precio">${(item.precioUnitario * item.cantidad).toFixed(2)}</p>
                <button className="btn btn-secondary" onClick={() => eliminarDelCarrito(item.varianteId)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>

          <div className="carrito-total">
            <p style={{ font: 'var(--text-h3)' }}>Total: ${totalPrecio.toFixed(2)}</p>
            <a className="btn btn-primary" href="/checkout">
              Finalizar compra
            </a>
          </div>
        </>
      )}
    </div>
  );
}
