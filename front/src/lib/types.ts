export type Rol = 'ADMIN' | 'OPERADOR' | 'CLIENTE';

/** Tema visual elegido en "Mi perfil". SISTEMA = sigue al dispositivo. */
export type TemaVisual = 'SISTEMA' | 'CLARO' | 'OSCURO';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: { nombre: Rol };
  tema: TemaVisual;
}

export interface Imagen {
  urlImagen: string;
  principal: boolean;
}

export interface Variante {
  id: string;
  tono: string | null;
  codigoHex: string | null;
  precio: number;
  sku: string;
  /** Foto propia del tono. Si no tiene, se usa la imagen principal del producto. */
  imagenUrl?: string | null;
  /** Existencias de este tono (cada tono tiene su propio stock). */
  inventario?: { cantidad: number } | null;
}

export interface ProductoCatalogo {
  id: string;
  nombre: string;
  marca: { id?: string; nombre: string };
  categoria?: { id: string; nombre: string };
  variantes: Variante[];
  imagenes: Imagen[];
  /** Promedio de estrellas (null si no tiene reseñas). */
  calificacionPromedio?: number | null;
  totalResenas?: number;
  /** Piezas vendidas (para ordenar por popularidad). */
  vendidos?: number;
}

/** Campos de producto que piden las tarjetas del catálogo (para reutilizar en varias consultas). */
export const CAMPOS_TARJETA = `
  id nombre
  marca { id nombre }
  categoria { id nombre }
  calificacionPromedio totalResenas vendidos
  variantes { id tono codigoHex precio sku imagenUrl inventario { cantidad } }
  imagenes { urlImagen principal }
`;

export interface ResenaPublica {
  id: string;
  autor: string;
  calificacion: number;
  comentario: string | null;
  compraVerificada: boolean;
  fecha: string;
  esMia: boolean;
}

export interface CartItem {
  varianteId: string;
  productoId: string;
  nombre: string;
  tono?: string;
  precioUnitario: number;
  cantidad: number;
  imagenUrl?: string;
}