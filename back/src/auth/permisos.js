// src/auth/permisos.js
// Tabla ÚNICA de permisos: qué rol puede ejecutar cada query, mutation o
// campo anidado. Lo que no aparece aquí es público (catálogo, registro, login).
//
//   'AUTH'          -> cualquier usuario con sesión iniciada
//   [ROLES...]      -> solo esos roles
//
// Las reglas de "solo lo tuyo" (un cliente solo ve SUS pedidos, direcciones,
// etc.) se aplican dentro de resolvers.js, porque dependen del registro concreto.

import { ROLES } from './config.js';
import { noAutenticado, sinPermiso } from './errores.js';

const { ADMIN, OPERADOR } = ROLES;
const AUTH = 'AUTH';
const STAFF = [ADMIN, OPERADOR];

export const PERMISOS = {
  Query: {
    yo: AUTH,
    roles: [ADMIN],
    rol: [ADMIN],
    usuarios: [ADMIN],
    usuario: [ADMIN],
    carritos: AUTH,
    carrito: AUTH,
    direcciones: AUTH,
    direccion: AUTH,
    favoritos: AUTH,
    favorito: AUTH,
    pedidos: AUTH,
    pedido: AUTH,
  },

  Mutation: {
    // Roles y usuarios: solo administrador
    crearRol: [ADMIN], actualizarRol: [ADMIN], eliminarRol: [ADMIN],
    crearUsuario: [ADMIN], actualizarUsuario: [ADMIN], eliminarUsuario: [ADMIN],
    cambiarRolUsuario: [ADMIN], cambiarActivoUsuario: [ADMIN],

    // Catálogo: solo administrador
    crearMarca: [ADMIN], actualizarMarca: [ADMIN], eliminarMarca: [ADMIN],
    crearCategoria: [ADMIN], actualizarCategoria: [ADMIN], eliminarCategoria: [ADMIN],
    guardarProducto: [ADMIN], cambiarActivoProducto: [ADMIN],
    crearProducto: [ADMIN], actualizarProducto: [ADMIN], eliminarProducto: [ADMIN],
    crearVarianteProducto: [ADMIN], actualizarVarianteProducto: [ADMIN], eliminarVarianteProducto: [ADMIN],
    crearImagenProducto: [ADMIN], actualizarImagenProducto: [ADMIN], eliminarImagenProducto: [ADMIN],

    // Inventario y pedidos: operación diaria (operador y admin)
    crearInventario: STAFF, actualizarInventario: STAFF, eliminarInventario: [ADMIN],
    actualizarPedido: STAFF,
    eliminarPedido: [ADMIN],
    crearDetallePedido: [ADMIN], actualizarDetallePedido: [ADMIN], eliminarDetallePedido: [ADMIN],

    // Compra y datos personales: cualquier usuario con sesión (ver "solo lo tuyo" en resolvers.js)
    crearCarrito: AUTH, actualizarCarrito: AUTH, eliminarCarrito: AUTH,
    crearDetalleCarrito: AUTH, actualizarDetalleCarrito: AUTH, eliminarDetalleCarrito: AUTH,
    crearDireccion: AUTH, actualizarDireccion: AUTH, eliminarDireccion: AUTH,
    crearFavorito: AUTH, eliminarFavorito: AUTH,
    crearResena: AUTH, actualizarResena: AUTH, eliminarResena: AUTH,
    crearPedido: AUTH, cancelarPedido: AUTH,
  },

  // Campos anidados que expondrían datos de otros usuarios
  Rol: { usuarios: [ADMIN] },
  Producto: { favoritos: STAFF },
  Resena: { usuario: STAFF },
  Favorito: { usuario: AUTH },
  Carrito: { usuario: AUTH },
  Direccion: { usuario: AUTH },
  Pedido: { usuario: AUTH },
};

export function verificarPermiso(regla, ctx) {
  if (!regla) return;
  if (!ctx.usuario) throw noAutenticado();
  if (regla !== AUTH && !regla.includes(ctx.usuario.rol)) throw sinPermiso();
}

/** Envuelve cada resolver listado en PERMISOS con su verificación de rol. */
export function protegerResolvers(resolvers) {
  for (const [tipo, campos] of Object.entries(PERMISOS)) {
    for (const [campo, regla] of Object.entries(campos)) {
      const original = resolvers[tipo]?.[campo];
      if (!original) throw new Error(`Permiso definido para ${tipo}.${campo} pero no existe el resolver`);
      resolvers[tipo][campo] = (parent, args, ctx, info) => {
        verificarPermiso(regla, ctx);
        return original(parent, args, ctx, info);
      };
    }
  }
  return resolvers;
}