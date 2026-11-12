// back/src/catalogo/validacion.js
// Validación de categorías y marcas (Módulo 9: el administrador las crea y edita).
// Nombre obligatorio de 2 a 120 caracteres y sin repetirse (sin importar
// mayúsculas ni acentos), descripción opcional de hasta 255.
import { query } from '../db.js';
import { datosInvalidos } from '../auth/errores.js';

const TABLAS = { categoria: 'La categoría', marca: 'La marca' };

/** Limpia y valida los datos. `id` es el registro que se edita (null al crear). */
export async function validarCatalogo(tabla, datos, id = null) {
  const etiqueta = TABLAS[tabla];
  const nombre = String(datos.nombre ?? '').trim().replace(/\s+/g, ' ');
  if (nombre.length < 2) throw datosInvalidos(`${etiqueta} necesita un nombre de al menos 2 letras.`);
  if (nombre.length > 120) throw datosInvalidos(`El nombre es muy largo (máximo 120 caracteres).`);

  const descripcion = typeof datos.descripcion === 'string' ? datos.descripcion.trim() : '';
  if (descripcion.length > 255) throw datosInvalidos('La descripción es muy larga (máximo 255 caracteres).');

  // unaccent no siempre está instalado: se compara con translate para quitar acentos
  const { rows } = await query(
    `SELECT id FROM ${tabla}
     WHERE lower(translate(nombre, 'ÁÉÍÓÚáéíóúÜüÑñ', 'AEIOUaeiouUuNn')) = lower(translate($1, 'ÁÉÍÓÚáéíóúÜüÑñ', 'AEIOUaeiouUuNn'))
       AND ($2::int IS NULL OR id <> $2::int)`,
    [nombre, id]
  );
  if (rows.length) throw datosInvalidos(`Ya existe ${tabla === 'marca' ? 'una marca' : 'una categoría'} llamada "${nombre}".`);

  return { nombre, descripcion: descripcion || null, activo: datos.activo ?? true };
}
