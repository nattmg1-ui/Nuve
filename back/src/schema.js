// src/schema.js
// Schema traducido directamente del DER del e-commerce de maquillaje.
// 15 entidades, 2 enums, un input por entidad, y CRUD completo en Mutation.

export const typeDefs = `#graphql

  # ------------------------------------------------------------------
  # ENUMS
  # ------------------------------------------------------------------

  """Status posible de un pedido."""
  enum StatusPedido {
    PENDIENTE
    PAGADO
    ENVIADO
    ENTREGADO
    CANCELADO
  }

  """Servicio con el que se pagó un pedido."""
  enum MetodoPago {
    MERCADO_PAGO
    PAYPAL
  }

  """Resultado de un pago al regresar de Mercado Pago o PayPal."""
  enum ResultadoPago {
    APROBADO
    PENDIENTE
    RECHAZADO
  }

  """Estado de un carrito de compras."""
  enum EstadoCarrito {
    ACTIVO
    COMPLETADO
    ABANDONADO
  }

  # ------------------------------------------------------------------
  # TYPES (entidades del DER)
  # ------------------------------------------------------------------

  """Rol del usuario dentro del sistema (CLIENTE, ADMIN, etc)."""
  type Rol {
    id: ID!
    nombre: String!
    descripcion: String
    usuarios: [Usuario!]!
  }

  """Usuario que puede autenticarse, comprar y opinar."""
  type Usuario {
    id: ID!
    rol: Rol!
    nombre: String!
    correo: String!
    activo: Boolean!
    fechaRegistro: String!
    direcciones: [Direccion!]!
    carritos: [Carrito!]!
    pedidos: [Pedido!]!
    favoritos: [Favorito!]!
    resenas: [Resena!]!
  }

  """Respuesta de registro, login y refresh: par de tokens + el usuario."""
  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    usuario: Usuario!
  }

  """Marca a la que pertenece uno o varios productos."""
  type Marca {
    id: ID!
    nombre: String!
    descripcion: String
    activo: Boolean!
    productos: [Producto!]!
  }

  """Categoria que clasifica uno o varios productos."""
  type Categoria {
    id: ID!
    nombre: String!
    descripcion: String
    activo: Boolean!
    productos: [Producto!]!
  }

  """Producto del catalogo (no vendible directamente: se vende por variante)."""
  type Producto {
    id: ID!
    categoria: Categoria!
    marca: Marca!
    nombre: String!
    descripcion: String
    activo: Boolean!
    fechaRegistro: String!
    variantes: [VarianteProducto!]!
    imagenes: [ImagenProducto!]!
    favoritos: [Favorito!]!
    resenas: [Resena!]!
  }

  """Presentacion vendible de un producto (tono, tamano, precio, sku)."""
  type VarianteProducto {
    id: ID!
    producto: Producto!
    tono: String
    codigoHex: String
    presentacion: String
    precio: Float!
    sku: String!
    activo: Boolean!
    inventario: Inventario
  }

  """Imagen asociada a un producto."""
  type ImagenProducto {
    id: ID!
    producto: Producto!
    urlImagen: String!
    principal: Boolean!
  }

  """Existencias disponibles de una variante de producto."""
  type Inventario {
    id: ID!
    variante: VarianteProducto!
    cantidad: Int!
    fechaActualizacion: String!
  }

  """Carrito de compras de un usuario."""
  type Carrito {
    id: ID!
    usuario: Usuario!
    estado: EstadoCarrito!
    fechaCreacion: String!
    detalles: [DetalleCarrito!]!
  }

  """Linea de un carrito: una variante con su cantidad y precio al momento de agregarla."""
  type DetalleCarrito {
    id: ID!
    carrito: Carrito!
    variante: VarianteProducto!
    cantidad: Int!
    precioUnitario: Float!
  }

  """Direccion de envio registrada por un usuario."""
  type Direccion {
    id: ID!
    usuario: Usuario!
    calle: String!
    numero: String
    colonia: String
    ciudad: String!
    estado: String!
    codigoPostal: String
    referencias: String
    latitud: Float
    longitud: Float
  }

  """Producto marcado como favorito por un usuario."""
  type Favorito {
    id: ID!
    usuario: Usuario!
    producto: Producto!
    fechaAgregado: String!
  }

  """Resena que un usuario escribe sobre un producto."""
  type Resena {
    id: ID!
    usuario: Usuario!
    producto: Producto!
    calificacion: Int!
    comentario: String
    compraVerificada: Boolean!
    fecha: String!
  }

  """Pedido realizado por un usuario, enviado a una direccion."""
  type Pedido {
    id: ID!
    usuario: Usuario!
    direccion: Direccion!
    """Fecha y hora del pedido en hora de la Ciudad de México (AAAA-MM-DD HH:MM)."""
    fecha: String!
    subtotal: Float!
    total: Float!
    estado: StatusPedido!
    """Estados a los que puede pasar desde el actual (vacío si ya es final)."""
    estadosSiguientes: [StatusPedido!]!
    transaccionPagoId: String
    """Con qué se pagó (vacío si aún no se paga)."""
    metodoPago: MetodoPago
    """Fecha y hora del pago en hora de la Ciudad de México (AAAA-MM-DD HH:MM)."""
    fechaPago: String
    detalles: [DetallePedido!]!
  }

  """Linea de un pedido: una variante con la cantidad y precio pactados."""
  type DetallePedido {
    id: ID!
    pedido: Pedido!
    variante: VarianteProducto!
    cantidad: Int!
    precioUnitario: Float!
    subtotal: Float!
  }

  # ------------------------------------------------------------------
  # INPUTS (uno por entidad, se usan para crear y para actualizar)
  # ------------------------------------------------------------------

  input RolInput {
    nombre: String!
    descripcion: String
  }

  input RegistroInput {
    nombre: String!
    correo: String!
    password: String!
  }

  input UsuarioInput {
    rolId: ID!
    nombre: String!
    correo: String!
    password: String!
    activo: Boolean
  }

  input MarcaInput {
    nombre: String!
    descripcion: String
    activo: Boolean
  }

  input CategoriaInput {
    nombre: String!
    descripcion: String
    activo: Boolean
  }

  """Variante dentro del formulario de producto. Sin id = variante nueva."""
  input VarianteCompletaInput {
    id: ID
    tono: String
    codigoHex: String
    presentacion: String
    precio: Float!
    sku: String!
    existencias: Int!
  }

  input ImagenCompletaInput {
    urlImagen: String!
    principal: Boolean
  }

  """Producto completo: datos, variantes con existencias e imágenes, en una sola operación."""
  input ProductoCompletoInput {
    nombre: String!
    descripcion: String
    categoriaId: ID!
    marcaId: ID!
    variantes: [VarianteCompletaInput!]!
    imagenes: [ImagenCompletaInput!]!
  }

  input ProductoInput {
    categoriaId: ID!
    marcaId: ID!
    nombre: String!
    descripcion: String
    activo: Boolean
  }

  input VarianteProductoInput {
    productoId: ID!
    tono: String
    codigoHex: String
    presentacion: String
    precio: Float!
    sku: String!
    activo: Boolean
  }

  input ImagenProductoInput {
    productoId: ID!
    urlImagen: String!
    principal: Boolean
  }

  input InventarioInput {
    varianteId: ID!
    cantidad: Int!
  }

  input CarritoInput {
    usuarioId: ID
    estado: EstadoCarrito
  }

  input DetalleCarritoInput {
    carritoId: ID!
    varianteId: ID!
    cantidad: Int!
    precioUnitario: Float
  }

  input DireccionInput {
    usuarioId: ID
    calle: String!
    numero: String
    colonia: String
    ciudad: String!
    estado: String!
    codigoPostal: String
    referencias: String
    latitud: Float
    longitud: Float
  }

  input FavoritoInput {
    usuarioId: ID
    productoId: ID!
  }

  input ResenaInput {
    usuarioId: ID
    productoId: ID!
    calificacion: Int!
    comentario: String
    compraVerificada: Boolean
  }

  """Una linea del pedido que se esta creando: solo se indica que variante y cuanta cantidad."""
  input PedidoDetalleInput {
    varianteId: ID!
    cantidad: Int!
  }

  input PedidoInput {
    usuarioId: ID
    direccionId: ID!
    detalles: [PedidoDetalleInput!]!
  }

  input DetallePedidoInput {
    pedidoId: ID!
    varianteId: ID!
    cantidad: Int!
    precioUnitario: Float
  }

  # ------------------------------------------------------------------
  # PAGOS (Mercado Pago y PayPal, por redirección)
  # ------------------------------------------------------------------

  """Link de la página de Mercado Pago o PayPal a donde se manda al cliente a pagar."""
  type InicioPago {
    url: String!
  }

  type ConfirmacionPago {
    resultado: ResultadoPago!
    pedido: Pedido
    mensaje: String!
  }

  # ------------------------------------------------------------------
  # REPORTES (resumen de ventas del panel de administración)
  # ------------------------------------------------------------------

  enum PeriodoVentas {
    """Hoy, por hora"""
    DIA
    """Últimos 7 días, por día"""
    SEMANA
    """Últimos 30 días, por día"""
    MES
  }

  type PuntoVenta {
    etiqueta: String!
    total: Float!
    pedidos: Int!
  }

  type ProductoVendido {
    productoId: ID!
    nombre: String!
    piezas: Int!
    ingresos: Float!
  }

  """Indicadores del panel. Solo cuentan pedidos PAGADO, ENVIADO y ENTREGADO."""
  type ResumenVentas {
    periodo: PeriodoVentas!
    ventasTotales: Float!
    numPedidos: Int!
    ticketPromedio: Float!
    piezasVendidas: Int!
    ventasPeriodoAnterior: Float!
    """Cambio contra el periodo anterior de la misma duración; null si antes no hubo ventas."""
    cambioPorcentual: Float
    pedidosPendientes: Int!
    pedidosPorEnviar: Int!
    serie: [PuntoVenta!]!
    masVendidos: [ProductoVendido!]!
  }

  # ------------------------------------------------------------------
  # QUERY (lista + por id de las entidades principales; las tablas de
  # detalle/union -DetalleCarrito, DetallePedido, Inventario- solo se
  # consultan anidadas desde su entidad dueña)
  # ------------------------------------------------------------------

  type Query {
    yo: Usuario

    """Resumen de ventas del panel (solo ADMIN)."""
    resumenVentas(periodo: PeriodoVentas!): ResumenVentas!

    roles: [Rol!]!
    rol(id: ID!): Rol

    usuarios: [Usuario!]!
    usuario(id: ID!): Usuario

    marcas: [Marca!]!
    marca(id: ID!): Marca

    categorias: [Categoria!]!
    categoria(id: ID!): Categoria

    """Catálogo. Los productos desactivados solo los ve el personal si pide incluirInactivos."""
    productos(limite: Int, desde: Int, incluirInactivos: Boolean): [Producto!]!
    producto(id: ID!): Producto

    variantesProducto: [VarianteProducto!]!
    varianteProducto(id: ID!): VarianteProducto

    imagenesProducto: [ImagenProducto!]!
    imagenProducto(id: ID!): ImagenProducto

    carritos: [Carrito!]!
    carrito(id: ID!): Carrito

    direcciones: [Direccion!]!
    direccion(id: ID!): Direccion

    favoritos: [Favorito!]!
    favorito(id: ID!): Favorito

    resenas: [Resena!]!
    resena(id: ID!): Resena

    pedidos(estado: StatusPedido): [Pedido!]!
    pedido(id: ID!): Pedido
  }

  # ------------------------------------------------------------------
  # MUTATION (CRUD completo de las 15 entidades + mutation de negocio
  # crearPedido, que calcula subtotal/total en vez de solo guardar datos)
  # ------------------------------------------------------------------

  type Mutation {
    # --- Rol ---
    crearRol(datos: RolInput!): Rol!
    actualizarRol(id: ID!, datos: RolInput!): Rol
    eliminarRol(id: ID!): Boolean!

    # --- Autenticación ---
    registrar(datos: RegistroInput!): AuthPayload!
    iniciarSesion(correo: String!, password: String!): AuthPayload!
    refrescarToken(refreshToken: String!): AuthPayload!
    cerrarSesion(refreshToken: String!): Boolean!

    # --- Usuario ---
    cambiarRolUsuario(id: ID!, rolId: ID!): Usuario
    cambiarActivoUsuario(id: ID!, activo: Boolean!): Usuario
    crearUsuario(datos: UsuarioInput!): Usuario!
    actualizarUsuario(id: ID!, datos: UsuarioInput!): Usuario
    eliminarUsuario(id: ID!): Boolean!

    # --- Marca ---
    crearMarca(datos: MarcaInput!): Marca!
    actualizarMarca(id: ID!, datos: MarcaInput!): Marca
    eliminarMarca(id: ID!): Boolean!

    # --- Categoria ---
    crearCategoria(datos: CategoriaInput!): Categoria!
    actualizarCategoria(id: ID!, datos: CategoriaInput!): Categoria
    eliminarCategoria(id: ID!): Boolean!

    # --- Producto ---
    """Crea (sin id) o actualiza (con id) un producto completo en una transacción."""
    guardarProducto(id: ID, datos: ProductoCompletoInput!): Producto!
    """Desactiva o reactiva un producto. Desactivado deja de verse en la tienda."""
    cambiarActivoProducto(id: ID!, activo: Boolean!): Producto
    crearProducto(datos: ProductoInput!): Producto!
    actualizarProducto(id: ID!, datos: ProductoInput!): Producto
    eliminarProducto(id: ID!): Boolean!

    # --- VarianteProducto ---
    crearVarianteProducto(datos: VarianteProductoInput!): VarianteProducto!
    actualizarVarianteProducto(id: ID!, datos: VarianteProductoInput!): VarianteProducto
    eliminarVarianteProducto(id: ID!): Boolean!

    # --- ImagenProducto ---
    crearImagenProducto(datos: ImagenProductoInput!): ImagenProducto!
    actualizarImagenProducto(id: ID!, datos: ImagenProductoInput!): ImagenProducto
    eliminarImagenProducto(id: ID!): Boolean!

    # --- Inventario ---
    crearInventario(datos: InventarioInput!): Inventario!
    actualizarInventario(id: ID!, cantidad: Int!): Inventario
    eliminarInventario(id: ID!): Boolean!

    # --- Carrito ---
    crearCarrito(datos: CarritoInput!): Carrito!
    actualizarCarrito(id: ID!, estado: EstadoCarrito!): Carrito
    eliminarCarrito(id: ID!): Boolean!

    # --- DetalleCarrito ---
    crearDetalleCarrito(datos: DetalleCarritoInput!): DetalleCarrito!
    actualizarDetalleCarrito(id: ID!, cantidad: Int!): DetalleCarrito
    eliminarDetalleCarrito(id: ID!): Boolean!

    # --- Direccion ---
    crearDireccion(datos: DireccionInput!): Direccion!
    actualizarDireccion(id: ID!, datos: DireccionInput!): Direccion
    eliminarDireccion(id: ID!): Boolean!

    # --- Favorito (solo agregar / quitar: no tiene campos editables) ---
    crearFavorito(datos: FavoritoInput!): Favorito!
    eliminarFavorito(id: ID!): Boolean!

    # --- Resena ---
    crearResena(datos: ResenaInput!): Resena!
    actualizarResena(id: ID!, datos: ResenaInput!): Resena
    eliminarResena(id: ID!): Boolean!

    # --- Pedido: mutation de negocio ---
    # crearPedido NO solo guarda datos: recibe una lista de variantes+cantidad,
    # busca el precio vigente de cada variante, crea las lineas DetallePedido
    # y calcula subtotal y total del pedido.
    crearPedido(datos: PedidoInput!): Pedido!
    cancelarPedido(id: ID!): Pedido

    actualizarPedido(id: ID!, estado: StatusPedido!): Pedido
    eliminarPedido(id: ID!): Boolean!

    # --- Pagos: el monto siempre es el total del pedido guardado en la base ---
    """Crea el cobro en Mercado Pago o PayPal y devuelve el link para pagar."""
    iniciarPago(pedidoId: ID!, metodo: MetodoPago!): InicioPago!
    """Al regresar de Mercado Pago: consulta el pago y, si se aprobó, marca el pedido como PAGADO."""
    confirmarPagoMercadoPago(pagoId: String!): ConfirmacionPago!
    """Al regresar de PayPal: cobra la orden aprobada y, si se completó, marca el pedido como PAGADO."""
    confirmarPagoPaypal(ordenId: String!): ConfirmacionPago!

    # --- DetallePedido ---
    crearDetallePedido(datos: DetallePedidoInput!): DetallePedido!
    actualizarDetallePedido(id: ID!, cantidad: Int!): DetallePedido
    eliminarDetallePedido(id: ID!): Boolean!
  }
`;