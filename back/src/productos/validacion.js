// back/src/productos/validacion.js
// Valida los datos de un producto completo (producto + variantes + imágenes)
// antes de guardarlo. Devuelve los datos limpios. Si algo está mal lanza un
// error con un mensaje que se le puede mostrar directo al administrador.

import { datosInvalidos } from '../auth/errores.js';

const limpiar = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
const SKU = /^[A-Z0-9-]{3,40}$/;
const HEX = /^#[0-9A-F]{6}$/;
const SIN_ETIQUETAS = /^[^<>{}]*$/;

function textoObligatorio(valor, campo, min, max) {
  const v = limpiar(valor);
  if (v.length < min || v.length > max) {
    throw datosInvalidos(`${campo}: debe tener entre ${min} y ${max} caracteres.`);
  }
  if (!SIN_ETIQUETAS.test(v)) throw datosInvalidos(`${campo}: tiene caracteres no permitidos.`);
  return v;
}

function textoOpcional(valor, campo, max) {
  const v = typeof valor === 'string' ? valor.trim() : '';
  if (!v) return null;
  if (v.length > max) throw datosInvalidos(`${campo}: máximo ${max} caracteres.`);
  if (!SIN_ETIQUETAS.test(v)) throw datosInvalidos(`${campo}: tiene caracteres no permitidos.`);
  return v;
}

function validarUrl(valor, numero) {
  const v = typeof valor === 'string' ? valor.trim() : '';
  let url;
  try {
    url = new URL(v);
  } catch {
    throw datosInvalidos(`Imagen ${numero}: la URL no es válida.`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw datosInvalidos(`Imagen ${numero}: la URL debe empezar con https://`);
  }
  if (v.length > 500) throw datosInvalidos(`Imagen ${numero}: la URL es demasiado larga.`);
  return v;
}

export function validarProducto(datos) {
  const nombre = textoObligatorio(datos.nombre, 'Nombre', 3, 120);
  const descripcion = textoOpcional(datos.descripcion, 'Descripción', 1000);

  if (!datos.categoriaId) throw datosInvalidos('Elige una categoría.');
  if (!datos.marcaId) throw datosInvalidos('Elige una marca.');

  // --- Variantes ---
  const variantes = Array.isArray(datos.variantes) ? datos.variantes : [];
  if (variantes.length === 0) throw datosInvalidos('Agrega al menos una variante (tono y precio).');
  if (variantes.length > 50) throw datosInvalidos('Máximo 50 variantes por producto.');

  const skus = new Set();
  const variantesLimpias = variantes.map((v, i) => {
    const n = i + 1;
    const sku = limpiar(v.sku).toUpperCase();
    if (!SKU.test(sku)) {
      throw datosInvalidos(`Variante ${n}: el SKU debe tener de 3 a 40 letras, números o guiones (ej. LAB-ROJ-001).`);
    }
    if (skus.has(sku)) throw datosInvalidos(`Variante ${n}: el SKU ${sku} está repetido.`);
    skus.add(sku);

    const precio = Number(v.precio);
    if (!Number.isFinite(precio) || precio <= 0 || precio > 100000) {
      throw datosInvalidos(`Variante ${n}: el precio debe ser mayor a 0.`);
    }

    const existencias = Number(v.existencias);
    if (!Number.isInteger(existencias) || existencias < 0 || existencias > 100000) {
      throw datosInvalidos(`Variante ${n}: las existencias deben ser un número entero de 0 en adelante.`);
    }

    const hex = limpiar(v.codigoHex).toUpperCase();
    if (hex && !HEX.test(hex)) throw datosInvalidos(`Variante ${n}: el color debe tener formato #RRGGBB.`);

    return {
      id: v.id ? String(v.id) : null,
      tono: textoOpcional(v.tono, `Variante ${n} (tono)`, 80),
      codigoHex: hex || null,
      presentacion: textoOpcional(v.presentacion, `Variante ${n} (presentación)`, 50),
      precio: Math.round(precio * 100) / 100,
      sku,
      existencias,
    };
  });

  // --- Imágenes ---
  const imagenes = Array.isArray(datos.imagenes) ? datos.imagenes : [];
  if (imagenes.length === 0) throw datosInvalidos('Agrega al menos una imagen.');
  if (imagenes.length > 10) throw datosInvalidos('Máximo 10 imágenes por producto.');

  const imagenesLimpias = imagenes.map((img, i) => ({
    urlImagen: validarUrl(img.urlImagen, i + 1),
    principal: Boolean(img.principal),
  }));
  // Debe haber exactamente una principal: si no marcaron ninguna, la primera;
  // si marcaron varias, se queda la primera marcada.
  const indicePrincipal = Math.max(0, imagenesLimpias.findIndex((img) => img.principal));
  imagenesLimpias.forEach((img, i) => (img.principal = i === indicePrincipal));

  return {
    nombre,
    descripcion,
    categoriaId: String(datos.categoriaId),
    marcaId: String(datos.marcaId),
    variantes: variantesLimpias,
    imagenes: imagenesLimpias,
  };
}