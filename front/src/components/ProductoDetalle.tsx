import { useState } from 'react';
import { agregarAlCarrito } from '../lib/cart';
import type { Imagen, Variante } from '../lib/types';
import './Main.css';
import './DetalleProducto.css';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  marca: { nombre: string };
  categoria: { nombre: string };
  variantes: Variante[];
  imagenes: Imagen[];
}

export default function ProductoDetalle({ producto }: { producto: Producto }) {
  const [varianteId, setVarianteId] = useState(producto.variantes[0]?.id ?? '');
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  const variante = producto.variantes.find((v) => v.id === varianteId) ?? producto.variantes[0];
  const imagen = producto.imagenes.find((i) => i.principal) ?? producto.imagenes[0];

  const handleAgregar = () => {
    if (!variante) return;
    agregarAlCarrito(
      {
        varianteId: variante.id,
        productoId: producto.id,
        nombre: producto.nombre,
        tono: variante.tono ?? undefined,
        precioUnitario: variante.precio,
        imagenUrl: imagen?.urlImagen,
      },
      cantidad
    );
    setAgregado(true);
  };

  return (
    <div className="detalle-producto">
      <a className="btn btn-secondary" href="/" style={{ marginBottom: 16 }}>
        Volver
      </a>

      <div className="detalle-producto-grid">
        {imagen && <img src={imagen.urlImagen} alt={producto.nombre} className="detalle-producto-img" />}

        <div>
          <p className="producto-marca">
            {producto.marca.nombre} · {producto.categoria.nombre}
          </p>
          <h2 style={{ font: 'var(--text-h2)' }}>{producto.nombre}</h2>
          {producto.descripcion && <p style={{ color: 'var(--color-slate)' }}>{producto.descripcion}</p>}

          <span className="detalle-producto-label">Tono</span>
          <div className="detalle-producto-swatches" role="radiogroup" aria-label="Elegir tono">
            {producto.variantes.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={v.id === varianteId}
                aria-label={v.tono ?? v.sku}
                title={`${v.tono ?? v.sku} — $${v.precio.toFixed(2)}`}
                onClick={() => {
                  setVarianteId(v.id);
                  setAgregado(false);
                }}
                className={`detalle-producto-swatch${v.id === varianteId ? ' detalle-producto-swatch--selected' : ''}`}
                style={{ background: v.codigoHex ?? '#E5DAD1' }}
              />
            ))}
          </div>
          {variante && (
            <p className="detalle-producto-tono-nombre">
              {variante.tono ?? variante.sku} — ${variante.precio.toFixed(2)}
            </p>
          )}

          <label className="detalle-producto-label" htmlFor="cantidad">
            Cantidad
          </label>
          <input
            id="cantidad"
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
            className="detalle-producto-input"
          />

          <button className="btn btn-primary" onClick={handleAgregar} style={{ marginTop: 16 }}>
            Agregar al carrito
          </button>

          {agregado && (
            <p role="status" style={{ marginTop: 12, color: 'var(--color-success)' }}>
              Agregado al carrito. <a href="/carrito">Ver carrito</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
