-- back/db/seed.sql
-- Datos semilla (mismo catálogo que back/src/data/mock.js), generado a partir de él.
-- Ejecutar después de schema.sql: psql -d nuve_ecommerce -f db/seed.sql

INSERT INTO rol (id, nombre, descripcion) VALUES
  (1, 'CLIENTE', 'Compra en la tienda y gestiona sus pedidos'),
  (2, 'ADMIN', 'Administra catalogo, usuarios y roles'),
  (3, 'OPERADOR', 'Gestiona pedidos e inventario');

INSERT INTO usuario (id, rol_id, nombre, correo, password, activo, fecha_registro) VALUES
  (1, 1, 'Valeria Gomez', 'valeria@example.com', '$2b$10$WQIc5D.88KRDdn80wk4Jx.a8IMRwqw/Bd.FFGY5abiT2uXP041UpS', TRUE, '2026-07-01'),
  (2, 2, 'Admin Root', 'admin@example.com', '$2b$10$WQIc5D.88KRDdn80wk4Jx.a8IMRwqw/Bd.FFGY5abiT2uXP041UpS', TRUE, '2026-06-01'),
  (3, 1, 'Karla Ruiz', 'karla@example.com', '$2b$10$WQIc5D.88KRDdn80wk4Jx.a8IMRwqw/Bd.FFGY5abiT2uXP041UpS', TRUE, '2026-08-10'),
  (4, 3, 'Omar Operador', 'operador@example.com', '$2b$10$WQIc5D.88KRDdn80wk4Jx.a8IMRwqw/Bd.FFGY5abiT2uXP041UpS', TRUE, '2026-09-01');

INSERT INTO marca (id, nombre, descripcion, activo) VALUES
  (1, 'Maybelline New York', 'Marca global de maquillaje accesible, fuerte en labiales y color', TRUE),
  (2, 'L''Oreal Paris', 'Marca francesa de maquillaje y cuidado facial', TRUE),
  (3, 'MAC Cosmetics', 'Marca profesional de alta pigmentacion', TRUE),
  (4, 'Fenty Beauty', 'Marca inclusiva conocida por bases e iluminadores', TRUE);

INSERT INTO categoria (id, nombre, descripcion, activo) VALUES
  (1, 'Labiales', 'Labiales en distintos acabados', TRUE),
  (2, 'Bases', 'Bases de maquillaje liquidas y en polvo', TRUE),
  (3, 'Rubor', 'Rubores en polvo y crema', TRUE),
  (4, 'Delineadores', 'Delineadores liquidos y en lapiz', TRUE),
  (5, 'Sombras', 'Sombras individuales y paletas', TRUE),
  (6, 'Iluminador', 'Iluminadores en barra y polvo', TRUE);

INSERT INTO producto (id, categoria_id, marca_id, nombre, descripcion, activo, fecha_registro) VALUES
  (1, 1, 1, 'Labial Mate Pasion', 'Labial mate de larga duracion', TRUE, '2026-07-05'),
  (2, 2, 2, 'Base Liquida Natural', 'Base de cobertura media, acabado natural', TRUE, '2026-07-10'),
  (3, 3, 1, 'Rubor en Polvo Durazno', 'Rubor compacto tono durazno', TRUE, '2026-07-15'),
  (4, 1, 3, 'Labial Liquido Velvet', 'Labial liquido de acabado aterciopelado', TRUE, '2026-07-18'),
  (5, 4, 3, 'Delineador de Ojos Preciso', 'Delineador en lapiz de trazo fino', TRUE, '2026-07-20'),
  (6, 2, 4, 'Base en Polvo Compacta', 'Base compacta de cobertura alta', TRUE, '2026-07-22'),
  (7, 5, 2, 'Paleta de Sombras Nude', 'Paleta de 12 tonos tierra', TRUE, '2026-07-25'),
  (8, 6, 4, 'Iluminador en Barra', 'Iluminador cremoso de facil aplicacion', TRUE, '2026-07-28'),
  (9, 1, 1, 'Labial Mate Coral', 'Labial mate tono coral vibrante', TRUE, '2026-08-01'),
  (10, 3, 2, 'Rubor en Crema Rosa', 'Rubor en crema de acabado luminoso', TRUE, '2026-08-03'),
  (11, 4, 1, 'Delineador Liquido Waterproof', 'Delineador liquido resistente al agua', TRUE, '2026-08-05'),
  (12, 5, 3, 'Sombra Individual Bronce', 'Sombra individual efecto metalico', TRUE, '2026-08-07');

INSERT INTO variante_producto (id, producto_id, tono, codigo_hex, presentacion, precio, sku, activo) VALUES
  (1, 1, 'Rojo Pasion', '#C0392B', '3.5g', 189.00, 'LAB-ROJ-001', TRUE),
  (2, 1, 'Rojo Vino', '#7B241C', '3.5g', 189.00, 'LAB-VIN-001', TRUE),
  (5, 1, 'Rosa Nude', '#D8A7A0', '3.5g', 179.00, 'LAB-NUD-001', TRUE),
  (3, 2, 'Beige Claro', '#E8C39E', '30ml', 259.00, 'BAS-BEI-001', TRUE),
  (6, 2, 'Beige Medio', '#D9A876', '30ml', 259.00, 'BAS-BME-001', TRUE),
  (7, 2, 'Beige Oscuro', '#B47C4D', '30ml', 259.00, 'BAS-BOS-001', TRUE),
  (4, 3, 'Durazno', '#F5B183', '8g', 149.00, 'RUB-DUR-001', TRUE),
  (8, 3, 'Coral', '#F2785C', '8g', 149.00, 'RUB-COR-001', TRUE),
  (9, 4, 'Terracota', '#A64B2A', '5ml', 219.00, 'LLV-TER-001', TRUE),
  (10, 4, 'Ciruela', '#6E2C4B', '5ml', 219.00, 'LLV-CIR-001', TRUE),
  (11, 5, 'Negro Intenso', '#000000', '1.2g', 129.00, 'DEL-NEG-001', TRUE),
  (12, 5, 'Cafe Chocolate', '#3B2312', '1.2g', 129.00, 'DEL-CAF-001', TRUE),
  (13, 6, 'Marfil', '#F0DCC0', '12g', 229.00, 'BPC-MAR-001', TRUE),
  (14, 6, 'Beige Natural', '#E0BB90', '12g', 229.00, 'BPC-BEN-001', TRUE),
  (15, 7, 'Tonos Tierra', NULL, '12x1.5g', 349.00, 'SOM-NUD-001', TRUE),
  (16, 8, 'Champan Dorado', '#E9C46A', '9g', 199.00, 'ILU-CHA-001', TRUE),
  (17, 8, 'Rosa Perlado', '#E8B4BC', '9g', 199.00, 'ILU-ROS-001', TRUE),
  (18, 9, 'Coral Vibrante', '#FF6F61', '3.5g', 189.00, 'LAB-COV-001', TRUE),
  (19, 10, 'Rosa Palo', '#E29BA0', '6g', 159.00, 'RUC-ROP-001', TRUE),
  (20, 10, 'Rosa Frambuesa', '#C2185B', '6g', 159.00, 'RUC-ROF-001', TRUE),
  (21, 11, 'Negro Waterproof', '#000000', '3ml', 139.00, 'DLW-NEG-001', TRUE),
  (22, 12, 'Bronce Metalico', '#8C5A2B', '2g', 89.00, 'SOI-BRO-001', TRUE);

INSERT INTO imagen_producto (id, producto_id, url_imagen, principal) VALUES
  (1, 1, 'https://www.maybelline.com/-/media/project/loreal/brand-sites/mny/americas/us/lips-makeup/lip-color/super-stay-matte-ink-liquid-lipstick/update-may-2025/atf/2-browns/charmer/superstaymatteink_ecomm_dmi_packshot_510_charmer_4_1500x1500_brandwebsite.jpg?rev=5de356d0bc5347ed95b535267a0752d4', TRUE),
  (2, 2, 'https://www.lorealparisusa.com/-/media/project/loreal/brand-sites/oap/americas/us/products/makeup/face/foundation-makeup/true-match-super-blendable-makeup/c0-5-fair-ivory/c05---light/071249671689_t1.png', TRUE),
  (3, 3, 'https://www.maybelline.com/-/media/project/loreal/brand-sites/mny/americas/us/face-makeup/blush-bronzer/fit-me-blush/maybelline-fitme-blush-40-peach-041554503142-c.jpg?rev=0809dc3bb6a44f67b4b744ab7b7c4776', TRUE),
  (4, 4, 'https://www.maccosmetics.com/cdn/shop/files/mac_sku_MY3N03_1x1_0.png?format=webp&v=1788967970&width=800', TRUE),
  (5, 5, 'https://www.maccosmetics.com/cdn/shop/files/mac_sku_M1XG03_1x1_0.png?format=webp&v=1788964446&width=800', TRUE),
  (6, 6, 'https://fentybeauty.com/cdn/shop/products/FB30026_FB0250.jpg?format=webp&v=1762198091&width=800', TRUE),
  (7, 7, 'https://es.lorealparisusa.com/-/media/project/loreal/brand-sites/oap/americas/us/products/makeup/eye/eye-shadow/colour-riche-eyeshadow/sunset-seine/071249306932_t1.png', TRUE),
  (8, 8, 'https://fentybeauty.com/cdn/shop/products/FB30002_FB3005_07f1614a-8bb3-406e-88b7-5cc0f507e91f.jpg?format=webp&v=1762198598&width=800', TRUE),
  (9, 9, 'https://www.maybelline.com/-/media/project/loreal/brand-sites/mny/americas/us/lips-makeup/lip-color/super-stay-matte-ink-liquid-lipstick/update-may-2025/atf/2-browns/charmer/superstaymatteink_ecomm_dmi_packshot_510_charmer_4_1500x1500_brandwebsite.jpg?rev=5de356d0bc5347ed95b535267a0752d4', TRUE),
  (10, 10, 'https://www.lorealparisusa.com/-/media/project/loreal/brand-sites/oap/americas/us/products/makeup/face/blush/true-match-blush/sweet-ginger-n7-8/10-11-23-en/071249041840-t1.png', TRUE),
  (11, 11, 'https://www.maybelline.com/-/media/project/loreal/brand-sites/mny/americas/us/eye-makeup/eyeliner/tattoostudio-sharpenable-gel-pencil-longwear-eyeliner-makeup/galactic-chrome/pdp-product-mny-maky-ttduochrome-developed-632x950.jpg?rev=810406caaed6478c831b927a2c592750', TRUE),
  (12, 12, 'https://www.maccosmetics.com/cdn/shop/files/mac_sku_M25027_1x1_0.png?format=webp&v=1788964321&width=800', TRUE);

INSERT INTO inventario (id, variante_id, cantidad, fecha_actualizacion) VALUES
  (1, 1, 40, '2026-09-01'),
  (2, 2, 25, '2026-09-01'),
  (3, 3, 15, '2026-09-01'),
  (4, 4, 60, '2026-09-01'),
  (5, 5, 30, '2026-09-01'),
  (6, 6, 20, '2026-09-01'),
  (7, 7, 18, '2026-09-01'),
  (8, 8, 22, '2026-09-01'),
  (9, 9, 35, '2026-09-01'),
  (10, 10, 28, '2026-09-01'),
  (11, 11, 50, '2026-09-01'),
  (12, 12, 45, '2026-09-01'),
  (13, 13, 33, '2026-09-01'),
  (14, 14, 27, '2026-09-01'),
  (15, 15, 12, '2026-09-01'),
  (16, 16, 24, '2026-09-01'),
  (17, 17, 19, '2026-09-01'),
  (18, 18, 38, '2026-09-01'),
  (19, 19, 26, '2026-09-01'),
  (20, 20, 21, '2026-09-01'),
  (21, 21, 42, '2026-09-01'),
  (22, 22, 55, '2026-09-01');

INSERT INTO direccion (id, usuario_id, calle, numero, colonia, ciudad, estado, codigo_postal, referencias, latitud, longitud) VALUES
  (1, 1, 'Av. Vallarta', '1500', 'Americana', 'Guadalajara', 'Jalisco', '44160', 'Edificio azul, depto 4', 20.6736, -103.373),
  (2, 3, 'Calzada Independencia', '800', 'Centro', 'Guadalajara', 'Jalisco', '44100', NULL, NULL, NULL);

INSERT INTO carrito (id, usuario_id, estado, fecha_creacion) VALUES
  (1, 1, 'ACTIVO', '2026-09-01'),
  (2, 3, 'ACTIVO', '2026-09-05');

INSERT INTO detalle_carrito (id, carrito_id, variante_id, cantidad, precio_unitario) VALUES
  (1, 1, 1, 2, 189.00),
  (2, 1, 3, 1, 259.00),
  (3, 2, 4, 3, 149.00);

INSERT INTO favorito (id, usuario_id, producto_id, fecha_agregado) VALUES
  (1, 1, 2, '2026-08-28'),
  (2, 3, 1, '2026-09-02');

INSERT INTO resena (id, usuario_id, producto_id, calificacion, comentario, compra_verificada, fecha) VALUES
  (1, 1, 1, 5, 'Excelente pigmentacion y no reseca los labios', TRUE, '2026-08-15'),
  (2, 3, 3, 4, 'Buen color pero se acaba rapido', TRUE, '2026-08-20');

INSERT INTO pedido (id, usuario_id, direccion_id, fecha, subtotal, total, estado, transaccion_pago_id) VALUES
  (1, 1, 1, '2026-08-20', 378.00, 378.00, 'PAGADO', 'TXN-0001');

INSERT INTO detalle_pedido (id, pedido_id, variante_id, cantidad, precio_unitario, subtotal) VALUES
  (1, 1, 1, 2, 189.00, 378.00);

-- Sincroniza las secuencias SERIAL con los ids insertados a mano arriba,
-- para que las próximas inserciones (crearProducto, crearUsuario, etc.) no choquen.
SELECT setval(pg_get_serial_sequence('rol', 'id'), COALESCE((SELECT MAX(id) FROM rol), 1));
SELECT setval(pg_get_serial_sequence('usuario', 'id'), COALESCE((SELECT MAX(id) FROM usuario), 1));
SELECT setval(pg_get_serial_sequence('refresh_token', 'id'), COALESCE((SELECT MAX(id) FROM refresh_token), 1));
SELECT setval(pg_get_serial_sequence('marca', 'id'), COALESCE((SELECT MAX(id) FROM marca), 1));
SELECT setval(pg_get_serial_sequence('categoria', 'id'), COALESCE((SELECT MAX(id) FROM categoria), 1));
SELECT setval(pg_get_serial_sequence('producto', 'id'), COALESCE((SELECT MAX(id) FROM producto), 1));
SELECT setval(pg_get_serial_sequence('variante_producto', 'id'), COALESCE((SELECT MAX(id) FROM variante_producto), 1));
SELECT setval(pg_get_serial_sequence('imagen_producto', 'id'), COALESCE((SELECT MAX(id) FROM imagen_producto), 1));
SELECT setval(pg_get_serial_sequence('inventario', 'id'), COALESCE((SELECT MAX(id) FROM inventario), 1));
SELECT setval(pg_get_serial_sequence('direccion', 'id'), COALESCE((SELECT MAX(id) FROM direccion), 1));
SELECT setval(pg_get_serial_sequence('carrito', 'id'), COALESCE((SELECT MAX(id) FROM carrito), 1));
SELECT setval(pg_get_serial_sequence('detalle_carrito', 'id'), COALESCE((SELECT MAX(id) FROM detalle_carrito), 1));
SELECT setval(pg_get_serial_sequence('favorito', 'id'), COALESCE((SELECT MAX(id) FROM favorito), 1));
SELECT setval(pg_get_serial_sequence('resena', 'id'), COALESCE((SELECT MAX(id) FROM resena), 1));
SELECT setval(pg_get_serial_sequence('pedido', 'id'), COALESCE((SELECT MAX(id) FROM pedido), 1));
SELECT setval(pg_get_serial_sequence('detalle_pedido', 'id'), COALESCE((SELECT MAX(id) FROM detalle_pedido), 1));
