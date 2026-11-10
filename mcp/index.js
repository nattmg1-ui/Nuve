// mcp/index.js
// Servidor MCP de Nuvé (local, por stdio) para Claude Desktop.
//
// No se conecta directo a PostgreSQL: usa la misma API GraphQL que la tienda,
// iniciando sesión con la cuenta que pongas en mcp/.env. Así se respetan los
// mismos permisos por rol (ADMIN, OPERADOR, CLIENTE) que en el sitio, y los
// cambios que haga Claude (estado de un pedido, existencias) disparan las
// subscriptions: el BackOffice abierto se actualiza solo.
//
// IMPORTANTE: en un servidor MCP por stdio, la salida estándar es el canal con
// Claude. Por eso aquí nunca se usa console.log; los avisos van a console.error.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(AQUI, '.env'), quiet: true });

const GRAPHQL_URL = process.env.NUVE_GRAPHQL_URL || 'http://localhost:4000/graphql';
const CORREO = process.env.NUVE_CORREO || '';
const PASSWORD = process.env.NUVE_PASSWORD || '';
const TIENDA_URL = (process.env.NUVE_TIENDA_URL || 'http://localhost:5173').replace(/\/$/, '');

// ------------------------------------------------------------------
// Cliente GraphQL con sesión
// ------------------------------------------------------------------

let accessToken = null;
let refreshToken = null;
let usuarioSesion = null;

class ErrorNuve extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.codigo = codigo;
  }
}

async function peticion(query, variables, token) {
  let respuesta;
  try {
    respuesta = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new ErrorNuve(
      `No se pudo conectar con el backend en ${GRAPHQL_URL}. ¿Está corriendo? (en la carpeta back: npm run dev)`,
      'SIN_CONEXION'
    );
  }
  const cuerpo = await respuesta.json().catch(() => null);
  if (!cuerpo) throw new ErrorNuve(`El backend respondió ${respuesta.status} sin datos.`, 'RESPUESTA_INVALIDA');
  if (cuerpo.errors?.length) {
    const e = cuerpo.errors[0];
    throw new ErrorNuve(e.message, e.extensions?.code);
  }
  return cuerpo.data;
}

async function iniciarSesion() {
  if (!CORREO || !PASSWORD) {
    throw new ErrorNuve(
      'Esta herramienta necesita una cuenta. Configura NUVE_CORREO y NUVE_PASSWORD en mcp/.env y reinicia Claude Desktop.',
      'SIN_CREDENCIALES'
    );
  }
  const data = await peticion(
    `mutation ($correo: String!, $password: String!) {
       iniciarSesion(correo: $correo, password: $password) {
         accessToken refreshToken usuario { id nombre correo rol { nombre } }
       }
     }`,
    { correo: CORREO, password: PASSWORD }
  );
  accessToken = data.iniciarSesion.accessToken;
  refreshToken = data.iniciarSesion.refreshToken;
  usuarioSesion = data.iniciarSesion.usuario;
}

async function refrescar() {
  if (!refreshToken) return iniciarSesion();
  try {
    const data = await peticion(
      `mutation ($t: String!) { refrescarToken(refreshToken: $t) { accessToken refreshToken } }`,
      { t: refreshToken }
    );
    accessToken = data.refrescarToken.accessToken;
    refreshToken = data.refrescarToken.refreshToken;
  } catch {
    await iniciarSesion();
  }
}

/** Consulta pública (catálogo): no necesita sesión. */
const publica = (query, variables) => peticion(query, variables);

/** Consulta con sesión: inicia sesión si hace falta y renueva el token si venció. */
async function privada(query, variables) {
  if (!accessToken) await iniciarSesion();
  try {
    return await peticion(query, variables, accessToken);
  } catch (e) {
    if (e.codigo === 'UNAUTHENTICATED') {
      await refrescar();
      return peticion(query, variables, accessToken);
    }
    throw e;
  }
}

// ------------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------------

const dinero = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const texto = (t) => ({ content: [{ type: 'text', text: t }] });

/** Envuelve una herramienta: los errores se devuelven a Claude como texto claro. */
const seguro = (fn) => async (args) => {
  try {
    return await fn(args ?? {});
  } catch (e) {
    const mensaje =
      e.codigo === 'FORBIDDEN'
        ? `Tu cuenta (${usuarioSesion?.rol?.nombre ?? 'sin sesión'}) no tiene permiso para esto: ${e.message}`
        : e.message;
    return { ...texto(`Error: ${mensaje}`), isError: true };
  }
};

/** Quita acentos y mayúsculas para comparar textos ("Rosa" = "rosá"). */
const normal = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const CAMPOS_PRODUCTO = `
  id nombre descripcion activo
  marca { nombre }
  categoria { id nombre }
  imagenes { urlImagen principal }
  variantes { id tono codigoHex presentacion precio sku imagenUrl inventario { id cantidad } }
`;

const CAMPOS_PEDIDO = `
  id fecha subtotal total estado estadosSiguientes metodoPago fechaPago pagoEnOxxo
  usuario { nombre correo }
  direccion { calle numero colonia ciudad estado codigoPostal }
  detalles { cantidad precioUnitario subtotal variante { sku tono producto { nombre } } }
`;

const lineaVariante = (v) => {
  const stock = v.inventario?.cantidad;
  const estado = stock == null ? 'sin inventario' : stock <= 0 ? 'AGOTADO' : `${stock} pzas`;
  return `   - ${v.tono ?? 'Único'}${v.codigoHex ? ` (${v.codigoHex})` : ''} · SKU ${v.sku} · ${dinero(v.precio)} · ${estado}`;
};

const bloqueProducto = (p) =>
  [
    `#${p.id} ${p.nombre} — ${p.marca.nombre} · ${p.categoria.nombre}${p.activo === false ? ' (DESACTIVADO)' : ''}`,
    ...p.variantes.map(lineaVariante),
    `   Ver en la tienda: ${TIENDA_URL}/producto/${p.id}`,
  ].join('\n');

const resumenPedido = (p) =>
  `Pedido #${p.id} · ${p.fecha} · ${p.estado} · ${dinero(p.total)} · ${p.usuario.nombre} (${p.usuario.correo})` +
  (p.metodoPago ? ` · pagado con ${p.metodoPago}` : '');

const detallePedido = (p) => {
  const d = p.direccion;
  return [
    resumenPedido(p),
    `Dirección: ${d.calle}${d.numero ? ' ' + d.numero : ''}${d.colonia ? ', ' + d.colonia : ''}, ${d.ciudad}, ${d.estado}${d.codigoPostal ? ' CP ' + d.codigoPostal : ''}`,
    'Productos:',
    ...p.detalles.map(
      (x) =>
        `   - ${x.cantidad} x ${x.variante.producto.nombre}${x.variante.tono ? ' (' + x.variante.tono + ')' : ''} · SKU ${x.variante.sku} · ${dinero(x.precioUnitario)} c/u = ${dinero(x.subtotal)}`
    ),
    `Subtotal ${dinero(p.subtotal)} · Total ${dinero(p.total)}`,
    p.fechaPago
      ? `Pagado el ${p.fechaPago}${p.pagoEnOxxo ? ' en OXXO' : ''}`
      : p.estado === 'PENDIENTE'
        ? 'Aún sin pagar'
        : '',
    p.estadosSiguientes.length
      ? `Puede pasar a: ${p.estadosSiguientes.join(', ')}`
      : 'Estado final: ya no puede cambiar.',
  ]
    .filter(Boolean)
    .join('\n');
};

// ------------------------------------------------------------------
// Servidor
// ------------------------------------------------------------------

const server = new McpServer({ name: 'nuve', version: '1.0.0' });

const SOLO_LECTURA = { readOnlyHint: true, openWorldHint: false };

// ---------- Catálogo (público) ----------

server.registerTool(
  'buscar_productos',
  {
    title: 'Buscar productos',
    description:
      'Busca en el catálogo de Nuvé por texto (nombre o marca), por tono (nombre como "rosa" o código como #D8A7A0) y/o por categoría. ' +
      'Devuelve cada producto con sus tonos, precio y existencias de cada tono. La tienda no recomienda tonos: solo filtra.',
    inputSchema: {
      texto: z.string().optional().describe('Parte del nombre del producto o de la marca'),
      tono: z.string().optional().describe('Nombre del tono (ej. "rosa", "beige") o código hex (ej. #D8A7A0)'),
      categoria: z.string().optional().describe('Nombre de la categoría (ej. "labiales")'),
      soloConExistencias: z.boolean().optional().describe('true para mostrar solo tonos con piezas disponibles'),
    },
    annotations: SOLO_LECTURA,
  },
  seguro(async ({ texto: t, tono, categoria, soloConExistencias }) => {
    const { productos } = await publica(`{ productos { ${CAMPOS_PRODUCTO} } }`);
    const qt = normal(t);
    const qc = normal(categoria);
    const qTono = normal(tono);
    const esHex = /^#?[0-9a-f]{6}$/i.test(tono ?? '');
    const hex = esHex ? '#' + tono.replace('#', '').toUpperCase() : null;

    const resultado = productos
      .filter((p) => !qt || normal(p.nombre).includes(qt) || normal(p.marca.nombre).includes(qt))
      .filter((p) => !qc || normal(p.categoria.nombre).includes(qc))
      .map((p) => ({
        ...p,
        variantes: p.variantes.filter((v) => {
          const tonoOk = !qTono || (hex ? (v.codigoHex ?? '').toUpperCase() === hex : normal(v.tono).includes(qTono));
          const stockOk = !soloConExistencias || (v.inventario?.cantidad ?? 0) > 0;
          return tonoOk && stockOk;
        }),
      }))
      .filter((p) => p.variantes.length > 0);

    if (resultado.length === 0) return texto('No hay productos con esos filtros.');
    return texto(`${resultado.length} producto(s):\n\n${resultado.map(bloqueProducto).join('\n\n')}`);
  })
);

server.registerTool(
  'ver_producto',
  {
    title: 'Ver producto',
    description: 'Muestra un producto por su número (id): descripción, tonos, precio, existencias por tono e imágenes.',
    inputSchema: { id: z.string().describe('Número del producto, ej. "1"') },
    annotations: SOLO_LECTURA,
  },
  seguro(async ({ id }) => {
    const { producto: p } = await publica(`query ($id: ID!) { producto(id: $id) { ${CAMPOS_PRODUCTO} } }`, { id });
    if (!p) return texto(`No existe el producto ${id}.`);
    const principal = p.imagenes.find((i) => i.principal) ?? p.imagenes[0];
    return texto(
      [
        bloqueProducto(p),
        p.descripcion ? `Descripción: ${p.descripcion}` : '',
        principal ? `Imagen principal: ${principal.urlImagen}` : '',
        ...p.variantes.filter((v) => v.imagenUrl).map((v) => `Foto del tono ${v.tono}: ${v.imagenUrl}`),
      ]
        .filter(Boolean)
        .join('\n')
    );
  })
);

// ---------- BackOffice (ADMIN / OPERADOR) ----------

server.registerTool(
  'stock_bajo',
  {
    title: 'Tonos con stock bajo',
    description: 'Lista los tonos (variantes) con existencias en o por debajo del límite. Incluye productos desactivados si la cuenta es del personal.',
    inputSchema: {
      limite: z.number().int().min(0).max(1000).optional().describe('Piezas máximas para considerarlo bajo (por defecto 5)'),
    },
    annotations: SOLO_LECTURA,
  },
  seguro(async ({ limite = 5 }) => {
    const { productos } = await privada(`{ productos(incluirInactivos: true) { ${CAMPOS_PRODUCTO} } }`);
    const bajos = productos.flatMap((p) =>
      p.variantes
        .filter((v) => (v.inventario?.cantidad ?? 0) <= limite)
        .map((v) => ({ p, v, cantidad: v.inventario?.cantidad ?? 0 }))
    );
    if (bajos.length === 0) return texto(`Ningún tono tiene ${limite} piezas o menos.`);
    bajos.sort((a, b) => a.cantidad - b.cantidad);
    return texto(
      `${bajos.length} tono(s) con ${limite} piezas o menos:\n` +
        bajos
          .map(
            ({ p, v, cantidad }) =>
              `- ${p.nombre} · ${v.tono ?? 'Único'} · SKU ${v.sku} · ${cantidad === 0 ? 'AGOTADO' : cantidad + ' pzas'}`
          )
          .join('\n')
    );
  })
);

server.registerTool(
  'resumen_ventas',
  {
    title: 'Resumen de ventas',
    description: 'Ventas del día, la semana o el mes: total, pedidos, ticket promedio, cambio contra el periodo anterior y más vendidos. Solo ADMIN.',
    inputSchema: {
      periodo: z.enum(['DIA', 'SEMANA', 'MES']).optional().describe('DIA, SEMANA o MES (por defecto SEMANA)'),
    },
    annotations: SOLO_LECTURA,
  },
  seguro(async ({ periodo = 'SEMANA' }) => {
    const { resumenVentas: r } = await privada(
      `query ($p: PeriodoVentas!) {
         resumenVentas(periodo: $p) {
           ventasTotales numPedidos ticketPromedio piezasVendidas ventasPeriodoAnterior cambioPorcentual
           pedidosPendientes pedidosPorEnviar
           masVendidos { nombre piezas ingresos }
         }
       }`,
      { p: periodo }
    );
    const cambio =
      r.cambioPorcentual == null
        ? 'sin ventas en el periodo anterior'
        : `${r.cambioPorcentual >= 0 ? '+' : ''}${r.cambioPorcentual.toFixed(1)}% vs periodo anterior (${dinero(r.ventasPeriodoAnterior)})`;
    return texto(
      [
        `Resumen (${periodo}):`,
        `- Ventas: ${dinero(r.ventasTotales)} (${cambio})`,
        `- Pedidos pagados: ${r.numPedidos} · Ticket promedio: ${dinero(r.ticketPromedio)} · Piezas: ${r.piezasVendidas}`,
        `- Pendientes de pago: ${r.pedidosPendientes} · Por enviar: ${r.pedidosPorEnviar}`,
        'Más vendidos:',
        ...(r.masVendidos.length
          ? r.masVendidos.map((m, i) => `   ${i + 1}. ${m.nombre} · ${m.piezas} pzas · ${dinero(m.ingresos)}`)
          : ['   (sin ventas en el periodo)']),
      ].join('\n')
    );
  })
);

server.registerTool(
  'listar_pedidos',
  {
    title: 'Listar pedidos',
    description: 'Lista los pedidos de la tienda, opcionalmente por estado. Solo ADMIN y OPERADOR.',
    inputSchema: {
      estado: z.enum(['PENDIENTE', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO']).optional(),
      limite: z.number().int().min(1).max(100).optional().describe('Cuántos mostrar (por defecto 20, los más recientes)'),
    },
    annotations: SOLO_LECTURA,
  },
  seguro(async ({ estado, limite = 20 }) => {
    const { pedidos } = await privada(
      `query ($e: StatusPedido) { pedidos(estado: $e) { ${CAMPOS_PEDIDO} } }`,
      { e: estado ?? null }
    );
    if (pedidos.length === 0) return texto(`No hay pedidos${estado ? ' en estado ' + estado : ''}.`);
    const lista = [...pedidos].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, limite);
    return texto(
      `${pedidos.length} pedido(s)${estado ? ' en ' + estado : ''}; mostrando ${lista.length}:\n` +
        lista.map((p) => '- ' + resumenPedido(p)).join('\n')
    );
  })
);

server.registerTool(
  'detalle_pedido',
  {
    title: 'Detalle de pedido',
    description: 'Muestra un pedido: cliente, dirección, productos con tono, pago y a qué estados puede pasar.',
    inputSchema: { id: z.string().describe('Número del pedido') },
    annotations: SOLO_LECTURA,
  },
  seguro(async ({ id }) => {
    const { pedido } = await privada(`query ($id: ID!) { pedido(id: $id) { ${CAMPOS_PEDIDO} } }`, { id });
    if (!pedido) return texto(`No existe el pedido ${id} (o tu cuenta no puede verlo).`);
    return texto(detallePedido(pedido));
  })
);

server.registerTool(
  'cambiar_estado_pedido',
  {
    title: 'Cambiar estado de pedido',
    description:
      'Cambia el estado de un pedido (por ejemplo PAGADO -> ENVIADO). Solo se permiten los cambios válidos; ' +
      'un pedido PENDIENTE no se puede marcar como PAGADO a mano (eso lo hace el pago). Confirma con la persona antes de usarla.',
    inputSchema: {
      id: z.string().describe('Número del pedido'),
      estado: z.enum(['PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO']).describe('Nuevo estado'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  seguro(async ({ id, estado }) => {
    const { pedido } = await privada(`query ($id: ID!) { pedido(id: $id) { id estado estadosSiguientes } }`, { id });
    if (!pedido) return texto(`No existe el pedido ${id}.`);
    if (pedido.estado === estado) return texto(`El pedido #${id} ya está en ${estado}.`);
    if (!pedido.estadosSiguientes.includes(estado)) {
      return {
        ...texto(
          `No se puede pasar el pedido #${id} de ${pedido.estado} a ${estado}. ` +
            (pedido.estadosSiguientes.length
              ? `Desde ${pedido.estado} solo puede ir a: ${pedido.estadosSiguientes.join(', ')}.`
              : `${pedido.estado} es un estado final.`)
        ),
        isError: true,
      };
    }
    const { actualizarPedido: p } = await privada(
      `mutation ($id: ID!, $e: StatusPedido!) { actualizarPedido(id: $id, estado: $e) { ${CAMPOS_PEDIDO} } }`,
      { id, e: estado }
    );
    return texto(`Listo: el pedido #${id} pasó de ${pedido.estado} a ${p.estado}.\n\n${detallePedido(p)}`);
  })
);

server.registerTool(
  'actualizar_existencias',
  {
    title: 'Actualizar existencias de un tono',
    description:
      'Fija las existencias de un tono por su SKU (cada tono tiene su propio stock). ' +
      'Con "modo": "sumar" agrega piezas a lo que ya hay (ej. llegó mercancía). Confirma con la persona antes de usarla.',
    inputSchema: {
      sku: z.string().describe('SKU del tono, ej. LAB-ROJ-001'),
      cantidad: z.number().int().min(0).max(100000).describe('Piezas'),
      modo: z.enum(['fijar', 'sumar']).optional().describe('fijar (por defecto) reemplaza; sumar agrega'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  },
  seguro(async ({ sku, cantidad, modo = 'fijar' }) => {
    const { productos } = await privada(`{ productos(incluirInactivos: true) { ${CAMPOS_PRODUCTO} } }`);
    const buscado = normal(sku);
    let hallado = null;
    for (const p of productos) {
      const v = p.variantes.find((x) => normal(x.sku) === buscado);
      if (v) hallado = { p, v };
    }
    if (!hallado) return { ...texto(`No hay ningún tono con SKU ${sku}.`), isError: true };
    const { p, v } = hallado;
    if (!v.inventario?.id) return { ...texto(`El tono ${v.tono} (${v.sku}) no tiene registro de inventario.`), isError: true };

    const antes = v.inventario.cantidad;
    const nueva = modo === 'sumar' ? antes + cantidad : cantidad;
    await privada(`mutation ($id: ID!, $c: Int!) { actualizarInventario(id: $id, cantidad: $c) { id cantidad } }`, {
      id: v.inventario.id,
      c: nueva,
    });
    return texto(`Listo: ${p.nombre} · ${v.tono ?? 'Único'} (${v.sku}) pasó de ${antes} a ${nueva} piezas.`);
  })
);

// ---------- Cliente ----------

server.registerTool(
  'mis_pedidos',
  {
    title: 'Mis pedidos',
    description: 'Pedidos de la cuenta configurada en mcp/.env (sirve con cualquier rol, también CLIENTE).',
    inputSchema: {},
    annotations: SOLO_LECTURA,
  },
  seguro(async () => {
    const { misPedidos } = await privada(`{ misPedidos { ${CAMPOS_PEDIDO} } }`);
    if (misPedidos.length === 0) return texto(`${usuarioSesion?.nombre ?? 'La cuenta'} no tiene pedidos.`);
    return texto(misPedidos.map(detallePedido).join('\n\n'));
  })
);

server.registerTool(
  'quien_soy',
  {
    title: 'Cuenta conectada',
    description: 'Dice con qué cuenta y rol está conectado el servidor MCP (útil para saber qué herramientas puede usar).',
    inputSchema: {},
    annotations: SOLO_LECTURA,
  },
  seguro(async () => {
    if (!accessToken) await iniciarSesion();
    const u = usuarioSesion;
    return texto(`Conectado como ${u.nombre} (${u.correo}), rol ${u.rol.nombre}, a ${GRAPHQL_URL}.`);
  })
);

// ------------------------------------------------------------------
// Recursos (información que Claude puede leer como contexto)
// ------------------------------------------------------------------

server.registerResource(
  'catalogo',
  'nuve://catalogo',
  {
    title: 'Catálogo de Nuvé',
    description: 'Todos los productos activos con sus tonos, precios y existencias por tono.',
    mimeType: 'text/plain',
  },
  async (uri) => {
    const { productos } = await publica(`{ productos { ${CAMPOS_PRODUCTO} } }`);
    return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: productos.map(bloqueProducto).join('\n\n') }] };
  }
);

/** Convierte una página .astro de ayuda en texto plano (sin frontmatter ni etiquetas). */
async function paginaAyuda(archivo) {
  const ruta = path.join(AQUI, '..', 'front', 'src', 'pages', 'ayuda', archivo);
  const fuente = await readFile(ruta, 'utf8');
  return fuente
    .replace(/^---[\s\S]*?---/, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|h\d|li|tr|div|section)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/\{[^{}]*\}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

const AYUDA = [
  ['envios', 'envios.astro', 'Envíos y devoluciones'],
  ['terminos', 'terminos.astro', 'Términos y condiciones'],
  ['privacidad', 'privacidad.astro', 'Aviso de privacidad'],
  ['contacto', 'contacto.astro', 'Contacto'],
];

for (const [nombre, archivo, titulo] of AYUDA) {
  server.registerResource(
    `ayuda-${nombre}`,
    `nuve://ayuda/${nombre}`,
    { title: titulo, description: `${titulo} de la tienda (tomado de la página de ayuda).`, mimeType: 'text/plain' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/plain', text: await paginaAyuda(archivo) }] })
  );
}

// ------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[nuve-mcp] listo. API: ${GRAPHQL_URL}. Cuenta: ${CORREO ? 'configurada' : 'sin configurar (solo catálogo)'}`);
