import { useRef, useState } from 'react';
import './Panel.css';
import './Admin.css';

// Formulario para agregar o editar un producto completo: datos generales,
// variantes (tono, color, precio, SKU, existencias) e imágenes por URL.
// Se guarda todo junto en /api/admin/producto-guardar.

interface Opcion {
  id: string;
  nombre: string;
}

export interface ProductoEdicion {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  categoria: { id: string };
  marca: { id: string };
  variantes: {
    id: string;
    tono: string | null;
    codigoHex: string | null;
    presentacion: string | null;
    precio: number;
    sku: string;
    inventario: { cantidad: number } | null;
  }[];
  imagenes: { urlImagen: string; principal: boolean }[];
}

interface VarianteForm {
  clave: number;
  id: string | null;
  tono: string;
  codigoHex: string;
  presentacion: string;
  precio: string;
  sku: string;
  existencias: string;
}

interface ImagenForm {
  clave: number;
  urlImagen: string;
  principal: boolean;
}

interface Props {
  marcas: Opcion[];
  categorias: Opcion[];
  producto?: ProductoEdicion;
}

let contador = 0;
const nuevaClave = () => ++contador;

const varianteVacia = (): VarianteForm => ({
  clave: nuevaClave(),
  id: null,
  tono: '',
  codigoHex: '',
  presentacion: '',
  precio: '',
  sku: '',
  existencias: '0',
});

const imagenVacia = (principal = false): ImagenForm => ({ clave: nuevaClave(), urlImagen: '', principal });

const esUrlValida = (texto: string) => /^https?:\/\/\S+$/i.test(texto.trim());

export default function ProductoForm({ marcas, categorias, producto }: Props) {
  const [nombre, setNombre] = useState(producto?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? '');
  const [categoriaId, setCategoriaId] = useState(producto?.categoria.id ?? '');
  const [marcaId, setMarcaId] = useState(producto?.marca.id ?? '');

  const [variantes, setVariantes] = useState<VarianteForm[]>(() =>
    producto?.variantes.length
      ? producto.variantes.map((v) => ({
          clave: nuevaClave(),
          id: v.id,
          tono: v.tono ?? '',
          codigoHex: v.codigoHex ?? '',
          presentacion: v.presentacion ?? '',
          precio: String(v.precio),
          sku: v.sku,
          existencias: String(v.inventario?.cantidad ?? 0),
        }))
      : [varianteVacia()]
  );

  const [imagenes, setImagenes] = useState<ImagenForm[]>(() =>
    producto?.imagenes.length
      ? producto.imagenes.map((img) => ({ clave: nuevaClave(), urlImagen: img.urlImagen, principal: img.principal }))
      : [imagenVacia(true)]
  );

  // Imágenes cuya URL no se pudo cargar (para avisar en la vista previa)
  const [rotas, setRotas] = useState<Set<number>>(new Set());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // ---------- Variantes ----------
  const cambiarVariante = (clave: number, campo: keyof VarianteForm, valor: string) =>
    setVariantes((lista) => lista.map((v) => (v.clave === clave ? { ...v, [campo]: valor } : v)));

  const quitarVariante = (clave: number) => setVariantes((lista) => lista.filter((v) => v.clave !== clave));

  // ---------- Imágenes ----------
  const cambiarUrl = (clave: number, url: string) => {
    setImagenes((lista) => lista.map((img) => (img.clave === clave ? { ...img, urlImagen: url } : img)));
    setRotas((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(clave);
      return nuevo;
    });
  };

  const marcarPrincipal = (clave: number) =>
    setImagenes((lista) => lista.map((img) => ({ ...img, principal: img.clave === clave })));

  const quitarImagen = (clave: number) =>
    setImagenes((lista) => {
      const restantes = lista.filter((img) => img.clave !== clave);
      // Si se quitó la principal, la primera pasa a ser principal
      if (restantes.length && !restantes.some((img) => img.principal)) restantes[0] = { ...restantes[0], principal: true };
      return restantes;
    });

  const marcarRota = (clave: number) => setRotas((prev) => new Set(prev).add(clave));

  // ---------- Guardar ----------
  async function guardar() {
    setError(null);

    if (variantes.length === 0) return mostrarError('Agrega al menos una variante.');
    if (imagenes.length === 0) return mostrarError('Agrega al menos una imagen.');
    if (imagenes.some((img) => !esUrlValida(img.urlImagen))) {
      return mostrarError('Revisa las URL de las imágenes: deben empezar con https://');
    }

    setGuardando(true);
    try {
      const respuesta = await fetch('/api/admin/producto-guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: producto?.id ?? null,
          datos: {
            nombre,
            descripcion,
            categoriaId,
            marcaId,
            variantes: variantes.map((v) => ({
              id: v.id,
              tono: v.tono,
              codigoHex: v.codigoHex,
              presentacion: v.presentacion,
              precio: v.precio,
              sku: v.sku,
              existencias: v.existencias,
            })),
            imagenes: imagenes.map((img) => ({ urlImagen: img.urlImagen.trim(), principal: img.principal })),
          },
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? 'No se pudo guardar el producto.');

      const mensaje = producto ? 'Producto actualizado.' : `Producto "${datos.producto.nombre}" agregado.`;
      window.location.href = `/admin/productos?ok=${encodeURIComponent(mensaje)}`;
    } catch (err) {
      mostrarError((err as Error).message);
      setGuardando(false);
    }
  }

  function mostrarError(mensaje: string) {
    setError(mensaje);
    setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }

  return (
    <form
      className="pf"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      {error && (
        <div ref={errorRef} role="alert" className="aviso aviso--error" style={{ marginBottom: 0 }}>
          {error}
        </div>
      )}

      {/* ---------- Datos generales ---------- */}
      <section className="pf__seccion">
        <h3>Datos generales</h3>
        <p className="pf__ayuda">Así aparecerá el producto en la tienda.</p>
        <div className="pf__grid">
          <div className="pf__campo pf__campo--completo">
            <label htmlFor="pf-nombre">Nombre</label>
            <input
              id="pf-nombre"
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              minLength={3}
              maxLength={120}
              placeholder="Labial Mate Pasión"
            />
          </div>

          <div className="pf__campo">
            <label htmlFor="pf-categoria">Categoría</label>
            <select
              id="pf-categoria"
              className="input"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
            >
              <option value="" disabled>
                Elige una categoría
              </option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="pf__campo">
            <label htmlFor="pf-marca">Marca</label>
            <select id="pf-marca" className="input" value={marcaId} onChange={(e) => setMarcaId(e.target.value)} required>
              <option value="" disabled>
                Elige una marca
              </option>
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="pf__campo pf__campo--completo">
            <label htmlFor="pf-descripcion">Descripción (opcional)</label>
            <textarea
              id="pf-descripcion"
              className="input"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={1000}
              placeholder="Acabado, duración, beneficios..."
            />
          </div>
        </div>
      </section>

      {/* ---------- Variantes ---------- */}
      <section className="pf__seccion">
        <h3>Variantes</h3>
        <p className="pf__ayuda">
          Cada tono o presentación con su propio precio, SKU y existencias. Si quitas una variante, deja de venderse pero
          los pedidos anteriores la conservan.
        </p>

        {variantes.map((v, i) => (
          <div className="pf__variante" key={v.clave}>
            <div className="pf__campo">
              <label htmlFor={`pf-tono-${v.clave}`}>Tono</label>
              <input
                id={`pf-tono-${v.clave}`}
                className="input"
                value={v.tono}
                onChange={(e) => cambiarVariante(v.clave, 'tono', e.target.value)}
                maxLength={80}
                placeholder="Rojo pasión"
              />
            </div>

            <div className="pf__campo">
              <span className="pf__etiqueta">Color</span>
              <div className="pf__color">
                <input
                  type="color"
                  aria-label={`Color de la variante ${i + 1}`}
                  value={/^#[0-9A-Fa-f]{6}$/.test(v.codigoHex) ? v.codigoHex : '#CCCCCC'}
                  onChange={(e) => cambiarVariante(v.clave, 'codigoHex', e.target.value.toUpperCase())}
                />
                <input
                  className="input"
                  aria-label={`Código de color de la variante ${i + 1}`}
                  value={v.codigoHex}
                  onChange={(e) => cambiarVariante(v.clave, 'codigoHex', e.target.value.toUpperCase())}
                  pattern="#[0-9A-Fa-f]{6}"
                  title="Formato #RRGGBB, por ejemplo #C0392B"
                  maxLength={7}
                  placeholder="#C0392B"
                />
              </div>
            </div>

            <div className="pf__campo">
              <label htmlFor={`pf-presentacion-${v.clave}`}>Presentación</label>
              <input
                id={`pf-presentacion-${v.clave}`}
                className="input"
                value={v.presentacion}
                onChange={(e) => cambiarVariante(v.clave, 'presentacion', e.target.value)}
                maxLength={50}
                placeholder="5 ml"
              />
            </div>

            <div className="pf__campo">
              <label htmlFor={`pf-sku-${v.clave}`}>SKU</label>
              <input
                id={`pf-sku-${v.clave}`}
                className="input"
                value={v.sku}
                onChange={(e) => cambiarVariante(v.clave, 'sku', e.target.value.toUpperCase().replace(/\s/g, ''))}
                required
                pattern="[A-Za-z0-9\-]{3,40}"
                title="De 3 a 40 letras, números o guiones. Ej. LAB-ROJ-001"
                maxLength={40}
                placeholder="LAB-ROJ-001"
              />
            </div>

            <div className="pf__campo">
              <label htmlFor={`pf-precio-${v.clave}`}>Precio</label>
              <input
                id={`pf-precio-${v.clave}`}
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                value={v.precio}
                onChange={(e) => cambiarVariante(v.clave, 'precio', e.target.value)}
                required
                placeholder="189.00"
              />
            </div>

            <div className="pf__campo">
              <label htmlFor={`pf-existencias-${v.clave}`}>Existencias</label>
              <input
                id={`pf-existencias-${v.clave}`}
                className="input"
                type="number"
                min="0"
                step="1"
                value={v.existencias}
                onChange={(e) => cambiarVariante(v.clave, 'existencias', e.target.value)}
                required
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm pf__quitar"
              onClick={() => quitarVariante(v.clave)}
              disabled={variantes.length === 1}
              title={variantes.length === 1 ? 'El producto necesita al menos una variante' : undefined}
            >
              Quitar
            </button>
          </div>
        ))}

        <button
          type="button"
          className="btn btn-secondary btn-sm pf__agregar"
          onClick={() => setVariantes((lista) => [...lista, varianteVacia()])}
        >
          Agregar variante
        </button>
      </section>

      {/* ---------- Imágenes ---------- */}
      <section className="pf__seccion">
        <h3>Imágenes</h3>
        <p className="pf__ayuda">
          Pega la URL de cada imagen (debe empezar con https://). La principal es la que se ve en el catálogo.
        </p>

        {imagenes.map((img, i) => {
          const urlOk = esUrlValida(img.urlImagen);
          return (
            <div className="pf__imagen" key={img.clave}>
              {urlOk && !rotas.has(img.clave) ? (
                <img
                  className="pf__preview"
                  src={img.urlImagen.trim()}
                  alt={`Vista previa ${i + 1}`}
                  onError={() => marcarRota(img.clave)}
                />
              ) : (
                <div className="pf__preview">{urlOk ? 'No carga' : 'Sin imagen'}</div>
              )}

              <div className="pf__campo">
                <label htmlFor={`pf-url-${img.clave}`}>URL de la imagen {i + 1}</label>
                <input
                  id={`pf-url-${img.clave}`}
                  className="input"
                  type="url"
                  value={img.urlImagen}
                  onChange={(e) => cambiarUrl(img.clave, e.target.value)}
                  required
                  maxLength={500}
                  placeholder="https://..."
                />
                {rotas.has(img.clave) && (
                  <span className="pf__ayuda" style={{ margin: 0, color: 'var(--color-warning)' }}>
                    No se pudo cargar esta imagen. Revisa que la URL sea de una imagen pública.
                  </span>
                )}
              </div>

              <label className="pf__principal">
                <input
                  type="radio"
                  name="imagen-principal"
                  checked={img.principal}
                  onChange={() => marcarPrincipal(img.clave)}
                />
                Principal
              </label>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => quitarImagen(img.clave)}
                disabled={imagenes.length === 1}
              >
                Quitar
              </button>
            </div>
          );
        })}

        {imagenes.length < 10 && (
          <button
            type="button"
            className="btn btn-secondary btn-sm pf__agregar"
            onClick={() => setImagenes((lista) => [...lista, imagenVacia(lista.length === 0)])}
          >
            Agregar imagen
          </button>
        )}
      </section>

      <div className="pf__acciones">
        <button type="submit" className="btn btn-primary" disabled={guardando}>
          {guardando ? 'Guardando...' : producto ? 'Guardar cambios' : 'Agregar producto'}
        </button>
        <a className="btn btn-secondary" href="/admin/productos">
          Cancelar
        </a>
      </div>
    </form>
  );
}