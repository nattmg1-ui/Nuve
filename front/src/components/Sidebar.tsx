import './Sidebar.css';

export interface Categoria {
  id: string;
  nombre: string;
}

export interface FiltrosCatalogo {
  tonoHex: string | null;
  precioMax: number;
}

interface SidebarProps {
  categorias: Categoria[];
  tonos: [string, string][];
  filtros: FiltrosCatalogo;
  onFiltrosChange: (filtros: FiltrosCatalogo) => void;
  precioTope: number;
}

export function Sidebar({ categorias, tonos, filtros, onFiltrosChange, precioTope }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__section">
        <h3 className="sidebar__title">Categorías</h3>
        <ul className="sidebar-list">
          {categorias.map((categoria) => (
            <li key={categoria.id}>
              <a href={`/categoria/${categoria.id}`}>{categoria.nombre}</a>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar__section" id="filtro-tonos">
        <h3 className="sidebar__title">Filtrar por tono</h3>
        <div className="sidebar__swatches">
          {tonos.length ? (
            tonos.map(([hex, nombre]) => (
              <button
                key={hex}
                type="button"
                className={`swatch ${filtros.tonoHex === hex ? 'is-active' : ''}`}
                style={{ background: hex }}
                title={nombre}
                aria-label={`Tono ${nombre || hex}`}
                aria-pressed={filtros.tonoHex === hex}
                onClick={() => onFiltrosChange({ ...filtros, tonoHex: filtros.tonoHex === hex ? null : hex })}
              />
            ))
          ) : (
            <span className="sidebar__empty">Sin tonos aún</span>
          )}
        </div>
      </div>

      <div className="sidebar__section">
        <h3 className="sidebar__title">Precio</h3>
        <div className="sidebar__price">
          <input
            type="range"
            min={0}
            max={precioTope}
            step={10}
            value={filtros.precioMax}
            aria-label="Precio máximo"
            onChange={(e) => onFiltrosChange({ ...filtros, precioMax: Number(e.target.value) })}
          />
          <div className="sidebar__price-value">Hasta ${filtros.precioMax}</div>
        </div>
      </div>

      <div className="sidebar__promo">
        <p>"No impone un estándar único de belleza — ilumina el tono que ya tienes."</p>
      </div>
    </aside>
  );
}
