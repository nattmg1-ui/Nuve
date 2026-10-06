// back/src/direcciones/validacion.js
// Validación de direcciones de envío (México). Se aplica en el backend aunque
// el formulario también valide, porque cualquiera puede mandar datos a la API
// sin pasar por el formulario. Devuelve los datos limpios (sin espacios de más
// y con el estado escrito siempre igual).

import { datosInvalidos } from '../auth/errores.js';

export const ESTADOS_MX = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

const sinAcentos = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const limpiar = (valor) => (typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '');

// Letras con acentos y ñ
const L = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const SOLO_LETRAS = new RegExp(`^[${L} .'-]+$`); // ciudad
const LETRAS_Y_NUMEROS = new RegExp(`^[${L}0-9 .,'#°-]+$`); // calle y colonia
const TIENE_LETRA = new RegExp(`[${L}]`);
const NUMERO_EXTERIOR = /^(S\/N|[0-9]{1,6}[A-Z]?(-[0-9A-Z]{1,4})?)$/; // 123, 45B, 12-A, S/N
const CODIGO_POSTAL = /^(?!00)[0-9]{5}$/; // 5 dígitos; no existe ninguno que empiece con 00
const SIN_ETIQUETAS = /^[^<>{}]+$/;

function texto(valor, { campo, min, max, patron, requerido = true }) {
  const v = limpiar(valor);
  if (!v) {
    if (requerido) throw datosInvalidos(`Completa el campo ${campo}.`);
    return null;
  }
  if (v.length < min || v.length > max) {
    throw datosInvalidos(`El campo ${campo} debe tener entre ${min} y ${max} caracteres.`);
  }
  if (!patron.test(v)) throw datosInvalidos(`El campo ${campo} tiene caracteres no permitidos.`);
  if (!TIENE_LETRA.test(v)) throw datosInvalidos(`El campo ${campo} debe contener letras.`);
  return v;
}

function coordenada(valor, campo, limite) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || Math.abs(n) > limite) throw datosInvalidos(`${campo} inválida.`);
  return n;
}

export function validarDireccion(datos) {
  const calle = texto(datos.calle, { campo: 'calle', min: 3, max: 100, patron: LETRAS_Y_NUMEROS });

  // Se quitan los espacios internos: "1200 b" queda como "1200B" y "s / n" como "S/N".
  const numero = limpiar(datos.numero).toUpperCase().replace(/\s+/g, '');
  if (!numero) throw datosInvalidos('Completa el número exterior (escribe S/N si no tiene).');
  if (!NUMERO_EXTERIOR.test(numero)) {
    throw datosInvalidos('Número exterior inválido. Ejemplos válidos: 123, 45B, 12-A o S/N.');
  }

  const colonia = texto(datos.colonia, { campo: 'colonia', min: 2, max: 80, patron: LETRAS_Y_NUMEROS });
  const ciudad = texto(datos.ciudad, { campo: 'ciudad o municipio', min: 2, max: 60, patron: SOLO_LETRAS });

  const estadoEscrito = limpiar(datos.estado);
  const estado = ESTADOS_MX.find((e) => sinAcentos(e) === sinAcentos(estadoEscrito));
  if (!estado) throw datosInvalidos('Elige un estado de la lista.');

  const codigoPostal = limpiar(datos.codigoPostal);
  if (!CODIGO_POSTAL.test(codigoPostal)) throw datosInvalidos('El código postal debe tener 5 dígitos.');

  const referencias = texto(datos.referencias, {
    campo: 'referencias',
    min: 3,
    max: 150,
    patron: SIN_ETIQUETAS,
    requerido: false,
  });

  return {
    calle,
    numero,
    colonia,
    ciudad,
    estado,
    codigoPostal,
    referencias,
    latitud: coordenada(datos.latitud, 'Latitud', 90),
    longitud: coordenada(datos.longitud, 'Longitud', 180),
  };
}