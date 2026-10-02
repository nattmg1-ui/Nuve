// src/data/mock.js
// Datos en memoria que simulan la base de datos del e-commerce de maquillaje.
// Cada tabla del DER es un arreglo de objetos planos; las relaciones se
// guardan como <entidad>Id (igual que en el DER, ej. id_categoria FK).

export const roles = [
  { id: '1', nombre: 'CLIENTE', descripcion: 'Usuario que compra en la tienda' },
  { id: '2', nombre: 'ADMIN', descripcion: 'Usuario que administra el catalogo' },
];

export const usuarios = [
  { id: '1', rolId: '1', nombre: 'Valeria Gomez', correo: 'valeria@example.com', password: 'hash1', activo: true, fechaRegistro: '2026-07-01' },
  { id: '2', rolId: '2', nombre: 'Admin Root', correo: 'admin@example.com', password: 'hash2', activo: true, fechaRegistro: '2026-06-01' },
  { id: '3', rolId: '1', nombre: 'Karla Ruiz', correo: 'karla@example.com', password: 'hash3', activo: true, fechaRegistro: '2026-08-10' },
];

export const marcas = [
  { id: '1', nombre: 'Maybelline New York', descripcion: 'Marca global de maquillaje accesible, fuerte en labiales y color', activo: true },
  { id: '2', nombre: "L'Oreal Paris", descripcion: 'Marca francesa de maquillaje y cuidado facial', activo: true },
  { id: '3', nombre: 'MAC Cosmetics', descripcion: 'Marca profesional de alta pigmentacion', activo: true },
  { id: '4', nombre: 'Fenty Beauty', descripcion: 'Marca inclusiva conocida por bases e iluminadores', activo: true },
];

export const categorias = [
  { id: '1', nombre: 'Labiales', descripcion: 'Labiales en distintos acabados', activo: true },
  { id: '2', nombre: 'Bases', descripcion: 'Bases de maquillaje liquidas y en polvo', activo: true },
  { id: '3', nombre: 'Rubor', descripcion: 'Rubores en polvo y crema', activo: true },
  { id: '4', nombre: 'Delineadores', descripcion: 'Delineadores liquidos y en lapiz', activo: true },
  { id: '5', nombre: 'Sombras', descripcion: 'Sombras individuales y paletas', activo: true },
  { id: '6', nombre: 'Iluminador', descripcion: 'Iluminadores en barra y polvo', activo: true },
];

export const productos = [
  { id: '1', categoriaId: '1', marcaId: '1', nombre: 'Labial Mate Pasion', descripcion: 'Labial mate de larga duracion', activo: true, fechaRegistro: '2026-07-05' },
  { id: '2', categoriaId: '2', marcaId: '2', nombre: 'Base Liquida Natural', descripcion: 'Base de cobertura media, acabado natural', activo: true, fechaRegistro: '2026-07-10' },
  { id: '3', categoriaId: '3', marcaId: '1', nombre: 'Rubor en Polvo Durazno', descripcion: 'Rubor compacto tono durazno', activo: true, fechaRegistro: '2026-07-15' },
  { id: '4', categoriaId: '1', marcaId: '3', nombre: 'Labial Liquido Velvet', descripcion: 'Labial liquido de acabado aterciopelado', activo: true, fechaRegistro: '2026-07-18' },
  { id: '5', categoriaId: '4', marcaId: '3', nombre: 'Delineador de Ojos Preciso', descripcion: 'Delineador en lapiz de trazo fino', activo: true, fechaRegistro: '2026-07-20' },
  { id: '6', categoriaId: '2', marcaId: '4', nombre: 'Base en Polvo Compacta', descripcion: 'Base compacta de cobertura alta', activo: true, fechaRegistro: '2026-07-22' },
  { id: '7', categoriaId: '5', marcaId: '2', nombre: 'Paleta de Sombras Nude', descripcion: 'Paleta de 12 tonos tierra', activo: true, fechaRegistro: '2026-07-25' },
  { id: '8', categoriaId: '6', marcaId: '4', nombre: 'Iluminador en Barra', descripcion: 'Iluminador cremoso de facil aplicacion', activo: true, fechaRegistro: '2026-07-28' },
  { id: '9', categoriaId: '1', marcaId: '1', nombre: 'Labial Mate Coral', descripcion: 'Labial mate tono coral vibrante', activo: true, fechaRegistro: '2026-08-01' },
  { id: '10', categoriaId: '3', marcaId: '2', nombre: 'Rubor en Crema Rosa', descripcion: 'Rubor en crema de acabado luminoso', activo: true, fechaRegistro: '2026-08-03' },
  { id: '11', categoriaId: '4', marcaId: '1', nombre: 'Delineador Liquido Waterproof', descripcion: 'Delineador liquido resistente al agua', activo: true, fechaRegistro: '2026-08-05' },
  { id: '12', categoriaId: '5', marcaId: '3', nombre: 'Sombra Individual Bronce', descripcion: 'Sombra individual efecto metalico', activo: true, fechaRegistro: '2026-08-07' },
];

export const variantesProducto = [
  // Producto 1 - Labial Mate Pasion
  { id: '1', productoId: '1', tono: 'Rojo Pasion', codigoHex: '#C0392B', presentacion: '3.5g', precio: 189.0, sku: 'LAB-ROJ-001', activo: true },
  { id: '2', productoId: '1', tono: 'Rojo Vino', codigoHex: '#7B241C', presentacion: '3.5g', precio: 189.0, sku: 'LAB-VIN-001', activo: true },
  { id: '5', productoId: '1', tono: 'Rosa Nude', codigoHex: '#D8A7A0', presentacion: '3.5g', precio: 179.0, sku: 'LAB-NUD-001', activo: true },

  // Producto 2 - Base Liquida Natural
  { id: '3', productoId: '2', tono: 'Beige Claro', codigoHex: '#E8C39E', presentacion: '30ml', precio: 259.0, sku: 'BAS-BEI-001', activo: true },
  { id: '6', productoId: '2', tono: 'Beige Medio', codigoHex: '#D9A876', presentacion: '30ml', precio: 259.0, sku: 'BAS-BME-001', activo: true },
  { id: '7', productoId: '2', tono: 'Beige Oscuro', codigoHex: '#B47C4D', presentacion: '30ml', precio: 259.0, sku: 'BAS-BOS-001', activo: true },

  // Producto 3 - Rubor en Polvo Durazno
  { id: '4', productoId: '3', tono: 'Durazno', codigoHex: '#F5B183', presentacion: '8g', precio: 149.0, sku: 'RUB-DUR-001', activo: true },
  { id: '8', productoId: '3', tono: 'Coral', codigoHex: '#F2785C', presentacion: '8g', precio: 149.0, sku: 'RUB-COR-001', activo: true },

  // Producto 4 - Labial Liquido Velvet
  { id: '9', productoId: '4', tono: 'Terracota', codigoHex: '#A64B2A', presentacion: '5ml', precio: 219.0, sku: 'LLV-TER-001', activo: true },
  { id: '10', productoId: '4', tono: 'Ciruela', codigoHex: '#6E2C4B', presentacion: '5ml', precio: 219.0, sku: 'LLV-CIR-001', activo: true },

  // Producto 5 - Delineador de Ojos Preciso
  { id: '11', productoId: '5', tono: 'Negro Intenso', codigoHex: '#000000', presentacion: '1.2g', precio: 129.0, sku: 'DEL-NEG-001', activo: true },
  { id: '12', productoId: '5', tono: 'Cafe Chocolate', codigoHex: '#3B2312', presentacion: '1.2g', precio: 129.0, sku: 'DEL-CAF-001', activo: true },

  // Producto 6 - Base en Polvo Compacta
  { id: '13', productoId: '6', tono: 'Marfil', codigoHex: '#F0DCC0', presentacion: '12g', precio: 229.0, sku: 'BPC-MAR-001', activo: true },
  { id: '14', productoId: '6', tono: 'Beige Natural', codigoHex: '#E0BB90', presentacion: '12g', precio: 229.0, sku: 'BPC-BEN-001', activo: true },

  // Producto 7 - Paleta de Sombras Nude
  { id: '15', productoId: '7', tono: 'Tonos Tierra', codigoHex: null, presentacion: '12x1.5g', precio: 349.0, sku: 'SOM-NUD-001', activo: true },

  // Producto 8 - Iluminador en Barra
  { id: '16', productoId: '8', tono: 'Champan Dorado', codigoHex: '#E9C46A', presentacion: '9g', precio: 199.0, sku: 'ILU-CHA-001', activo: true },
  { id: '17', productoId: '8', tono: 'Rosa Perlado', codigoHex: '#E8B4BC', presentacion: '9g', precio: 199.0, sku: 'ILU-ROS-001', activo: true },

  // Producto 9 - Labial Mate Coral
  { id: '18', productoId: '9', tono: 'Coral Vibrante', codigoHex: '#FF6F61', presentacion: '3.5g', precio: 189.0, sku: 'LAB-COV-001', activo: true },

  // Producto 10 - Rubor en Crema Rosa
  { id: '19', productoId: '10', tono: 'Rosa Palo', codigoHex: '#E29BA0', presentacion: '6g', precio: 159.0, sku: 'RUC-ROP-001', activo: true },
  { id: '20', productoId: '10', tono: 'Rosa Frambuesa', codigoHex: '#C2185B', presentacion: '6g', precio: 159.0, sku: 'RUC-ROF-001', activo: true },

  // Producto 11 - Delineador Liquido Waterproof
  { id: '21', productoId: '11', tono: 'Negro Waterproof', codigoHex: '#000000', presentacion: '3ml', precio: 139.0, sku: 'DLW-NEG-001', activo: true },

  // Producto 12 - Sombra Individual Bronce
  { id: '22', productoId: '12', tono: 'Bronce Metalico', codigoHex: '#8C5A2B', presentacion: '2g', precio: 89.0, sku: 'SOI-BRO-001', activo: true },
];

export const imagenesProducto = [
  { id: '1', productoId: '1', urlImagen: 'https://www.maybelline.com/-/media/project/loreal/brand-sites/mny/americas/us/lips-makeup/lip-color/super-stay-matte-ink-liquid-lipstick/update-may-2025/atf/2-browns/charmer/superstaymatteink_ecomm_dmi_packshot_510_charmer_4_1500x1500_brandwebsite.jpg?rev=5de356d0bc5347ed95b535267a0752d4', principal: true },
  { id: '2', productoId: '2', urlImagen: 'https://www.lorealparisusa.com/-/media/project/loreal/brand-sites/oap/americas/us/products/makeup/face/foundation-makeup/true-match-super-blendable-makeup/c0-5-fair-ivory/c05---light/071249671689_t1.png', principal: true },
  { id: '3', productoId: '3', urlImagen: 'https://www.maybelline.com/-/media/project/loreal/brand-sites/mny/americas/us/face-makeup/blush-bronzer/fit-me-blush/maybelline-fitme-blush-40-peach-041554503142-c.jpg?rev=0809dc3bb6a44f67b4b744ab7b7c4776', principal: true },
  { id: '4', productoId: '4', urlImagen: 'https://www.maccosmetics.com/cdn/shop/files/mac_sku_MY3N03_1x1_0.png?format=webp&v=1788967970&width=800', principal: true },
  { id: '5', productoId: '5', urlImagen: 'https://www.maccosmetics.com/cdn/shop/files/mac_sku_M1XG03_1x1_0.png?format=webp&v=1788964446&width=800', principal: true },
  { id: '6', productoId: '6', urlImagen: 'https://fentybeauty.com/cdn/shop/products/FB30026_FB0250.jpg?format=webp&v=1762198091&width=800', principal: true },
  { id: '7', productoId: '7', urlImagen: 'https://es.lorealparisusa.com/-/media/project/loreal/brand-sites/oap/americas/us/products/makeup/eye/eye-shadow/colour-riche-eyeshadow/sunset-seine/071249306932_t1.png', principal: true },
  { id: '8', productoId: '8', urlImagen: 'https://fentybeauty.com/cdn/shop/products/FB30002_FB3005_07f1614a-8bb3-406e-88b7-5cc0f507e91f.jpg?format=webp&v=1762198598&width=800', principal: true },
  { id: '9', productoId: '9', urlImagen: 'https://www.maybelline.com/-/media/project/loreal/brand-sites/mny/americas/us/lips-makeup/lip-color/super-stay-matte-ink-liquid-lipstick/update-may-2025/atf/2-browns/charmer/superstaymatteink_ecomm_dmi_packshot_510_charmer_4_1500x1500_brandwebsite.jpg?rev=5de356d0bc5347ed95b535267a0752d4', principal: true },
  { id: '10', productoId: '10', urlImagen: 'https://www.lorealparisusa.com/-/media/project/loreal/brand-sites/oap/americas/us/products/makeup/face/blush/true-match-blush/sweet-ginger-n7-8/10-11-23-en/071249041840-t1.png', principal: true },
  { id: '11', productoId: '11', urlImagen: 'https://www.maybelline.com/-/media/project/loreal/brand-sites/mny/americas/us/eye-makeup/eyeliner/tattoostudio-sharpenable-gel-pencil-longwear-eyeliner-makeup/galactic-chrome/pdp-product-mny-maky-ttduochrome-developed-632x950.jpg?rev=810406caaed6478c831b927a2c592750', principal: true },
  { id: '12', productoId: '12', urlImagen: 'https://www.maccosmetics.com/cdn/shop/files/mac_sku_M25027_1x1_0.png?format=webp&v=1788964321&width=800', principal: true },
];

export const inventarios = [
  { id: '1', varianteId: '1', cantidad: 40, fechaActualizacion: '2026-09-01' },
  { id: '2', varianteId: '2', cantidad: 25, fechaActualizacion: '2026-09-01' },
  { id: '3', varianteId: '3', cantidad: 15, fechaActualizacion: '2026-09-01' },
  { id: '4', varianteId: '4', cantidad: 60, fechaActualizacion: '2026-09-01' },
  { id: '5', varianteId: '5', cantidad: 30, fechaActualizacion: '2026-09-01' },
  { id: '6', varianteId: '6', cantidad: 20, fechaActualizacion: '2026-09-01' },
  { id: '7', varianteId: '7', cantidad: 18, fechaActualizacion: '2026-09-01' },
  { id: '8', varianteId: '8', cantidad: 22, fechaActualizacion: '2026-09-01' },
  { id: '9', varianteId: '9', cantidad: 35, fechaActualizacion: '2026-09-01' },
  { id: '10', varianteId: '10', cantidad: 28, fechaActualizacion: '2026-09-01' },
  { id: '11', varianteId: '11', cantidad: 50, fechaActualizacion: '2026-09-01' },
  { id: '12', varianteId: '12', cantidad: 45, fechaActualizacion: '2026-09-01' },
  { id: '13', varianteId: '13', cantidad: 33, fechaActualizacion: '2026-09-01' },
  { id: '14', varianteId: '14', cantidad: 27, fechaActualizacion: '2026-09-01' },
  { id: '15', varianteId: '15', cantidad: 12, fechaActualizacion: '2026-09-01' },
  { id: '16', varianteId: '16', cantidad: 24, fechaActualizacion: '2026-09-01' },
  { id: '17', varianteId: '17', cantidad: 19, fechaActualizacion: '2026-09-01' },
  { id: '18', varianteId: '18', cantidad: 38, fechaActualizacion: '2026-09-01' },
  { id: '19', varianteId: '19', cantidad: 26, fechaActualizacion: '2026-09-01' },
  { id: '20', varianteId: '20', cantidad: 21, fechaActualizacion: '2026-09-01' },
  { id: '21', varianteId: '21', cantidad: 42, fechaActualizacion: '2026-09-01' },
  { id: '22', varianteId: '22', cantidad: 55, fechaActualizacion: '2026-09-01' },
];

export const direcciones = [
  { id: '1', usuarioId: '1', calle: 'Av. Vallarta', numero: '1500', colonia: 'Americana', ciudad: 'Guadalajara', estado: 'Jalisco', codigoPostal: '44160', referencias: 'Edificio azul, depto 4', latitud: 20.6736, longitud: -103.373 },
  { id: '2', usuarioId: '3', calle: 'Calzada Independencia', numero: '800', colonia: 'Centro', ciudad: 'Guadalajara', estado: 'Jalisco', codigoPostal: '44100', referencias: null, latitud: null, longitud: null },
];

export const carritos = [
  { id: '1', usuarioId: '1', estado: 'ACTIVO', fechaCreacion: '2026-09-01' },
  { id: '2', usuarioId: '3', estado: 'ACTIVO', fechaCreacion: '2026-09-05' },
];

export const detallesCarrito = [
  { id: '1', carritoId: '1', varianteId: '1', cantidad: 2, precioUnitario: 189.0 },
  { id: '2', carritoId: '1', varianteId: '3', cantidad: 1, precioUnitario: 259.0 },
  { id: '3', carritoId: '2', varianteId: '4', cantidad: 3, precioUnitario: 149.0 },
];

export const favoritos = [
  { id: '1', usuarioId: '1', productoId: '2', fechaAgregado: '2026-08-28' },
  { id: '2', usuarioId: '3', productoId: '1', fechaAgregado: '2026-09-02' },
];

export const resenas = [
  { id: '1', usuarioId: '1', productoId: '1', calificacion: 5, comentario: 'Excelente pigmentacion y no reseca los labios', compraVerificada: true, fecha: '2026-08-15' },
  { id: '2', usuarioId: '3', productoId: '3', calificacion: 4, comentario: 'Buen color pero se acaba rapido', compraVerificada: true, fecha: '2026-08-20' },
];

export const pedidos = [
  { id: '1', usuarioId: '1', direccionId: '1', fecha: '2026-08-20', subtotal: 378.0, total: 378.0, estado: 'PAGADO', transaccionPagoId: 'TXN-0001' },
];

export const detallesPedido = [
  { id: '1', pedidoId: '1', varianteId: '1', cantidad: 2, precioUnitario: 189.0, subtotal: 378.0 },
];

export let nextIds = {
  rol: roles.length + 1,
  usuario: usuarios.length + 1,
  marca: marcas.length + 1,
  categoria: categorias.length + 1,
  producto: productos.length + 1,
  varianteProducto: variantesProducto.length + 1,
  imagenProducto: imagenesProducto.length + 1,
  inventario: inventarios.length + 1,
  direccion: direcciones.length + 1,
  carrito: carritos.length + 1,
  detalleCarrito: detallesCarrito.length + 1,
  favorito: favoritos.length + 1,
  resena: resenas.length + 1,
  pedido: pedidos.length + 1,
  detallePedido: detallesPedido.length + 1,
};