# Nuvé — Backend (GraphQL + PostgreSQL + auth)

Apollo Server (GraphQL) con las 15 entidades del DER sobre PostgreSQL, más autenticación con JWT y refresh tokens.

## Estructura

```
back/
├── index.js                 # levanta Apollo y arma el contexto (lee el Bearer token de cada petición)
├── db/
│   ├── schema.sql           # 16 tablas: las 15 del DER + refresh_token
│   └── seed.sql             # datos de ejemplo, roles y usuarios de prueba (contraseñas hasheadas)
└── src/
    ├── db.js                # pool de conexiones (pg)
    ├── schema.js            # SDL: types, inputs, Query, Mutation
    ├── resolvers.js         # consultas SQL + reglas de "solo lo tuyo"
    ├── data/mock.js         # (ya no se usa) referencia de los datos originales
    └── auth/
        ├── config.js        # JWT_SECRET, duración de tokens, nombres de roles
        ├── tokens.js        # firmar/verificar JWT, generar y hashear refresh tokens
        ├── servicio.js      # registrar, iniciarSesion, refrescar (con rotación), cerrarSesion
        ├── permisos.js      # TABLA ÚNICA de qué rol puede cada operación + wrapper
        └── errores.js       # UNAUTHENTICATED / FORBIDDEN / BAD_USER_INPUT
```

## Variables de entorno (`.env`)

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | `postgresql://usuario:password@localhost:5432/nuve_ecommerce` |
| `JWT_SECRET` | Clave con la que se firman los JWT (usa una larga y aleatoria) |
| `ACCESS_TOKEN_TTL` | Vida del access token (por defecto `15m`) |
| `REFRESH_TOKEN_DAYS` | Vida del refresh token en días (por defecto `7`) |

## Operaciones de autenticación

```graphql
mutation { registrar(datos: { nombre: "Ana", correo: "ana@x.com", password: "Password123" }) { accessToken refreshToken usuario { rol { nombre } } } }
mutation { iniciarSesion(correo: "admin@example.com", password: "Nuve2026!") { accessToken refreshToken } }
mutation { refrescarToken(refreshToken: "...") { accessToken refreshToken } }
mutation { cerrarSesion(refreshToken: "...") }
query    { yo { nombre rol { nombre } } }        # requiere header Authorization: Bearer <accessToken>
```

En el Apollo Sandbox agrega el header `Authorization` con `Bearer <accessToken>` para probar operaciones protegidas.

## Cómo se aplican los permisos (dos capas)

1. **Por rol** (`auth/permisos.js`): una tabla `{ Mutation: { eliminarProducto: ['ADMIN'], ... } }`. Al arrancar,
   `protegerResolvers()` envuelve cada resolver con la verificación; si falta el resolver, el servidor no arranca.
2. **Por propiedad** (`resolvers.js`): un cliente solo lee y modifica **sus** pedidos, direcciones, carritos y favoritos;
   aunque mande otro `usuarioId`, el backend lo sobrescribe con el de su sesión. Admin y operador ven todo.

## Compra (`crearPedido`)

Dentro de **una transacción**: valida cantidades enteras ≥ 1, toma el precio real de la BD, **descuenta el inventario**
(si no alcanza, aborta todo), y guarda el pedido con sus líneas. Al cancelar un pedido el stock se devuelve.

## Limitaciones conocidas (para mencionar con honestidad)

- Un access token ya emitido sigue siendo válido hasta que expira (máx. 15 min) aunque se desactive la cuenta; los
  refresh tokens sí se revocan al instante.
- No hay límite de intentos de login (rate limiting); se agregaría con un middleware en un siguiente paso.
- El carrito vive en el navegador (localStorage), no en la base de datos.
