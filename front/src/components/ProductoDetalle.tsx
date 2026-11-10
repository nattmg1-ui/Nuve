import { useEffect, useState } from 'react';
import { agregarAlCarrito } from '../lib/cart';
import type { Imagen, Variante } from '../lib/types';
import Precio from './Precio';
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

interface Props {
  producto: Producto;
  /** Tono que llega en la URL (?variante=ID), por ejemplo desde el catálogo. */
  varianteInicial?: string | null;
}

/** Existencias del tono. Si el back no las manda, se trata como disponible. */
const stockDe = (v?: Variante) => v?.inventario?.cantidad ?? null;

export default function ProductoDetalle({ producto, varianteInicial }: Props) {
  const inicial =
    producto.variantes.find((v) => v.id === varianteInicial) ??
    producto.variantes.find((v) => (stockDe(v) ?? 1) > 0) ??
    producto.variantes[0];

  const [varianteId, setVarianteId] = useState(inicial?.id ?? '');
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  const variante = producto.variantes.find((v) => v.id === varianteId) ?? producto.variantes[0];
  const principal = producto.imagenes.find((i) => i.principal) ?? producto.imagenes[0];
  // Cada tono puede tener su propia foto; si no tiene, se usa la principal del producto
  const imagenUrl = variante?.imagenUrl || principal?.urlImagen;

  const stock = stockDe(variante);
  const agotado = stock !== null && stock <= 0;

  // La URL guarda el tono elegido: al recargar o compartir el enlace se abre el mismo tono
  useEffect(() => {
    if (!variante) return;
    const url = new URL(window.location.href);
    url.searchParams.set('variante', variante.id);
    window.history.replaceState(null, '', url);
  }, [variante?.id]);

  const elegirTono = (v: Variante) => {
    setVarianteId(v.id);
    setAgregado(false);
    const s = stockDe(v);
    if (s !== null && s > 0) setCantidad((c) => Math.min(c, s));
    else setCantidad(1);
  };

  const handleAgregar = () => {
    if (!variante || agotado) return;
    agregarAlCarrito(
      {
        varianteId: variante.id,
        productoId: producto.id,
        nombre: producto.nombre,
        tono: variante.tono ?? undefined,
        precioUnitario: variante.precio,
        imagenUrl,
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
        {imagenUrl && (
          <img
            key={imagenUrl}
            src={imagenUrl}
            alt={`${producto.nombre}${variante?.tono ? ` en tono ${variante.tono}` : ''}`}
            className="detalle-producto-img"
          />
        )}

        <div>
          <p className="producto-marca">
            {producto.marca.nombre} · {producto.categoria.nombre}
          </p>
          <h2 style={{ font: 'var(--text-h2)' }}>{producto.nombre}</h2>
          {producto.descripcion && <p style={{ color: 'var(--color-slate)' }}>{producto.descripcion}</p>}

          <span className="detalle-producto-label">
            Tono{producto.variantes.length > 1 ? ` (${producto.variantes.length} disponibles)` : ''}
          </span>
          <div className="detalle-producto-swatches" role="radiogroup" aria-label="Elegir tono">
            {producto.variantes.map((v) => {
              const s = stockDe(v);
              const sinStock = s !== null && s <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={v.id === varianteId}
                  aria-label={`${v.tono ?? v.sku}${sinStock ? ' (agotado)' : ''}`}
                  title={`${v.tono ?? v.sku} — $${v.precio.toFixed(2)}${sinStock ? ' — Agotado' : ''}`}
                  onClick={() => elegirTono(v)}
                  className={
                    'detalle-producto-swatch' +
                    (v.id === varianteId ? ' detalle-producto-swatch--selected' : '') +
                    (sinStock ? ' detalle-producto-swatch--agotado' : '')
                  }
                  style={{ background: v.codigoHex ?? '#E5DAD1' }}
                />
              );
            })}
          </div>
          {variante && (
            <p className="detalle-producto-tono-nombre">
              {variante.tono ?? variante.sku} — <Precio valor={variante.precio} />
            </p>
          )}
          {stock !== null && (
            <p
              className={`detalle-producto-stock${agotado ? ' detalle-producto-stock--agotado' : stock <= 5 ? ' detalle-producto-stock--poco' : ''}`}
              role="status"
            >
              {agotado ? 'Agotado en este tono' : stock <= 5 ? `Últimas ${stock} piezas en este tono` : `${stock} disponibles en este tono`}
            </p>
          )}

          <label className="detalle-producto-label" htmlFor="cantidad">
            Cantidad
          </label>
          <input
            id="cantidad"
            type="number"
            min={1}
            max={stock !== null && stock > 0 ? stock : undefined}
            value={cantidad}
            disabled={agotado}
            onChange={(e) => {
              const n = Math.max(1, Number(e.target.value) || 1);
              setCantidad(stock !== null && stock > 0 ? Math.min(n, stock) : n);
            }}
            className="detalle-producto-input"
          />

          <button className="btn btn-primary" onClick={handleAgregar} disabled={agotado} style={{ marginTop: 16 }}>
            {agotado ? 'Agotado' : 'Agregar al carrito'}
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
