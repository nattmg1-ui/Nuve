import './Sidebar.css';

export interface Categoria {
  id: string;
  nombre: string;
}

export interface Marca {
  id: string;
  nombre: string;
}

/** Filtros del catálogo (Módulo 3). Se pueden combinar todos a la vez. */
export interface FiltrosCatalogo {
  categoriaId: string | null;
  marcaId: string | null;
  tonoHex: string | null;
  precioMax: number;
  soloDisponibles: boolean;
}

interface SidebarProps {
  categorias: Categoria[];
  marcas: Marca[];
  tonos: [string, string][];
  filtros: FiltrosCatalogo;
  onFiltrosChange: (filtros: FiltrosCatalogo) => void;
  precioTope: number;
}

export function Sidebar({ categorias, marcas, tonos, filtros, onFiltrosChange, precioTope }: SidebarProps) {
  const cambiar = (parcial: Partial<FiltrosCatalogo>) => onFiltrosChange({ ...filtros, ...parcial });

  return (
    <aside className="sidebar" aria-label="Filtros del catálogo">
      <div className="sidebar__section">
        <h3 className="sidebar__title">Categorías</h3>
        <ul className="sidebar-list">
          <li>
            <button
              type="button"
              className={filtros.categoriaId === null ? 'is-active' : ''}
              aria-pressed={filtros.categoriaId === null}
              onClick={() => cambiar({ categoriaId: null })}
            >
              Todas
            </button>
          </li>
          {categorias.map((categoria) => (
            <li key={categoria.id}>
              <button
                type="button"
                className={filtros.categoriaId === categoria.id ? 'is-active' : ''}
                aria-pressed={filtros.categoriaId === categoria.id}
                onClick={() => cambiar({ categoriaId: filtros.categoriaId === categoria.id ? null : categoria.id })}
              >
                {categoria.nombre}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar__section">
        <label className="sidebar__title" htmlFor="filtro-marca">
          Marca
        </label>
        <select
          id="filtro-marca"
          className="input sidebar__select"
          value={filtros.marcaId ?? ''}
          onChange={(e) => cambiar({ marcaId: e.target.value || null })}
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
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
                onClick={() => cambiar({ tonoHex: filtros.tonoHex === hex ? null : hex })}
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
            onChange={(e) => cambiar({ precioMax: Number(e.target.value) })}
          />
          <div className="sidebar__price-value">Hasta ${filtros.precioMax}</div>
        </div>
      </div>

      <div className="sidebar__section">
        <h3 className="sidebar__title">Disponibilidad</h3>
        <label className="sidebar__check">
          <input
            type="checkbox"
            checked={filtros.soloDisponibles}
            onChange={(e) => cambiar({ soloDisponibles: e.target.checked })}
          />
          Solo con existencias
        </label>
      </div>

      <div className="sidebar__promo">
        <p>"No impone un estándar único de belleza — ilumina el tono que ya tienes."</p>
      </div>
    </aside>
  );
}
