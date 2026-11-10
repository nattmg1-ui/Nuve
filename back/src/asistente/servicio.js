// back/src/asistente/servicio.js
// Asistentes con inteligencia artificial (API de Gemini):
//
// 1. pedirRecomendacion (clientes con sesión): el cliente describe lo que busca y
//    el asistente recomienda productos y tonos DEL CATÁLOGO con existencias.
//    Gemini solo devuelve ids; aquí se comprueba que cada tono exista, esté activo
//    y tenga stock, y los datos que ve el cliente (nombre, precio, foto) salen de la
//    base, no de la IA. Así nunca se recomienda algo inventado o agotado.
//
// 2. preguntarReportes (solo ADMIN, Módulo 8 de la propuesta): responde preguntas
//    sobre ventas, inventario y pedidos usando ÚNICAMENTE los datos de la base.
//    Solo se mandan números agregados (sin nombres, correos ni direcciones).
import { query } from '../db.js';
import { datosInvalidos } from '../auth/errores.js';
import { GraphQLError } from 'graphql';
import { preguntarGemini } from '../integraciones/gemini.js';
import { resumenVentas } from '../reportes/ventas.js';

const MAX_MENSAJE = 500;
const MAX_HISTORIAL = 10;
const MAX_TEXTO_HISTORIAL = 2000;

// ---------- Límite de uso (protege la cuota gratis de Gemini) ----------
const LIMITE_POR_HORA = Number(process.env.ASISTENTE_LIMITE_HORA) || 20;
const usos = new Map(); // usuarioId -> [timestamps]

function revisarLimite(usuarioId) {
  const ahora = Date.now();
  const recientes = (usos.get(usuarioId) ?? []).filter((t) => ahora - t < 60 * 60 * 1000);
  if (recientes.length >= LIMITE_POR_HORA) {
    const minutos = Math.ceil((60 * 60 * 1000 - (ahora - recientes[0])) / 60000);
    throw new GraphQLError(
      `Llegaste al límite de ${LIMITE_POR_HORA} preguntas por hora. Intenta de nuevo en ${minutos} min.`,
      { extensions: { code: 'LIMITE_ALCANZADO' } }
    );
  }
  recientes.push(ahora);
  usos.set(usuarioId, recientes);
}

function limpiarEntrada(mensaje, historial) {
  const m = String(mensaje ?? '').trim();
  if (!m) throw datosInvalidos('Escribe tu pregunta.');
  if (m.length > MAX_MENSAJE) throw datosInvalidos(`La pregunta es muy larga (máximo ${MAX_MENSAJE} caracteres).`);
  const h = (historial ?? [])
    .slice(-MAX_HISTORIAL)
    .map((x) => ({ rol: x.rol === 'ASISTENTE' ? 'ASISTENTE' : 'USUARIO', texto: String(x.texto ?? '').slice(0, MAX_TEXTO_HISTORIAL) }))
    .filter((x) => x.texto.trim());
  // Gemini espera que la conversación empiece con el usuario
  while (h.length && h[0].rol !== 'USUARIO') h.shift();
  return { mensaje: m, historial: h };
}

/** Lee JSON aunque venga envuelto en ```json ... ```. */
function leerJson(texto) {
  const limpio = texto.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(limpio);
  } catch {
    const i = limpio.indexOf('{');
    const j = limpio.lastIndexOf('}');
    if (i >= 0 && j > i) {
      try {
        return JSON.parse(limpio.slice(i, j + 1));
      } catch {
        /* sigue abajo */
      }
    }
    return null;
  }
}

const dinero = (n) => `$${Number(n).toFixed(2)}`;

// =====================================================================
// 1. Recomendaciones para el cliente
// =====================================================================

async function catalogoConStock() {
  const { rows } = await query(
    `SELECT p.id AS producto_id, p.nombre, p.descripcion, m.nombre AS marca, c.nombre AS categoria,
            v.id AS variante_id, v.tono, v.codigo_hex, v.presentacion, v.precio, v.imagen_url,
            COALESCE(i.cantidad, 0) AS cantidad,
            (SELECT url_imagen FROM imagen_producto ip WHERE ip.producto_id = p.id
             ORDER BY ip.principal DESC, ip.id LIMIT 1) AS imagen_principal
     FROM producto p
     JOIN marca m ON m.id = p.marca_id
     JOIN categoria c ON c.id = p.categoria_id
     JOIN variante_producto v ON v.producto_id = p.id AND v.activo = TRUE
     LEFT JOIN inventario i ON i.variante_id = v.id
     WHERE p.activo = TRUE AND COALESCE(i.cantidad, 0) > 0
     ORDER BY c.nombre, p.nombre, v.id`
  );
  return rows;
}

/** Revuelve una lista (para que la IA no elija siempre los primeros productos). */
function revolver(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function textoCatalogo(filas) {
  // Agrupado por producto para que Gemini lo entienda fácil
  const productos = new Map();
  for (const f of filas) {
    if (!productos.has(f.producto_id)) productos.set(f.producto_id, { ...f, variantes: [] });
    productos.get(f.producto_id).variantes.push(f);
  }
  // En otro orden en cada pregunta: así no siempre salen los mismos
  return revolver([...productos.values()])
    .map((p) =>
      [
        `PRODUCTO ${p.producto_id}: ${p.nombre} | Marca: ${p.marca} | Categoría: ${p.categoria}`,
        p.descripcion ? `  Descripción: ${String(p.descripcion).slice(0, 250)}` : null,
        ...p.variantes.map(
          (v) =>
            `  - varianteId ${v.variante_id}: tono "${v.tono ?? 'Único'}"${v.codigo_hex ? ` (${v.codigo_hex})` : ''}${v.presentacion ? `, ${v.presentacion}` : ''}, precio ${dinero(v.precio)} MXN`
        ),
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n');
}

const REGLAS_RECOMENDACION = `Eres "Asesora Nuvé", asistente de compras de Nuvé, una tienda en línea de maquillaje inclusivo en México.
Ayudas al cliente a elegir productos y tonos SOLO del catálogo que aparece abajo (todos tienen existencias).

Reglas:
- Recomienda de 1 a 3 tonos del catálogo. Usa únicamente los varianteId que aparecen en el catálogo. Nunca inventes productos, marcas, tonos ni precios.
- Si nada del catálogo encaja, dilo con honestidad y sugiere lo más cercano o pide un dato más.
- No puedes ver al cliente: si pregunta qué tono le queda, guíate por lo que él describe (tono de piel, subtono, ocasión, acabado) y recuérdale que puede filtrar por tono en el catálogo.
- No des consejos médicos ni dermatológicos. Si menciona alergias, irritación o una condición de la piel, recomiéndale consultar a un especialista y revisar los ingredientes.
- Si la pregunta no tiene que ver con maquillaje o con la tienda, responde amablemente que solo puedes ayudar con productos de Nuvé.
- Responde en español de México, cálido y breve (máximo 80 palabras en "respuesta"). No uses emojis.
- Varía tu forma de responder: no empieces siempre igual ni repitas frases de tus respuestas anteriores. Menciona algo concreto de lo que pidió el cliente (acabado, ocasión, presupuesto, tono de piel).
- En la conversación, tus mensajes anteriores indican entre corchetes qué tonos ya recomendaste. No vuelvas a recomendar esos mismos tonos salvo que el cliente lo pida; ofrece alternativas diferentes (otra marca, otro acabado, otra categoría que combine). Si ya no hay más opciones que encajen, dilo.
- Si la petición es muy general (por ejemplo "recomiéndame algo"), haz una sola pregunta corta para entender mejor (tipo de producto, ocasión o tono de piel) y recomienda como máximo 1 opción mientras tanto.
- Los precios son en pesos mexicanos (MXN).

Responde SOLO con un objeto JSON con esta forma exacta:
{"respuesta": "texto para el cliente", "recomendaciones": [{"varianteId": "id del catálogo", "motivo": "por qué se lo recomiendas, máximo 20 palabras"}]}
Si no recomiendas nada, usa "recomendaciones": [].`;

export async function pedirRecomendacion(ctx, { mensaje, historial }) {
  const entrada = limpiarEntrada(mensaje, historial);
  revisarLimite(`cliente:${ctx.usuario.id}`);

  const filas = await catalogoConStock();
  if (filas.length === 0) {
    return { respuesta: 'Por ahora no hay productos con existencias para recomendarte. Vuelve pronto.', recomendaciones: [] };
  }

  const texto = await preguntarGemini({
    sistema: `${REGLAS_RECOMENDACION}\n\nCATÁLOGO DISPONIBLE:\n${textoCatalogo(filas)}`,
    historial: entrada.historial,
    mensaje: entrada.mensaje,
    json: true,
    // Más variedad en las recomendaciones; los reportes se quedan en 0.4 para no inventar cifras
    temperatura: 0.9,
  });

  const datos = leerJson(texto);
  if (!datos || typeof datos.respuesta !== 'string') {
    // Si la IA no respetó el formato, al menos se muestra su texto
    return { respuesta: texto.slice(0, 1200), recomendaciones: [] };
  }

  // Solo se aceptan ids que existen en el catálogo con stock (sin repetir, máximo 3)
  const porVariante = new Map(filas.map((f) => [String(f.variante_id), f]));
  const vistas = new Set();
  const recomendaciones = [];
  for (const r of Array.isArray(datos.recomendaciones) ? datos.recomendaciones : []) {
    const f = porVariante.get(String(r?.varianteId ?? '').trim());
    if (!f || vistas.has(f.variante_id) || recomendaciones.length >= 3) continue;
    vistas.add(f.variante_id);
    recomendaciones.push({
      productoId: String(f.producto_id),
      varianteId: String(f.variante_id),
      nombre: f.nombre,
      marca: f.marca,
      tono: f.tono,
      codigoHex: f.codigo_hex,
      precio: Number(f.precio),
      imagenUrl: f.imagen_url || f.imagen_principal || null,
      motivo: typeof r.motivo === 'string' ? r.motivo.slice(0, 200) : null,
    });
  }

  return { respuesta: datos.respuesta.slice(0, 1200), recomendaciones };
}

// =====================================================================
// 2. Asistente de reportes para el administrador (Módulo 8)
// =====================================================================

const NOMBRE_PERIODO = { DIA: 'Hoy', SEMANA: 'Últimos 7 días', MES: 'Últimos 30 días' };

function textoResumen(periodo, r) {
  const cambio =
    r.cambioPorcentual == null ? 'sin ventas en el periodo anterior' : `${r.cambioPorcentual >= 0 ? '+' : ''}${r.cambioPorcentual.toFixed(1)}% vs periodo anterior`;
  return [
    `${NOMBRE_PERIODO[periodo]}: ventas ${dinero(r.ventasTotales)} (${cambio}; periodo anterior ${dinero(r.ventasPeriodoAnterior)}), ` +
      `${r.numPedidos} pedidos pagados, ticket promedio ${dinero(r.ticketPromedio)}, ${r.piezasVendidas} piezas.`,
    `  Más vendidos: ${r.masVendidos.length ? r.masVendidos.map((m) => `${m.nombre} (${m.piezas} pzas, ${dinero(m.ingresos)})`).join('; ') : 'ninguno'}`,
  ].join('\n');
}

async function datosParaReportes() {
  const [dia, semana, mes] = await Promise.all(['DIA', 'SEMANA', 'MES'].map((p) => resumenVentas(p)));

  const { rows: inventario } = await query(
    `SELECT p.nombre, p.activo AS producto_activo, c.nombre AS categoria, v.tono, v.sku, v.precio,
            COALESCE(i.cantidad, 0) AS cantidad
     FROM variante_producto v
     JOIN producto p ON p.id = v.producto_id
     JOIN categoria c ON c.id = p.categoria_id
     LEFT JOIN inventario i ON i.variante_id = v.id
     WHERE v.activo = TRUE
     ORDER BY COALESCE(i.cantidad, 0), p.nombre`
  );

  const { rows: estados } = await query(`SELECT estado, COUNT(*)::int AS n, COALESCE(SUM(total), 0) AS total FROM pedido GROUP BY estado ORDER BY estado`);

  // Ventas por tono y por categoría en los últimos 90 días (solo pedidos cobrados)
  const { rows: porTono } = await query(
    `SELECT p.nombre, v.tono, c.nombre AS categoria, SUM(d.cantidad)::int AS piezas, SUM(d.subtotal) AS ingresos
     FROM detalle_pedido d
     JOIN pedido pe ON pe.id = d.pedido_id
     JOIN variante_producto v ON v.id = d.variante_id
     JOIN producto p ON p.id = v.producto_id
     JOIN categoria c ON c.id = p.categoria_id
     WHERE pe.estado IN ('PAGADO', 'ENVIADO', 'ENTREGADO') AND pe.fecha >= NOW() - INTERVAL '90 days'
     GROUP BY p.nombre, v.tono, c.nombre
     ORDER BY piezas DESC`
  );

  const { rows: clientes } = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE fecha_registro >= NOW() - INTERVAL '30 days')::int AS nuevos_30d
     FROM usuario u JOIN rol r ON r.id = u.rol_id WHERE r.nombre = 'CLIENTE'`
  ).catch(() => ({ rows: [] }));

  return [
    `Fecha y hora actual (Ciudad de México): ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
    '',
    'VENTAS (solo pedidos PAGADO, ENVIADO o ENTREGADO):',
    textoResumen('DIA', dia),
    textoResumen('SEMANA', semana),
    textoResumen('MES', mes),
    '',
    'VENTAS POR PRODUCTO Y TONO, ÚLTIMOS 90 DÍAS:',
    ...(porTono.length
      ? porTono.map((t) => `- ${t.nombre} | tono ${t.tono ?? 'Único'} | ${t.categoria} | ${t.piezas} pzas | ${dinero(t.ingresos)}`)
      : ['- Sin ventas en los últimos 90 días']),
    '',
    'PEDIDOS POR ESTADO (todos los tiempos):',
    ...estados.map((e) => `- ${e.estado}: ${e.n} pedidos, ${dinero(e.total)}`),
    '',
    'INVENTARIO POR TONO (de menos a más existencias):',
    ...inventario.map(
      (i) =>
        `- ${i.nombre}${i.producto_activo ? '' : ' (producto desactivado)'} | ${i.categoria} | tono ${i.tono ?? 'Único'} | SKU ${i.sku} | ${dinero(i.precio)} | ${i.cantidad} pzas`
    ),
    '',
    clientes[0] ? `CLIENTES: ${clientes[0].total} registrados, ${clientes[0].nuevos_30d} nuevos en los últimos 30 días.` : '',
  ].join('\n');
}

const REGLAS_REPORTES = `Eres el asistente de reportes del panel de administración de Nuvé (tienda de maquillaje en México).
Respondes preguntas del administrador sobre ventas, productos, inventario y pedidos.

Reglas:
- Usa EXCLUSIVAMENTE los datos de abajo. No inventes cifras ni supongas datos que no están. Si algo no se puede responder con estos datos, dilo y explica qué dato faltaría.
- Si haces cálculos (sumas, porcentajes, promedios), hazlos con cuidado y muestra el resultado claro.
- Puedes dar recomendaciones (por ejemplo, qué resurtir), pero basadas en los datos y aclarando que son sugerencias.
- Responde en español, claro y ordenado. Usa listas con guiones "-" cuando ayuden. No uses tablas, encabezados con #, negritas con asteriscos ni emojis.
- Los montos son en pesos mexicanos (MXN).`;

export async function preguntarReportes(ctx, { mensaje, historial }) {
  const entrada = limpiarEntrada(mensaje, historial);
  revisarLimite(`admin:${ctx.usuario.id}`);

  const datos = await datosParaReportes();
  const respuesta = await preguntarGemini({
    sistema: `${REGLAS_REPORTES}\n\nDATOS ACTUALES DE LA TIENDA:\n${datos}`,
    historial: entrada.historial,
    mensaje: entrada.mensaje,
  });
  return { respuesta: respuesta.replace(/\*\*/g, '').slice(0, 4000) };
}
