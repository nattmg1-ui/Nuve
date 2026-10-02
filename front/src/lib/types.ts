export type Rol = 'ADMIN' | 'OPERADOR' | 'CLIENTE';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: { nombre: Rol };
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
}

export interface ProductoCatalogo {
  id: string;
  nombre: string;
  marca: { nombre: string };
  variantes: Variante[];
  imagenes: Imagen[];
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
