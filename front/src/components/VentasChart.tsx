import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Gráfica de ventas del Resumen. Recibe la serie ya calculada por el backend
// (una barra por hora o por día) y la dibuja con Chart.js.

export interface PuntoVenta {
  etiqueta: string;
  total: number;
  pedidos: number;
}

interface Props {
  serie: PuntoVenta[];
  /** Texto del eje X, por ejemplo "Hora" o "Día" */
  ejeX: string;
}

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const pesosExactos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

// Colores de la marca, ajustados para que la barra se distinga del fondo en
// modo claro y en modo oscuro. El texto y la cuadrícula salen de theme.css.
function colores() {
  const css = getComputedStyle(document.documentElement);
  const oscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    barra: oscuro ? '#D9845A' : '#C2704C',
    barraHover: oscuro ? '#E6956C' : '#A85E3D',
    texto: css.getPropertyValue('--color-texto-secundario').trim() || '#6B5F58',
    linea: css.getPropertyValue('--color-borde').trim() || '#E5DAD1',
  };
}

export default function VentasChart({ serie, ejeX }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const c = colores();

    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: serie.map((p) => p.etiqueta),
        datasets: [
          {
            label: 'Ventas',
            data: serie.map((p) => p.total),
            backgroundColor: c.barra,
            hoverBackgroundColor: c.barraHover,
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: 'bottom',
            maxBarThickness: 28,
            categoryPercentage: 0.8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: (items) => `${ejeX}: ${items[0].label}`,
              label: (item) => {
                const punto = serie[item.dataIndex];
                return [
                  `Ventas: ${pesosExactos.format(punto.total)}`,
                  `Pedidos: ${punto.pedidos}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: c.linea },
            ticks: { color: c.texto, maxRotation: 0, autoSkip: true, autoSkipPadding: 12 },
            title: { display: true, text: ejeX, color: c.texto },
          },
          y: {
            beginAtZero: true,
            grid: { color: c.linea },
            border: { display: false },
            ticks: { color: c.texto, maxTicksLimit: 6, callback: (v) => pesos.format(Number(v)) },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [serie, ejeX]);

  return (
    <div className="ventas-grafica">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Gráfica de ventas por ${ejeX.toLowerCase()}. El detalle está en la tabla de abajo.`}
      />
    </div>
  );
}