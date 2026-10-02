import { useMemo, useState, type ReactNode } from 'react';
import { Sidebar, type Categoria, type FiltrosCatalogo } from './Sidebar';
import type { ProductoCatalogo } from '../lib/types';
import './Main.css';
import './Home.css';

interface CatalogoProps {
  categorias: Categoria[];
  productos: ProductoCatalogo[];
  busqueda?: string;
  /** Contenido estático de Astro (Hero y franja de valores), pasado como slots. */
  hero?: ReactNode;
  contexto?: ReactNode;
}

const precioMinimo = (p: ProductoCatalogo) => Math.min(...p.variantes.map((v) => v.precio));

/**
 * Isla interactiva de la página principal: Sidebar (filtros) + grilla del
 * catálogo. Comparten el estado de filtros, por eso viven en el mismo componente.
 */
export default function Catalogo({ categorias, productos, busqueda = '', hero, contexto }: CatalogoProps) {
  const precioTope = useMemo(() => {
    const maximo = Math.max(10, ...productos.flatMap((p) => p.variantes.map((v) => v.precio)));
    return Math.ceil(maximo / 10) * 10;
  }, [productos]);

  const tonos = useMemo(() => {
    const mapa = new Map<string, string>();
    productos.forEach((p) =>
      p.variantes.forEach((v) => {
        if (v.codigoHex && !mapa.has(v.codigoHex)) mapa.set(v.codigoHex, v.tono ?? '');
      })
    );
    return Array.from(mapa.entries()).slice(0, 14);
  }, [productos]);

  const [filtros, setFiltros] = useState<FiltrosCatalogo>({ tonoHex: null, precioMax: precioTope });

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      const precioOk = precioMinimo(p) <= filtros.precioMax;
      const tonoOk = !filtros.tonoHex || p.variantes.some((v) => v.codigoHex === filtros.tonoHex);
      const buscaOk = !q || p.nombre.toLowerCase().includes(q) || p.marca.nombre.toLowerCase().includes(q);
      return precioOk && tonoOk && buscaOk;
    });
  }, [productos, filtros, busqueda]);

  return (
    <div className="home-body">
      <Sidebar
        categorias={categorias}
        tonos={tonos}
        filtros={filtros}
        onFiltrosChange={setFiltros}
        precioTope={precioTope}
      />

      <div className="home-content">
        {hero}

        <main className="main-catalogo" id="catalogo">
          <div className="main-catalogo__head">
            <h2 style={{ font: 'var(--text-h2)' }}>{busqueda ? `Resultados para "${busqueda}"` : 'Destacados'}</h2>
            <span className="main-catalogo__count">
              {visibles.length} producto{visibles.length === 1 ? '' : 's'}
            </span>
          </div>

          {visibles.length === 0 ? (
            <div className="main-error" role="status">
              <p>Sin resultados con esos filtros. Prueba quitando el tono o subiendo el precio máximo.</p>
            </div>
          ) : (
            <div className="main-grid">
              {visibles.map((producto) => {
                const imagen = producto.imagenes.find((i) => i.principal) ?? producto.imagenes[0];
                return (
                  <article key={producto.id} className="producto-card">
                    {imagen && <img src={imagen.urlImagen} alt={producto.nombre} className="producto-img" />}
                    <p className="producto-marca">{producto.marca.nombre}</p>
                    <h3 className="producto-nombre">{producto.nombre}</h3>
                    <p className="producto-precio">Desde ${precioMinimo(producto).toFixed(2)}</p>
                    <a className="btn btn-primary" href={`/producto/${producto.id}`}>
                      Ver producto
                    </a>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        {contexto}
      </div>
    </div>
  );
}
