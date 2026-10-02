# Nuvé — Frontend (Astro SSR)

Astro en modo servidor (`output: 'server'`, adaptador `@astrojs/node`) con islas de React solo donde hay interactividad.

Requiere **Node.js 22.12 o superior**.

## Comandos

```bash
npm install
npm run dev       # desarrollo, http://localhost:5173
npm run build     # compila a dist/
npm start         # sirve el build (node ./dist/server/entry.mjs)
npm run check     # revisa tipos
```

`.env` (copia `.env.example`): `GRAPHQL_URL=http://localhost:4000/` — solo la usa el servidor de Astro.

## Estructura

```
src/
├── middleware.ts            # identifica al usuario, renueva tokens y protege rutas por rol
├── layouts/Layout.astro     # TopBar + contenido + Footer
├── pages/
│   ├── index.astro          # catálogo (isla Catalogo: filtros por tono/precio + búsqueda ?q=)
│   ├── categoria/[id].astro, producto/[id].astro
│   ├── carrito.astro, checkout.astro          # checkout requiere sesión
│   ├── login.astro, registro.astro
│   ├── mi-cuenta.astro      # cualquier sesión
│   ├── operador/index.astro # OPERADOR y ADMIN
│   ├── admin/index.astro    # solo ADMIN
│   ├── sin-permiso.astro    # 403
│   └── api/                 # endpoints: auth/*, checkout, direccion, pedido/*, operador/*, admin/*
├── components/              # .astro (estáticos: TopBar, Footer, Hero, Contexto) y .tsx (islas)
├── lib/
│   ├── graphql.ts           # cliente GraphQL (solo servidor)
│   ├── sesion.ts            # cookies httpOnly de sesión
│   ├── cart.ts              # carrito con nanostores + localStorage
│   └── acciones.ts          # fábrica de endpoints de formulario
└── styles/theme.css         # fuente única del diseño (Manual de Identidad Digital Nuvé)
```

## Notas

- **Logo:** `src/assets/logo/nuve_isotipo_reversa.svg` es un placeholder; reemplázalo con tu archivo real (mismo nombre).
- **Carrito:** en Astro cada página es una carga completa, por eso el carrito usa `localStorage` (nanostores persistente)
  compartido entre islas. Al cerrar sesión se vacía.
- **Islas:** `Catalogo` (`client:load`), `ProductoDetalle` (`client:load`), `Newsletter` (`client:load`);
  `CartBadge`, `Carrito` y `Checkout` son `client:only="react"` porque dependen de localStorage.
