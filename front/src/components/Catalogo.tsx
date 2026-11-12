import { useMemo, useState, type ReactNode } from 'react';
import { Sidebar, type Categoria, type FiltrosCatalogo, type Marca } from './Sidebar';
import TarjetaProducto from './TarjetaProducto';
import type { ProductoCatalogo } from '../lib/types';
import './Main.css';
import './Home.css';

interface CatalogoProps {
  categorias: Categoria[];
  productos: ProductoCatalogo[];
  busqueda?: string;
  /** Categoría elegida al llegar (por ejemplo desde /categoria/2 o ?categoria=2). */
  categoriaInicial?: string | null;
  /** Contenido estático de Astro (Hero y franja de valores), pasado como slots. */
  hero?: ReactNode;
  contexto?: ReactNode;
}

type Orden = 'destacados' | 'precio-asc' | 'precio-desc' | 'populares' | 'calificacion';

const ORDENES: { valor: Orden; texto: string }[] = [
  { valor: 'destacados', texto: 'Destacados' },
  { valor: 'precio-asc', texto: 'Precio: menor a mayor' },
  { valor: 'precio-desc', texto: 'Precio: mayor a menor' },
  { valor: 'populares', texto: 'Más vendidos' },
  { valor: 'calificacion', texto: 'Mejor calificados' },
];

const precioMinimo = (p: ProductoCatalogo) => Math.min(...p.variantes.map((v) => v.precio));
const stock = (v: ProductoCatalogo['variantes'][number]) => v.inventario?.cantidad ?? 0;

/**
 * Isla interactiva de la página principal (Módulo 3): Sidebar (filtros) + grilla del
 * catálogo. Comparten el estado de filtros, por eso viven en el mismo componente.
 * Todos los filtros se combinan entre sí y los resultados se actualizan al momento.
 */
export default function Catalogo({ categorias, productos, busqueda = '', categoriaInicial = null, hero, contexto }: CatalogoProps) {
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

  // Marcas que tienen productos en la tienda, en orden alfabético
  const marcas = useMemo<Marca[]>(() => {
    const mapa = new Map<string, string>();
    productos.forEach((p) => p.marca.id && mapa.set(p.marca.id, p.marca.nombre));
    return [...mapa.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [productos]);

  const filtrosIniciales: FiltrosCatalogo = {
    categoriaId: categoriaInicial,
    marcaId: null,
    tonoHex: null,
    precioMax: precioTope,
    soloDisponibles: false,
  };
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(filtrosIniciales);
  const [orden, setOrden] = useState<Orden>('destacados');

  const hayFiltros =
    filtros.categoriaId !== null ||
    filtros.marcaId !== null ||
    filtros.tonoHex !== null ||
    filtros.soloDisponibles ||
    filtros.precioMax < precioTope;

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = productos.filter((p) => {
      const precioOk = precioMinimo(p) <= filtros.precioMax;
      const tonoOk = !filtros.tonoHex || p.variantes.some((v) => v.codigoHex === filtros.tonoHex);
      const buscaOk = !q || p.nombre.toLowerCase().includes(q) || p.marca.nombre.toLowerCase().includes(q);
      const categoriaOk = !filtros.categoriaId || p.categoria?.id === filtros.categoriaId;
      const marcaOk = !filtros.marcaId || p.marca.id === filtros.marcaId;
      // Disponibilidad: si hay tono elegido, ese tono debe tener piezas
      const disponibleOk =
        !filtros.soloDisponibles ||
        p.variantes.some((v) => stock(v) > 0 && (!filtros.tonoHex || v.codigoHex === filtros.tonoHex));
      return precioOk && tonoOk && buscaOk && categoriaOk && marcaOk && disponibleOk;
    });

    const ordenada = [...lista];
    if (orden === 'precio-asc') ordenada.sort((a, b) => precioMinimo(a) - precioMinimo(b));
    if (orden === 'precio-desc') ordenada.sort((a, b) => precioMinimo(b) - precioMinimo(a));
    if (orden === 'populares') ordenada.sort((a, b) => (b.vendidos ?? 0) - (a.vendidos ?? 0));
    if (orden === 'calificacion') {
      ordenada.sort(
        (a, b) =>
          (b.calificacionPromedio ?? -1) - (a.calificacionPromedio ?? -1) || (b.totalResenas ?? 0) - (a.totalResenas ?? 0)
      );
    }
    return ordenada;
  }, [productos, filtros, busqueda, orden]);

  const categoriaActual = categorias.find((c) => c.id === filtros.categoriaId);
  const titulo = busqueda ? `Resultados para "${busqueda}"` : categoriaActual ? categoriaActual.nombre : 'Destacados';

  return (
    <div className="home-body">
      <Sidebar
        categorias={categorias}
        marcas={marcas}
        tonos={tonos}
        filtros={filtros}
        onFiltrosChange={setFiltros}
        precioTope={precioTope}
      />

      <div className="home-content">
        {hero}

        <main className="main-catalogo" id="catalogo">
          <div className="main-catalogo__head">
            <h2 style={{ font: 'var(--text-h2)' }}>{titulo}</h2>
            <div className="main-catalogo__controles">
              <span className="main-catalogo__count" role="status">
                {visibles.length} producto{visibles.length === 1 ? '' : 's'}
              </span>
              {hayFiltros && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFiltros({ ...filtrosIniciales, categoriaId: null })}>
                  Quitar filtros
                </button>
              )}
              <label className="main-catalogo__orden">
                <span>Ordenar</span>
                <select className="input" value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
                  {ORDENES.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.texto}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {visibles.length === 0 ? (
            <div className="main-error" role="status">
              <p>Sin resultados con esos filtros. Prueba quitando alguno o subiendo el precio máximo.</p>
            </div>
          ) : (
            <div className="main-grid">
              {visibles.map((producto) => (
                <TarjetaProducto key={producto.id} producto={producto} tonoHex={filtros.tonoHex} />
              ))}
            </div>
          )}
        </main>

        {contexto}
      </div>
    </div>
  );
}
