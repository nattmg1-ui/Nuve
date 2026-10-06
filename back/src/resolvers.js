// src/resolvers.js
// Resolvers de GraphQL sobre PostgreSQL (paquete "pg"), vía el pool de
// src/db.js. Cada tabla del DER tiene: un mapRow (fila SQL en snake_case
// -> objeto GraphQL en camelCase), sus Query, sus resolvers de relaciones
// anidadas, y su CRUD en Mutation. Antes esto corría sobre arreglos en
// memoria (src/data/mock.js); ese archivo ya no se usa, se deja solo
// como referencia de los datos que ahora viven en la base de datos real
// (ver back/db/schema.sql y back/db/seed.sql).

import { pool, query } from './db.js';
import { ROLES } from './auth/config.js';
import { protegerResolvers } from './auth/permisos.js';
import { sinPermiso, datosInvalidos } from './auth/errores.js';
import * as authServicio from './auth/servicio.js';
import { estadosSiguientes, validarTransicion } from './pedidos/estados.js';
import { validarDireccion } from './direcciones/validacion.js';
import { validarProducto } from './productos/validacion.js';
import { guardarProductoCompleto } from './productos/servicio.js';

const hoy = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------------
// HELPERS DE MAPEO (snake_case de la BD -> camelCase de GraphQL)
// ------------------------------------------------------------------

const id = (v) => (v === null || v === undefined ? v : String(v));
const num = (v) => (v === null || v === undefined ? v : Number(v));
const fecha = (v) => {
  if (!v) return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};

const mapRol = (r) => ({ id: id(r.id), nombre: r.nombre, descripcion: r.descripcion });

const mapUsuario = (r) => ({
  id: id(r.id),
  rolId: id(r.rol_id),
  nombre: r.nombre,
  correo: r.correo,
  password: r.password,
  activo: r.activo,
  fechaRegistro: fecha(r.fecha_registro),
});

const mapMarca = (r) => ({ id: id(r.id), nombre: r.nombre, descripcion: r.descripcion, activo: r.activo });

const mapCategoria = (r) => ({ id: id(r.id), nombre: r.nombre, descripcion: r.descripcion, activo: r.activo });

const mapProducto = (r) => ({
  id: id(r.id),
  categoriaId: id(r.categoria_id),
  marcaId: id(r.marca_id),
  nombre: r.nombre,
  descripcion: r.descripcion,
  activo: r.activo,
  fechaRegistro: fecha(r.fecha_registro),
});

const mapVariante = (r) => ({
  id: id(r.id),
  productoId: id(r.producto_id),
  tono: r.tono,
  codigoHex: r.codigo_hex,
  presentacion: r.presentacion,
  precio: num(r.precio),
  sku: r.sku,
  activo: r.activo,
});

const mapImagen = (r) => ({
  id: id(r.id),
  productoId: id(r.producto_id),
  urlImagen: r.url_imagen,
  principal: r.principal,
});

const mapInventario = (r) => ({
  id: id(r.id),
  varianteId: id(r.variante_id),
  cantidad: r.cantidad,
  fechaActualizacion: fecha(r.fecha_actualizacion),
});

const mapCarrito = (r) => ({
  id: id(r.id),
  usuarioId: id(r.usuario_id),
  estado: r.estado,
  fechaCreacion: fecha(r.fecha_creacion),
});

const mapDetalleCarrito = (r) => ({
  id: id(r.id),
  carritoId: id(r.carrito_id),
  varianteId: id(r.variante_id),
  cantidad: r.cantidad,
  precioUnitario: num(r.precio_unitario),
});

const mapDireccion = (r) => ({
  id: id(r.id),
  usuarioId: id(r.usuario_id),
  calle: r.calle,
  numero: r.numero,
  colonia: r.colonia,
  ciudad: r.ciudad,
  estado: r.estado,
  codigoPostal: r.codigo_postal,
  referencias: r.referencias,
  latitud: num(r.latitud),
  longitud: num(r.longitud),
});

const mapFavorito = (r) => ({
  id: id(r.id),
  usuarioId: id(r.usuario_id),
  productoId: id(r.producto_id),
  fechaAgregado: fecha(r.fecha_agregado),
});

const mapResena = (r) => ({
  id: id(r.id),
  usuarioId: id(r.usuario_id),
  productoId: id(r.producto_id),
  calificacion: r.calificacion,
  comentario: r.comentario,
  compraVerificada: r.compra_verificada,
  fecha: fecha(r.fecha),
});

const mapPedido = (r) => ({
  id: id(r.id),
  usuarioId: id(r.usuario_id),
  direccionId: id(r.direccion_id),
  fecha: fecha(r.fecha),
  subtotal: num(r.subtotal),
  total: num(r.total),
  estado: r.estado,
  transaccionPagoId: r.transaccion_pago_id,
});

const mapDetallePedido = (r) => ({
  id: id(r.id),
  pedidoId: id(r.pedido_id),
  varianteId: id(r.variante_id),
  cantidad: r.cantidad,
  precioUnitario: num(r.precio_unitario),
  subtotal: num(r.subtotal),
});

// Pequeños helpers para no repetir el patrón "SELECT ... WHERE id = $1"
async function findById(table, mapRow, tid) {
  const { rows } = await query(`SELECT * FROM ${table} WHERE id = $1`, [tid]);
  return rows[0] ? mapRow(rows[0]) : null;
}
async function findAll(table, mapRow, orderBy = 'id') {
  const { rows } = await query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
  return rows.map(mapRow);
}
async function findWhere(table, mapRow, column, value, orderBy = 'id') {
  const { rows } = await query(`SELECT * FROM ${table} WHERE ${column} = $1 ORDER BY ${orderBy}`, [value]);
  return rows.map(mapRow);
}

// ------------------------------------------------------------------
// REGLAS DE "SOLO LO TUYO"
// El rol decide QUÉ operaciones puede hacer (auth/permisos.js); estas
// funciones deciden SOBRE QUÉ registros: un cliente solo toca lo suyo,
// admin y operador tocan todo.
// ------------------------------------------------------------------

const esStaff = (u) => u && (u.rol === ROLES.ADMIN || u.rol === ROLES.OPERADOR);

function asegurarPropietario(ctx, dueñoId) {
  if (esStaff(ctx.usuario)) return;
  if (String(dueñoId) !== String(ctx.usuario.id)) throw sinPermiso('Ese registro no es tuyo.');
}

async function dueñoDe(table, tid) {
  const { rows } = await query(`SELECT usuario_id FROM ${table} WHERE id = $1`, [tid]);
  return rows[0]?.usuario_id ?? null;
}

async function asegurarPropio(ctx, table, tid) {
  const dueño = await dueñoDe(table, tid);
  if (dueño === null) throw datosInvalidos('El registro no existe.');
  asegurarPropietario(ctx, dueño);
}

async function asegurarCarritoPropio(ctx, carritoId) {
  await asegurarPropio(ctx, 'carrito', carritoId);
}

const usuarioObjetivo = (ctx, usuarioIdSolicitado) =>
  esStaff(ctx.usuario) && usuarioIdSolicitado ? usuarioIdSolicitado : ctx.usuario.id;

const listaPropia = (table, mapRow, ctx) =>
  esStaff(ctx.usuario) ? findAll(table, mapRow) : findWhere(table, mapRow, 'usuario_id', ctx.usuario.id);

async function unoPropio(table, mapRow, tid, ctx) {
  const registro = await findById(table, mapRow, tid);
  if (registro) asegurarPropietario(ctx, registro.usuarioId);
  return registro;
}

// Devuelve al inventario las piezas de un pedido (al cancelarlo).
async function restaurarStock(client, pedidoId) {
  await client.query(
    `UPDATE inventario i SET cantidad = i.cantidad + d.cantidad, fecha_actualizacion = CURRENT_DATE
     FROM detalle_pedido d WHERE d.pedido_id = $1 AND i.variante_id = d.variante_id`,
    [pedidoId]
  );
}

// Cambia el estado de un pedido respetando el orden permitido (pedidos/estados.js).
// Si pasa a CANCELADO devuelve el stock. Todo en una transacción.
async function cambiarEstadoPedido(pedidoId, nuevoEstado) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const previo = await client.query('SELECT estado FROM pedido WHERE id = $1 FOR UPDATE', [pedidoId]);
    if (!previo.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    // FOR UPDATE bloquea la fila: si dos personas cambian el mismo pedido a la vez,
    // la segunda espera y valida contra el estado ya actualizado.
    validarTransicion(previo.rows[0].estado, nuevoEstado);
    if (nuevoEstado === 'CANCELADO') {
      await restaurarStock(client, pedidoId);
    }
    const { rows } = await client.query('UPDATE pedido SET estado = $1 WHERE id = $2 RETURNING *', [nuevoEstado, pedidoId]);
    await client.query('COMMIT');
    return mapPedido(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export const resolvers = protegerResolvers({
  // ------------------------------------------------------------------
  // QUERY
  // ------------------------------------------------------------------
  Query: {
    yo: async (_, __, ctx) => {
      const usuario = await findById('usuario', mapUsuario, ctx.usuario.id);
      return usuario && usuario.activo ? usuario : null;
    },

    roles: () => findAll('rol', mapRol),
    rol: (_, { id: tid }) => findById('rol', mapRol, tid),

    usuarios: () => findAll('usuario', mapUsuario),
    usuario: (_, { id: tid }) => findById('usuario', mapUsuario, tid),

    marcas: () => findAll('marca', mapMarca),
    marca: (_, { id: tid }) => findById('marca', mapMarca, tid),

    categorias: () => findAll('categoria', mapCategoria),
    categoria: (_, { id: tid }) => findById('categoria', mapCategoria, tid),

    // La tienda solo muestra productos activos. El personal puede pedir también
    // los desactivados (para el panel de administración).
    productos: async (_, { limite, desde, incluirInactivos }, ctx) => {
      const params = [];
      const verTodos = incluirInactivos && esStaff(ctx.usuario);
      let sql = `SELECT * FROM producto ${verTodos ? '' : 'WHERE activo = TRUE'} ORDER BY id`;
      if (limite) {
        params.push(limite);
        sql += ` LIMIT $${params.length}`;
      }
      if (desde) {
        params.push(desde);
        sql += ` OFFSET $${params.length}`;
      }
      const { rows } = await query(sql, params);
      return rows.map(mapProducto);
    },
    producto: async (_, { id: tid }, ctx) => {
      const producto = await findById('producto', mapProducto, tid);
      if (!producto) return null;
      // Un producto desactivado no existe para los clientes
      return producto.activo || esStaff(ctx.usuario) ? producto : null;
    },

    variantesProducto: async () => {
      const { rows } = await query(
        `SELECT v.* FROM variante_producto v JOIN producto p ON p.id = v.producto_id
         WHERE v.activo = TRUE AND p.activo = TRUE ORDER BY v.id`
      );
      return rows.map(mapVariante);
    },
    varianteProducto: (_, { id: tid }) => findById('variante_producto', mapVariante, tid),

    imagenesProducto: () => findAll('imagen_producto', mapImagen),
    imagenProducto: (_, { id: tid }) => findById('imagen_producto', mapImagen, tid),

    carritos: (_, __, ctx) => listaPropia('carrito', mapCarrito, ctx),
    carrito: (_, { id: tid }, ctx) => unoPropio('carrito', mapCarrito, tid, ctx),

    direcciones: (_, __, ctx) => listaPropia('direccion', mapDireccion, ctx),
    direccion: (_, { id: tid }, ctx) => unoPropio('direccion', mapDireccion, tid, ctx),

    favoritos: (_, __, ctx) => listaPropia('favorito', mapFavorito, ctx),
    favorito: (_, { id: tid }, ctx) => unoPropio('favorito', mapFavorito, tid, ctx),

    resenas: () => findAll('resena', mapResena),
    resena: (_, { id: tid }) => findById('resena', mapResena, tid),

    pedidos: async (_, { estado }, ctx) => {
      const condiciones = [];
      const params = [];
      if (!esStaff(ctx.usuario)) {
        params.push(ctx.usuario.id);
        condiciones.push(`usuario_id = $${params.length}`);
      }
      if (estado) {
        params.push(estado);
        condiciones.push(`estado = $${params.length}`);
      }
      const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
      const { rows } = await query(`SELECT * FROM pedido ${where} ORDER BY id DESC`, params);
      return rows.map(mapPedido);
    },
    pedido: (_, { id: tid }, ctx) => unoPropio('pedido', mapPedido, tid, ctx),
  },

  // ------------------------------------------------------------------
  // RELACIONES ANIDADAS
  // ------------------------------------------------------------------

  Rol: {
    usuarios: (rol) => findWhere('usuario', mapUsuario, 'rol_id', rol.id),
  },

  Usuario: {
    rol: (usuario) => findById('rol', mapRol, usuario.rolId),
    direcciones: (usuario) => findWhere('direccion', mapDireccion, 'usuario_id', usuario.id),
    carritos: (usuario) => findWhere('carrito', mapCarrito, 'usuario_id', usuario.id),
    pedidos: (usuario) => findWhere('pedido', mapPedido, 'usuario_id', usuario.id),
    favoritos: (usuario) => findWhere('favorito', mapFavorito, 'usuario_id', usuario.id),
    resenas: (usuario) => findWhere('resena', mapResena, 'usuario_id', usuario.id),
  },

  Marca: {
    productos: async (marca) => {
      const { rows } = await query('SELECT * FROM producto WHERE marca_id = $1 AND activo = TRUE ORDER BY id', [marca.id]);
      return rows.map(mapProducto);
    },
  },

  Categoria: {
    productos: async (categoria) => {
      const { rows } = await query('SELECT * FROM producto WHERE categoria_id = $1 AND activo = TRUE ORDER BY id', [
        categoria.id,
      ]);
      return rows.map(mapProducto);
    },
  },

  Producto: {
    categoria: (producto) => findById('categoria', mapCategoria, producto.categoriaId),
    marca: (producto) => findById('marca', mapMarca, producto.marcaId),
    // Solo variantes activas: las que se quitaron en el panel quedan desactivadas
    // (siguen existiendo para los pedidos anteriores que las usan).
    variantes: async (producto) => {
      const { rows } = await query(
        'SELECT * FROM variante_producto WHERE producto_id = $1 AND activo = TRUE ORDER BY id',
        [producto.id]
      );
      return rows.map(mapVariante);
    },
    imagenes: (producto) => findWhere('imagen_producto', mapImagen, 'producto_id', producto.id),
    favoritos: (producto) => findWhere('favorito', mapFavorito, 'producto_id', producto.id),
    resenas: (producto) => findWhere('resena', mapResena, 'producto_id', producto.id),
  },

  VarianteProducto: {
    producto: (variante) => findById('producto', mapProducto, variante.productoId),
    inventario: async (variante) => {
      const { rows } = await query('SELECT * FROM inventario WHERE variante_id = $1', [variante.id]);
      return rows[0] ? mapInventario(rows[0]) : null;
    },
  },

  ImagenProducto: {
    producto: (imagen) => findById('producto', mapProducto, imagen.productoId),
  },

  Inventario: {
    variante: (inventario) => findById('variante_producto', mapVariante, inventario.varianteId),
  },

  Carrito: {
    usuario: (carrito) => findById('usuario', mapUsuario, carrito.usuarioId),
    detalles: (carrito) => findWhere('detalle_carrito', mapDetalleCarrito, 'carrito_id', carrito.id),
  },

  DetalleCarrito: {
    carrito: (detalle) => findById('carrito', mapCarrito, detalle.carritoId),
    variante: (detalle) => findById('variante_producto', mapVariante, detalle.varianteId),
  },

  Direccion: {
    usuario: (direccion) => findById('usuario', mapUsuario, direccion.usuarioId),
  },

  Favorito: {
    usuario: (favorito) => findById('usuario', mapUsuario, favorito.usuarioId),
    producto: (favorito) => findById('producto', mapProducto, favorito.productoId),
  },

  Resena: {
    usuario: (resena) => findById('usuario', mapUsuario, resena.usuarioId),
    producto: (resena) => findById('producto', mapProducto, resena.productoId),
  },

  Pedido: {
    estadosSiguientes: (pedido) => estadosSiguientes(pedido.estado),
    usuario: (pedido) => findById('usuario', mapUsuario, pedido.usuarioId),
    direccion: (pedido) => findById('direccion', mapDireccion, pedido.direccionId),
    detalles: (pedido) => findWhere('detalle_pedido', mapDetallePedido, 'pedido_id', pedido.id),
  },

  DetallePedido: {
    pedido: (detalle) => findById('pedido', mapPedido, detalle.pedidoId),
    variante: (detalle) => findById('variante_producto', mapVariante, detalle.varianteId),
  },

  // ------------------------------------------------------------------
  // MUTATION
  // ------------------------------------------------------------------
  Mutation: {
    // --- Rol ---
    crearRol: async (_, { datos }) => {
      const { rows } = await query(
        'INSERT INTO rol (nombre, descripcion) VALUES ($1, $2) RETURNING *',
        [datos.nombre, datos.descripcion ?? null]
      );
      return mapRol(rows[0]);
    },
    actualizarRol: async (_, { id: tid, datos }) => {
      const { rows } = await query(
        'UPDATE rol SET nombre = $1, descripcion = $2 WHERE id = $3 RETURNING *',
        [datos.nombre, datos.descripcion ?? null, tid]
      );
      return rows[0] ? mapRol(rows[0]) : null;
    },
    eliminarRol: async (_, { id: tid }) => {
      const { rowCount } = await query('DELETE FROM rol WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- Autenticación (públicas: no requieren sesión) ---
    registrar: async (_, { datos }) => {
      const s = await authServicio.registrar(datos);
      return { accessToken: s.accessToken, refreshToken: s.refreshToken, usuario: mapUsuario(s.usuarioRow) };
    },
    iniciarSesion: async (_, { correo, password }) => {
      const s = await authServicio.iniciarSesion({ correo, password });
      return { accessToken: s.accessToken, refreshToken: s.refreshToken, usuario: mapUsuario(s.usuarioRow) };
    },
    refrescarToken: async (_, { refreshToken }) => {
      const s = await authServicio.refrescar(refreshToken);
      return { accessToken: s.accessToken, refreshToken: s.refreshToken, usuario: mapUsuario(s.usuarioRow) };
    },
    cerrarSesion: (_, { refreshToken }) => authServicio.cerrarSesion(refreshToken),

    // --- Usuario (solo admin; la contraseña siempre se guarda hasheada) ---
    crearUsuario: async (_, { datos }) => {
      authServicio.validarPassword(datos.password);
      const { rows } = await query(
        `INSERT INTO usuario (rol_id, nombre, correo, password, activo, fecha_registro)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [datos.rolId, datos.nombre, datos.correo.trim().toLowerCase(), await authServicio.hashearPassword(datos.password), datos.activo ?? true, hoy()]
      );
      return mapUsuario(rows[0]);
    },
    actualizarUsuario: async (_, { id: tid, datos }) => {
      authServicio.validarPassword(datos.password);
      const { rows } = await query(
        `UPDATE usuario SET rol_id = $1, nombre = $2, correo = $3, password = $4, activo = $5
         WHERE id = $6 RETURNING *`,
        [datos.rolId, datos.nombre, datos.correo.trim().toLowerCase(), await authServicio.hashearPassword(datos.password), datos.activo ?? true, tid]
      );
      return rows[0] ? mapUsuario(rows[0]) : null;
    },
    cambiarRolUsuario: async (_, { id: tid, rolId }, ctx) => {
      if (String(tid) === String(ctx.usuario.id)) throw datosInvalidos('No puedes cambiar tu propio rol.');
      const { rows } = await query('UPDATE usuario SET rol_id = $1 WHERE id = $2 RETURNING *', [rolId, tid]);
      return rows[0] ? mapUsuario(rows[0]) : null;
    },
    cambiarActivoUsuario: async (_, { id: tid, activo }, ctx) => {
      if (String(tid) === String(ctx.usuario.id)) throw datosInvalidos('No puedes desactivar tu propia cuenta.');
      const { rows } = await query('UPDATE usuario SET activo = $1 WHERE id = $2 RETURNING *', [activo, tid]);
      if (rows[0] && !activo) await authServicio.revocarSesionesDeUsuario(tid);
      return rows[0] ? mapUsuario(rows[0]) : null;
    },
    eliminarUsuario: async (_, { id: tid }, ctx) => {
      if (String(tid) === String(ctx.usuario.id)) throw datosInvalidos('No puedes eliminar tu propia cuenta.');
      const { rowCount } = await query('DELETE FROM usuario WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- Marca ---
    crearMarca: async (_, { datos }) => {
      const { rows } = await query(
        'INSERT INTO marca (nombre, descripcion, activo) VALUES ($1, $2, $3) RETURNING *',
        [datos.nombre, datos.descripcion ?? null, datos.activo ?? true]
      );
      return mapMarca(rows[0]);
    },
    actualizarMarca: async (_, { id: tid, datos }) => {
      const { rows } = await query(
        'UPDATE marca SET nombre = $1, descripcion = $2, activo = $3 WHERE id = $4 RETURNING *',
        [datos.nombre, datos.descripcion ?? null, datos.activo ?? true, tid]
      );
      return rows[0] ? mapMarca(rows[0]) : null;
    },
    eliminarMarca: async (_, { id: tid }) => {
      const { rowCount } = await query('DELETE FROM marca WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- Categoria ---
    crearCategoria: async (_, { datos }) => {
      const { rows } = await query(
        'INSERT INTO categoria (nombre, descripcion, activo) VALUES ($1, $2, $3) RETURNING *',
        [datos.nombre, datos.descripcion ?? null, datos.activo ?? true]
      );
      return mapCategoria(rows[0]);
    },
    actualizarCategoria: async (_, { id: tid, datos }) => {
      const { rows } = await query(
        'UPDATE categoria SET nombre = $1, descripcion = $2, activo = $3 WHERE id = $4 RETURNING *',
        [datos.nombre, datos.descripcion ?? null, datos.activo ?? true, tid]
      );
      return rows[0] ? mapCategoria(rows[0]) : null;
    },
    eliminarCategoria: async (_, { id: tid }) => {
      const { rowCount } = await query('DELETE FROM categoria WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- Producto ---
    guardarProducto: async (_, { id: tid, datos }) => {
      const limpio = validarProducto(datos);
      const productoId = await guardarProductoCompleto(tid ?? null, limpio);
      return findById('producto', mapProducto, productoId);
    },
    cambiarActivoProducto: async (_, { id: tid, activo }) => {
      const { rows } = await query('UPDATE producto SET activo = $1 WHERE id = $2 RETURNING *', [activo, tid]);
      return rows[0] ? mapProducto(rows[0]) : null;
    },
    crearProducto: async (_, { datos }) => {
      const { rows } = await query(
        `INSERT INTO producto (categoria_id, marca_id, nombre, descripcion, activo, fecha_registro)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [datos.categoriaId, datos.marcaId, datos.nombre, datos.descripcion ?? null, datos.activo ?? true, hoy()]
      );
      return mapProducto(rows[0]);
    },
    actualizarProducto: async (_, { id: tid, datos }) => {
      const { rows } = await query(
        `UPDATE producto SET categoria_id = $1, marca_id = $2, nombre = $3, descripcion = $4, activo = $5
         WHERE id = $6 RETURNING *`,
        [datos.categoriaId, datos.marcaId, datos.nombre, datos.descripcion ?? null, datos.activo ?? true, tid]
      );
      return rows[0] ? mapProducto(rows[0]) : null;
    },
    eliminarProducto: async (_, { id: tid }) => {
      const { rowCount } = await query('DELETE FROM producto WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- VarianteProducto ---
    crearVarianteProducto: async (_, { datos }) => {
      const { rows } = await query(
        `INSERT INTO variante_producto (producto_id, tono, codigo_hex, presentacion, precio, sku, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [datos.productoId, datos.tono ?? null, datos.codigoHex ?? null, datos.presentacion ?? null, datos.precio, datos.sku, datos.activo ?? true]
      );
      return mapVariante(rows[0]);
    },
    actualizarVarianteProducto: async (_, { id: tid, datos }) => {
      const { rows } = await query(
        `UPDATE variante_producto SET producto_id = $1, tono = $2, codigo_hex = $3, presentacion = $4,
         precio = $5, sku = $6, activo = $7 WHERE id = $8 RETURNING *`,
        [datos.productoId, datos.tono ?? null, datos.codigoHex ?? null, datos.presentacion ?? null, datos.precio, datos.sku, datos.activo ?? true, tid]
      );
      return rows[0] ? mapVariante(rows[0]) : null;
    },
    eliminarVarianteProducto: async (_, { id: tid }) => {
      const { rowCount } = await query('DELETE FROM variante_producto WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- ImagenProducto ---
    crearImagenProducto: async (_, { datos }) => {
      const { rows } = await query(
        'INSERT INTO imagen_producto (producto_id, url_imagen, principal) VALUES ($1, $2, $3) RETURNING *',
        [datos.productoId, datos.urlImagen, datos.principal ?? false]
      );
      return mapImagen(rows[0]);
    },
    actualizarImagenProducto: async (_, { id: tid, datos }) => {
      const { rows } = await query(
        'UPDATE imagen_producto SET producto_id = $1, url_imagen = $2, principal = $3 WHERE id = $4 RETURNING *',
        [datos.productoId, datos.urlImagen, datos.principal ?? false, tid]
      );
      return rows[0] ? mapImagen(rows[0]) : null;
    },
    eliminarImagenProducto: async (_, { id: tid }) => {
      const { rowCount } = await query('DELETE FROM imagen_producto WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- Inventario ---
    crearInventario: async (_, { datos }) => {
      const { rows } = await query(
        'INSERT INTO inventario (variante_id, cantidad, fecha_actualizacion) VALUES ($1, $2, $3) RETURNING *',
        [datos.varianteId, datos.cantidad, hoy()]
      );
      return mapInventario(rows[0]);
    },
    actualizarInventario: async (_, { id: tid, cantidad }) => {
      if (!Number.isInteger(cantidad) || cantidad < 0) throw datosInvalidos('La cantidad no puede ser negativa.');
      const { rows } = await query(
        'UPDATE inventario SET cantidad = $1, fecha_actualizacion = $2 WHERE id = $3 RETURNING *',
        [cantidad, hoy(), tid]
      );
      return rows[0] ? mapInventario(rows[0]) : null;
    },
    eliminarInventario: async (_, { id: tid }) => {
      const { rowCount } = await query('DELETE FROM inventario WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- Carrito ---
    crearCarrito: async (_, { datos }, ctx) => {
      const { rows } = await query(
        'INSERT INTO carrito (usuario_id, estado, fecha_creacion) VALUES ($1, $2, $3) RETURNING *',
        [usuarioObjetivo(ctx, datos.usuarioId), datos.estado ?? 'ACTIVO', hoy()]
      );
      return mapCarrito(rows[0]);
    },
    actualizarCarrito: async (_, { id: tid, estado }, ctx) => {
      await asegurarCarritoPropio(ctx, tid);
      const { rows } = await query('UPDATE carrito SET estado = $1 WHERE id = $2 RETURNING *', [estado, tid]);
      return rows[0] ? mapCarrito(rows[0]) : null;
    },
    eliminarCarrito: async (_, { id: tid }, ctx) => {
      await asegurarCarritoPropio(ctx, tid);
      const { rowCount } = await query('DELETE FROM carrito WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- DetalleCarrito ---
    // Si no se manda precioUnitario, se toma el precio vigente de la variante
    // (asi el carrito siempre refleja lo que costaba el producto al agregarlo).
    crearDetalleCarrito: async (_, { datos }, ctx) => {
      await asegurarCarritoPropio(ctx, datos.carritoId);
      if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1) throw datosInvalidos('Cantidad inválida.');
      let precioUnitario = datos.precioUnitario;
      if (precioUnitario == null) {
        const variante = await findById('variante_producto', mapVariante, datos.varianteId);
        precioUnitario = variante?.precio ?? 0;
      }
      const { rows } = await query(
        'INSERT INTO detalle_carrito (carrito_id, variante_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4) RETURNING *',
        [datos.carritoId, datos.varianteId, datos.cantidad, precioUnitario]
      );
      return mapDetalleCarrito(rows[0]);
    },
    actualizarDetalleCarrito: async (_, { id: tid, cantidad }, ctx) => {
      const det = await findById('detalle_carrito', mapDetalleCarrito, tid);
      if (!det) throw datosInvalidos('El registro no existe.');
      await asegurarCarritoPropio(ctx, det.carritoId);
      const { rows } = await query(
        'UPDATE detalle_carrito SET cantidad = $1 WHERE id = $2 RETURNING *',
        [cantidad, tid]
      );
      return rows[0] ? mapDetalleCarrito(rows[0]) : null;
    },
    eliminarDetalleCarrito: async (_, { id: tid }, ctx) => {
      const det = await findById('detalle_carrito', mapDetalleCarrito, tid);
      if (!det) throw datosInvalidos('El registro no existe.');
      await asegurarCarritoPropio(ctx, det.carritoId);
      const { rowCount } = await query('DELETE FROM detalle_carrito WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- Direccion ---
    crearDireccion: async (_, { datos }, ctx) => {
      const d = validarDireccion(datos);
      const { rows } = await query(
        `INSERT INTO direccion (usuario_id, calle, numero, colonia, ciudad, estado, codigo_postal, referencias, latitud, longitud)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          usuarioObjetivo(ctx, datos.usuarioId), d.calle, d.numero, d.colonia, d.ciudad,
          d.estado, d.codigoPostal, d.referencias, d.latitud, d.longitud,
        ]
      );
      return mapDireccion(rows[0]);
    },
    actualizarDireccion: async (_, { id: tid, datos }, ctx) => {
      await asegurarPropio(ctx, 'direccion', tid);
      const d = validarDireccion(datos);
      const { rows } = await query(
        `UPDATE direccion SET usuario_id = $1, calle = $2, numero = $3, colonia = $4, ciudad = $5,
         estado = $6, codigo_postal = $7, referencias = $8, latitud = $9, longitud = $10 WHERE id = $11 RETURNING *`,
        [
          usuarioObjetivo(ctx, datos.usuarioId), d.calle, d.numero, d.colonia, d.ciudad,
          d.estado, d.codigoPostal, d.referencias, d.latitud, d.longitud, tid,
        ]
      );
      return rows[0] ? mapDireccion(rows[0]) : null;
    },
    eliminarDireccion: async (_, { id: tid }, ctx) => {
      await asegurarPropio(ctx, 'direccion', tid);
      const { rowCount } = await query('DELETE FROM direccion WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- Favorito ---
    crearFavorito: async (_, { datos }, ctx) => {
      const { rows } = await query(
        'INSERT INTO favorito (usuario_id, producto_id, fecha_agregado) VALUES ($1, $2, $3) RETURNING *',
        [usuarioObjetivo(ctx, datos.usuarioId), datos.productoId, hoy()]
      );
      return mapFavorito(rows[0]);
    },
    eliminarFavorito: async (_, { id: tid }, ctx) => {
      await asegurarPropio(ctx, 'favorito', tid);
      const { rowCount } = await query('DELETE FROM favorito WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- Resena ---
    crearResena: async (_, { datos }, ctx) => {
      const { rows } = await query(
        `INSERT INTO resena (usuario_id, producto_id, calificacion, comentario, compra_verificada, fecha)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [usuarioObjetivo(ctx, datos.usuarioId), datos.productoId, datos.calificacion, datos.comentario ?? null, false, hoy()]
      );
      return mapResena(rows[0]);
    },
    actualizarResena: async (_, { id: tid, datos }, ctx) => {
      await asegurarPropio(ctx, 'resena', tid);
      const { rows } = await query(
        `UPDATE resena SET usuario_id = $1, producto_id = $2, calificacion = $3, comentario = $4,
         compra_verificada = $5 WHERE id = $6 RETURNING *`,
        [usuarioObjetivo(ctx, datos.usuarioId), datos.productoId, datos.calificacion, datos.comentario ?? null, datos.compraVerificada ?? false, tid]
      );
      return rows[0] ? mapResena(rows[0]) : null;
    },
    eliminarResena: async (_, { id: tid }, ctx) => {
      await asegurarPropio(ctx, 'resena', tid);
      const { rowCount } = await query('DELETE FROM resena WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- Pedido: mutation de negocio ---
    // No solo guarda lo que le mandan: por cada variante recibida busca su
    // precio vigente, arma las lineas DetallePedido y calcula subtotal/total
    // del pedido a partir de esas lineas. Corre dentro de una transacción
    // para que el pedido y todas sus lineas se guarden juntos o no se
    // guarde nada.
    crearPedido: async (_, { datos }, ctx) => {
      const { direccionId, detalles } = datos;
      const usuarioId = usuarioObjetivo(ctx, datos.usuarioId);
      if (!detalles.length) throw datosInvalidos('El pedido no tiene productos.');
      // La dirección de envío debe pertenecer al usuario dueño del pedido.
      const dirDueño = await dueñoDe('direccion', direccionId);
      if (dirDueño === null || String(dirDueño) !== String(usuarioId)) {
        throw datosInvalidos('La dirección de envío no es válida.');
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const lineas = [];
        for (const linea of detalles) {
          if (!Number.isInteger(linea.cantidad) || linea.cantidad < 1) {
            throw datosInvalidos('La cantidad de cada producto debe ser un entero mayor a 0.');
          }
          const { rows } = await client.query(
            `SELECT v.precio FROM variante_producto v JOIN producto p ON p.id = v.producto_id
             WHERE v.id = $1 AND v.activo = TRUE AND p.activo = TRUE`,
            [linea.varianteId]
          );
          if (!rows[0]) throw datosInvalidos('Uno de los productos ya no está disponible.');
          // Descuenta el stock; si no alcanza, el UPDATE no afecta filas y se aborta todo el pedido.
          const stock = await client.query(
            `UPDATE inventario SET cantidad = cantidad - $1, fecha_actualizacion = CURRENT_DATE
             WHERE variante_id = $2 AND cantidad >= $1`,
            [linea.cantidad, linea.varianteId]
          );
          if (stock.rowCount === 0) throw datosInvalidos('No hay existencias suficientes de uno de los productos.');
          const precioUnitario = Number(rows[0].precio);
          const subtotal = precioUnitario * linea.cantidad;
          lineas.push({ varianteId: linea.varianteId, cantidad: linea.cantidad, precioUnitario, subtotal });
        }
        const subtotalPedido = lineas.reduce((acc, l) => acc + l.subtotal, 0);
        // No se modelan impuestos ni envio en esta practica: total = subtotal.
        const totalPedido = subtotalPedido;

        const pedidoResult = await client.query(
          `INSERT INTO pedido (usuario_id, direccion_id, fecha, subtotal, total, estado, transaccion_pago_id)
           VALUES ($1, $2, $3, $4, $5, 'PENDIENTE', NULL) RETURNING *`,
          [usuarioId, direccionId, hoy(), subtotalPedido, totalPedido]
        );
        const nuevoPedido = pedidoResult.rows[0];

        for (const linea of lineas) {
          await client.query(
            `INSERT INTO detalle_pedido (pedido_id, variante_id, cantidad, precio_unitario, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [nuevoPedido.id, linea.varianteId, linea.cantidad, linea.precioUnitario, linea.subtotal]
          );
        }

        await client.query('COMMIT');
        return mapPedido(nuevoPedido);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
    // El cliente puede cancelar SU pedido mientras siga PENDIENTE.
    cancelarPedido: async (_, { id: tid }, ctx) => {
      const pedido = await findById('pedido', mapPedido, tid);
      if (!pedido) throw datosInvalidos('El pedido no existe.');
      asegurarPropietario(ctx, pedido.usuarioId);
      if (pedido.estado !== 'PENDIENTE') throw datosInvalidos('Solo se pueden cancelar pedidos pendientes.');
      return cambiarEstadoPedido(tid, 'CANCELADO');
    },
    actualizarPedido: (_, { id: tid, estado }) => cambiarEstadoPedido(tid, estado),
    eliminarPedido: async (_, { id: tid }) => {
      const { rowCount } = await query('DELETE FROM pedido WHERE id = $1', [tid]);
      return rowCount > 0;
    },

    // --- DetallePedido ---
    crearDetallePedido: async (_, { datos }) => {
      let precioUnitario = datos.precioUnitario;
      if (precioUnitario == null) {
        const variante = await findById('variante_producto', mapVariante, datos.varianteId);
        precioUnitario = variante?.precio ?? 0;
      }
      const subtotal = precioUnitario * datos.cantidad;
      const { rows } = await query(
        `INSERT INTO detalle_pedido (pedido_id, variante_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [datos.pedidoId, datos.varianteId, datos.cantidad, precioUnitario, subtotal]
      );
      return mapDetallePedido(rows[0]);
    },
    actualizarDetallePedido: async (_, { id: tid, cantidad }) => {
      const actual = await findById('detalle_pedido', mapDetallePedido, tid);
      if (!actual) return null;
      const subtotal = actual.precioUnitario * cantidad;
      const { rows } = await query(
        'UPDATE detalle_pedido SET cantidad = $1, subtotal = $2 WHERE id = $3 RETURNING *',
        [cantidad, subtotal, tid]
      );
      return rows[0] ? mapDetallePedido(rows[0]) : null;
    },
    eliminarDetallePedido: async (_, { id: tid }) => {
      const { rowCount } = await query('DELETE FROM detalle_pedido WHERE id = $1', [tid]);
      return rowCount > 0;
    },
  },
});