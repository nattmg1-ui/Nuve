// back/src/reportes/ventas.js
// Resumen de ventas para el panel de administración.
//
// Periodos (en hora de la Ciudad de México):
//   DIA    -> hoy, de 00:00 a 23:59, agrupado por hora
//   SEMANA -> últimos 7 días contando hoy, agrupado por día
//   MES    -> últimos 30 días contando hoy, agrupado por día
//
// Solo cuentan como venta los pedidos PAGADO, ENVIADO y ENTREGADO.
// Los PENDIENTE todavía no se cobran y los CANCELADO no se cobraron.

import { query } from '../db.js';

const ZONA = 'America/Mexico_City';
const ESTADOS_VENTA = ['PAGADO', 'ENVIADO', 'ENTREGADO'];

// Valores fijos por periodo (nunca vienen del usuario, así que se pueden
// insertar en el SQL sin riesgo de inyección).
const PERIODOS = {
  DIA: { dias: 1, unidad: 'hour', paso: '1 hour', formato: 'HH24:00' },
  SEMANA: { dias: 7, unidad: 'day', paso: '1 day', formato: 'DD/MM' },
  MES: { dias: 30, unidad: 'day', paso: '1 day', formato: 'DD/MM' },
};

const num = (v) => Number(v ?? 0);

export async function resumenVentas(periodo) {
  const p = PERIODOS[periodo];
  if (!p) throw new Error('Periodo inválido.');

  // Rango [inicio, fin) en hora local. "fin" es mañana a las 00:00.
  const RANGO = `
    WITH hoy AS (SELECT date_trunc('day', NOW() AT TIME ZONE '${ZONA}') AS d),
    rango AS (
      SELECT d - INTERVAL '${p.dias - 1} days' AS inicio,
             d + INTERVAL '1 day' AS fin,
             d - INTERVAL '${2 * p.dias - 1} days' AS inicio_anterior
      FROM hoy
    )`;

  // Fecha local de cada pedido, para comparar contra el rango
  const LOCAL = `(pe.fecha AT TIME ZONE '${ZONA}')`;

  const [totales, anterior, serie, masVendidos, porEstado] = await Promise.all([
    query(
      `${RANGO}
       SELECT COALESCE(SUM(pe.total), 0) AS ventas,
              COUNT(*) AS pedidos,
              COALESCE(SUM((SELECT SUM(d.cantidad) FROM detalle_pedido d WHERE d.pedido_id = pe.id)), 0) AS piezas
       FROM pedido pe, rango r
       WHERE pe.estado = ANY($1) AND ${LOCAL} >= r.inicio AND ${LOCAL} < r.fin`,
      [ESTADOS_VENTA]
    ),
    query(
      `${RANGO}
       SELECT COALESCE(SUM(pe.total), 0) AS ventas
       FROM pedido pe, rango r
       WHERE pe.estado = ANY($1) AND ${LOCAL} >= r.inicio_anterior AND ${LOCAL} < r.inicio`,
      [ESTADOS_VENTA]
    ),
    // Una fila por hora o por día, aunque no haya ventas (para que la gráfica no tenga huecos)
    query(
      `${RANGO},
       cubetas AS (
         SELECT generate_series(r.inicio, r.fin - INTERVAL '${p.paso}', INTERVAL '${p.paso}') AS t FROM rango r
       )
       SELECT to_char(c.t, '${p.formato}') AS etiqueta,
              COALESCE(SUM(pe.total), 0) AS total,
              COUNT(pe.id) AS pedidos
       FROM cubetas c
       LEFT JOIN pedido pe
         ON date_trunc('${p.unidad}', ${LOCAL}) = c.t AND pe.estado = ANY($1)
       GROUP BY c.t
       ORDER BY c.t`,
      [ESTADOS_VENTA]
    ),
    query(
      `${RANGO}
       SELECT pr.id, pr.nombre, SUM(d.cantidad) AS piezas, SUM(d.subtotal) AS ingresos
       FROM pedido pe
       JOIN rango r ON TRUE
       JOIN detalle_pedido d ON d.pedido_id = pe.id
       JOIN variante_producto v ON v.id = d.variante_id
       JOIN producto pr ON pr.id = v.producto_id
       WHERE pe.estado = ANY($1) AND ${LOCAL} >= r.inicio AND ${LOCAL} < r.fin
       GROUP BY pr.id, pr.nombre
       ORDER BY piezas DESC, ingresos DESC
       LIMIT 5`,
      [ESTADOS_VENTA]
    ),
    // Pedidos que requieren atención, sin importar el periodo
    query(`SELECT estado, COUNT(*) AS cantidad FROM pedido WHERE estado IN ('PENDIENTE', 'PAGADO') GROUP BY estado`),
  ]);

  const ventas = num(totales.rows[0].ventas);
  const pedidos = num(totales.rows[0].pedidos);
  const ventasAnterior = num(anterior.rows[0].ventas);
  const contar = (estado) => num(porEstado.rows.find((f) => f.estado === estado)?.cantidad);

  return {
    periodo,
    ventasTotales: ventas,
    numPedidos: pedidos,
    ticketPromedio: pedidos ? Math.round((ventas / pedidos) * 100) / 100 : 0,
    piezasVendidas: num(totales.rows[0].piezas),
    ventasPeriodoAnterior: ventasAnterior,
    // null cuando no hubo ventas en el periodo anterior (no se puede calcular un %)
    cambioPorcentual: ventasAnterior > 0 ? Math.round(((ventas - ventasAnterior) / ventasAnterior) * 1000) / 10 : null,
    pedidosPendientes: contar('PENDIENTE'),
    pedidosPorEnviar: contar('PAGADO'),
    serie: serie.rows.map((f) => ({ etiqueta: f.etiqueta, total: num(f.total), pedidos: num(f.pedidos) })),
    masVendidos: masVendidos.rows.map((f) => ({
      productoId: String(f.id),
      nombre: f.nombre,
      piezas: num(f.piezas),
      ingresos: num(f.ingresos),
    })),
  };
}