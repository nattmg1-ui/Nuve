import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import './Panel.css';

Chart.register(...registerables);

interface PedidoVenta {
  fecha: string; // 'YYYY-MM-DD'
  total: number;
  estado: string;
}

/** Suma los totales por día, sin contar los pedidos CANCELADOS. */
function agruparPorDia(pedidos: PedidoVenta[]) {
  const porDia = new Map<string, number>();
  for (const p of pedidos) {
    if (p.estado === 'CANCELADO') continue;
    porDia.set(p.fecha, (porDia.get(p.fecha) ?? 0) + p.total);
  }
  const fechas = Array.from(porDia.keys()).sort();
  return { fechas, totales: fechas.map((f) => porDia.get(f) ?? 0) };
}

export default function VentasChart({ pedidos }: { pedidos: PedidoVenta[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const { fechas, totales } = agruparPorDia(pedidos);
  const ventasTotales = totales.reduce((acc, v) => acc + v, 0);
  const pedidosContados = pedidos.filter((p) => p.estado !== 'CANCELADO').length;

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: fechas,
        datasets: [
          {
            label: 'Ventas ($)',
            data: totales,
            borderColor: '#BE846A',
            backgroundColor: 'rgba(190, 132, 106, 0.15)',
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });

    return () => chartRef.current?.destroy();
  }, [fechas.join(','), totales.join(',')]);

  if (pedidos.length === 0) {
    return <p className="panel-intro">Aún no hay pedidos para graficar.</p>;
  }

  return (
    <div>
      <div className="panel-inline" style={{ gap: 24, marginBottom: 16 }}>
        <div>
          <p className="sidebar__title" style={{ marginBottom: 4 }}>
            Ventas totales
          </p>
          <p style={{ font: 'var(--text-h3)' }}>${ventasTotales.toFixed(2)}</p>
        </div>
        <div>
          <p className="sidebar__title" style={{ marginBottom: 4 }}>
            Pedidos (sin cancelados)
          </p>
          <p style={{ font: 'var(--text-h3)' }}>{pedidosContados}</p>
        </div>
      </div>
      <canvas ref={canvasRef} role="img" aria-label="Gráfica de ventas por día" />
    </div>
  );
}