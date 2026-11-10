import { useEffect, useState } from 'react';
import type { ProductoCatalogo } from '../lib/types';
import Precio from './Precio';
import './Main.css';

const precioMinimo = (p: ProductoCatalogo) => Math.min(...p.variantes.map((v) => v.precio));

/**
 * Tarjeta del catálogo. Muestra un círculo por cada tono del producto:
 * al pulsar uno cambia la foto (si el tono tiene la suya), el precio
 * y el enlace "Ver producto" abre ese mismo tono.
 */
export default function TarjetaProducto({
  producto,
  tonoHex = null,
}: {
  producto: ProductoCatalogo;
  /** Tono filtrado en el catálogo: si el producto lo tiene, la tarjeta lo muestra. */
  tonoHex?: string | null;
}) {
  const elegirPorFiltro = () =>
    (tonoHex && producto.variantes.find((v) => v.codigoHex === tonoHex)?.id) || producto.variantes[0]?.id || '';

  const [varianteId, setVarianteId] = useState(elegirPorFiltro);

  // Si se filtra por un tono, la tarjeta muestra ese tono
  useEffect(() => {
    if (tonoHex) setVarianteId(elegirPorFiltro());
  }, [tonoHex]);

  const variante = producto.variantes.find((v) => v.id === varianteId) ?? producto.variantes[0];
  const principal = producto.imagenes.find((i) => i.principal) ?? producto.imagenes[0];
  const imagenUrl = variante?.imagenUrl || principal?.urlImagen;
  const stock = variante?.inventario?.cantidad ?? null;
  const agotado = stock !== null && stock <= 0;
  const varios = producto.variantes.length > 1;
  const href = `/producto/${producto.id}${variante ? `?variante=${variante.id}` : ''}`;

  return (
    <article className="producto-card">
      {imagenUrl && (
        <a href={href} tabIndex={-1} aria-hidden="true">
          <img src={imagenUrl} alt="" className="producto-img" />
        </a>
      )}
      <p className="producto-marca">{producto.marca.nombre}</p>
      <h3 className="producto-nombre">{producto.nombre}</h3>

      {varios && (
        <div className="producto-tonos" role="radiogroup" aria-label={`Tonos de ${producto.nombre}`}>
          {producto.variantes.map((v) => {
            const s = v.inventario?.cantidad ?? null;
            const sinStock = s !== null && s <= 0;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={v.id === variante?.id}
                aria-label={`${v.tono ?? v.sku}${sinStock ? ' (agotado)' : ''}`}
                title={`${v.tono ?? v.sku}${sinStock ? ' — Agotado' : ''}`}
                onClick={() => setVarianteId(v.id)}
                className={
                  'producto-tono' +
                  (v.id === variante?.id ? ' producto-tono--selected' : '') +
                  (sinStock ? ' producto-tono--agotado' : '')
                }
                style={{ background: v.codigoHex ?? '#E5DAD1' }}
              />
            );
          })}
        </div>
      )}
      {variante?.tono && (
        <p className="producto-tono-nombre">
          {variante.tono}
          {agotado ? ' · Agotado' : ''}
        </p>
      )}

      <p className="producto-precio">
        {varios ? <Precio valor={variante.precio} /> : <Precio valor={precioMinimo(producto)} prefijo="Desde" />}
      </p>
      <a className="btn btn-primary" href={href}>
        Ver producto
      </a>
    </article>
  );
}
