-- back/db/schema.sql
-- Esquema relacional (PostgreSQL) del e-commerce de maquillaje Nuvé.
-- Traducción directa del DER (15 entidades) al mismo modelo que expone
-- src/schema.js por GraphQL. Ejecutar este archivo UNA sola vez para
-- crear las tablas en una base de datos ya existente y vacía.
--
-- Uso:
--   createdb nuve_ecommerce
--   psql -d nuve_ecommerce -f db/schema.sql
--   psql -d nuve_ecommerce -f db/seed.sql

-- ------------------------------------------------------------------
-- TIPOS ENUM
-- ------------------------------------------------------------------

CREATE TYPE estado_carrito AS ENUM ('ACTIVO', 'COMPLETADO', 'ABANDONADO');

CREATE TYPE status_pedido AS ENUM ('PENDIENTE', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO');

-- ------------------------------------------------------------------
-- TABLAS
-- ------------------------------------------------------------------

CREATE TABLE rol (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(50)  NOT NULL,
  descripcion   VARCHAR(255)
);

CREATE TABLE usuario (
  id              SERIAL PRIMARY KEY,
  rol_id          INTEGER NOT NULL REFERENCES rol(id),
  nombre          VARCHAR(120) NOT NULL,
  correo          VARCHAR(160) NOT NULL UNIQUE,
  password        VARCHAR(255) NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_registro  DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE marca (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  descripcion   VARCHAR(255),
  activo        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE categoria (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  descripcion   VARCHAR(255),
  activo        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE producto (
  id              SERIAL PRIMARY KEY,
  categoria_id    INTEGER NOT NULL REFERENCES categoria(id),
  marca_id        INTEGER NOT NULL REFERENCES marca(id),
  nombre          VARCHAR(160) NOT NULL,
  descripcion     TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_registro  DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE variante_producto (
  id            SERIAL PRIMARY KEY,
  producto_id   INTEGER NOT NULL REFERENCES producto(id),
  tono          VARCHAR(80),
  codigo_hex    VARCHAR(7),
  presentacion  VARCHAR(50),
  precio        DECIMAL(10,2) NOT NULL,
  sku           VARCHAR(40) NOT NULL UNIQUE,
  activo        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE imagen_producto (
  id            SERIAL PRIMARY KEY,
  producto_id   INTEGER NOT NULL REFERENCES producto(id),
  url_imagen    VARCHAR(500) NOT NULL,
  principal     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE inventario (
  id                    SERIAL PRIMARY KEY,
  variante_id           INTEGER NOT NULL UNIQUE REFERENCES variante_producto(id),
  cantidad              INTEGER NOT NULL DEFAULT 0,
  fecha_actualizacion   DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE carrito (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER NOT NULL REFERENCES usuario(id),
  estado          estado_carrito NOT NULL DEFAULT 'ACTIVO',
  fecha_creacion  DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE detalle_carrito (
  id              SERIAL PRIMARY KEY,
  carrito_id      INTEGER NOT NULL REFERENCES carrito(id),
  variante_id     INTEGER NOT NULL REFERENCES variante_producto(id),
  cantidad        INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL
);

CREATE TABLE direccion (
  id             SERIAL PRIMARY KEY,
  usuario_id     INTEGER NOT NULL REFERENCES usuario(id),
  calle          VARCHAR(160) NOT NULL,
  numero         VARCHAR(20),
  colonia        VARCHAR(120),
  ciudad         VARCHAR(120) NOT NULL,
  estado         VARCHAR(120) NOT NULL,
  codigo_postal  VARCHAR(10),
  referencias    VARCHAR(255),
  latitud        DECIMAL(10,7),
  longitud       DECIMAL(10,7)
);

CREATE TABLE favorito (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER NOT NULL REFERENCES usuario(id),
  producto_id     INTEGER NOT NULL REFERENCES producto(id),
  fecha_agregado  DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT uq_favorito UNIQUE (usuario_id, producto_id)
);

CREATE TABLE resena (
  id                 SERIAL PRIMARY KEY,
  usuario_id         INTEGER NOT NULL REFERENCES usuario(id),
  producto_id        INTEGER NOT NULL REFERENCES producto(id),
  calificacion       SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario         TEXT,
  compra_verificada  BOOLEAN NOT NULL DEFAULT FALSE,
  fecha              DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE pedido (
  id                   SERIAL PRIMARY KEY,
  usuario_id           INTEGER NOT NULL REFERENCES usuario(id),
  direccion_id         INTEGER NOT NULL REFERENCES direccion(id),
  fecha                DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal             DECIMAL(10,2) NOT NULL,
  total                DECIMAL(10,2) NOT NULL,
  estado               status_pedido NOT NULL DEFAULT 'PENDIENTE',
  transaccion_pago_id  VARCHAR(60)
);

CREATE TABLE detalle_pedido (
  id              SERIAL PRIMARY KEY,
  pedido_id       INTEGER NOT NULL REFERENCES pedido(id),
  variante_id     INTEGER NOT NULL REFERENCES variante_producto(id),
  cantidad        INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL
);

-- Sesiones: un refresh token por inicio de sesión. Solo se guarda su hash
-- SHA-256 (nunca el token), y cada uno sirve una sola vez (rotación).
CREATE TABLE refresh_token (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  expira_en   TIMESTAMP NOT NULL,
  revocado    BOOLEAN NOT NULL DEFAULT FALSE,
  revocado_en TIMESTAMP,
  creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- ÍNDICES (llaves foráneas que se consultan seguido en los resolvers)
-- ------------------------------------------------------------------

CREATE INDEX idx_producto_categoria ON producto(categoria_id);
CREATE INDEX idx_producto_marca ON producto(marca_id);
CREATE INDEX idx_variante_producto ON variante_producto(producto_id);
CREATE INDEX idx_imagen_producto ON imagen_producto(producto_id);
CREATE INDEX idx_detalle_carrito_carrito ON detalle_carrito(carrito_id);
CREATE INDEX idx_detalle_pedido_pedido ON detalle_pedido(pedido_id);
CREATE INDEX idx_favorito_usuario ON favorito(usuario_id);
CREATE INDEX idx_resena_producto ON resena(producto_id);
CREATE INDEX idx_refresh_usuario ON refresh_token(usuario_id);
