import { useEffect, useRef, useState } from 'react';

// Pago con tarjeta de Mercado Pago (Checkout API + Card Payment Brick).
// El formulario lo dibuja Mercado Pago dentro de Nuvé. Los datos de la tarjeta
// nunca pasan por nuestro servidor: el Brick los convierte en un "token" de un
// solo uso, y con ese token el backend hace el cobro (POST /v1/orders).

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';

interface Props {
  pedidoId: string;
  total: number;
  publicKey: string;
  email: string;
}

type Estado = 'cargando' | 'listo' | 'procesando' | 'aprobado' | 'pendiente' | 'error-carga';

// Datos que entrega el Brick al dar clic en "Pagar"
interface DatosBrick {
  token: string;
  payment_method_id: string;
  installments: number;
  payer: { email: string; identification?: { type?: string; number?: string } };
}

declare global {
  interface Window {
    // SDK de Mercado Pago (se carga desde su servidor)
    MercadoPago?: new (publicKey: string, opciones?: { locale?: string }) => {
      bricks: () => { create: (tipo: string, contenedor: string, opciones: unknown) => Promise<{ unmount: () => void }> };
    };
  }
}

/** Carga el SDK de Mercado Pago una sola vez. */
function cargarSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const script = existente ?? document.createElement('script');
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('No se pudo cargar Mercado Pago.')));
    if (!existente) {
      script.src = SDK_URL;
      document.head.appendChild(script);
    }
  });
}

export default function PagoTarjeta({ pedidoId, total, publicKey, email }: Props) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const controlador = useRef<{ unmount: () => void } | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      if (!publicKey) {
        setEstado('error-carga');
        setError('Mercado Pago no está configurado (falta PUBLIC_MP_PUBLIC_KEY en el front).');
        return;
      }
      try {
        await cargarSdk();
        if (cancelado || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey, { locale: 'es-MX' });

        controlador.current = await mp.bricks().create('cardPayment', 'brick-tarjeta', {
          initialization: { amount: total, payer: { email } },
          customization: {
            paymentMethods: { maxInstallments: 1 }, // sin meses: un solo pago
            visual: { style: { theme: 'default' } },
          },
          callbacks: {
            onReady: () => !cancelado && setEstado('listo'),
            onError: (e: unknown) => console.error('[Mercado Pago]', e),
            // Al dar clic en "Pagar": se manda el token a nuestro backend.
            // Si se rechaza el Promise, el Brick deja corregir e intentar de nuevo.
            onSubmit: (datos: DatosBrick, extra?: { paymentTypeId?: string }) =>
              pagar(datos, extra?.paymentTypeId),
          },
        });
      } catch (e) {
        if (!cancelado) {
          setEstado('error-carga');
          setError(e instanceof Error ? e.message : 'No se pudo cargar el formulario de pago.');
        }
      }
    }

    void iniciar();
    return () => {
      cancelado = true;
      controlador.current?.unmount();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, total]);

  async function pagar(datos: DatosBrick, tipoPago?: string) {
    setError(null);
    setEstado('procesando');
    const respuesta = await fetch('/api/pago/tarjeta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pedidoId,
        token: datos.token,
        metodoPagoId: datos.payment_method_id,
        tipoPago: tipoPago ?? 'credit_card',
        cuotas: Number(datos.installments) || 1,
        email: datos.payer?.email ?? email,
        tipoIdentificacion: datos.payer?.identification?.type,
        numeroIdentificacion: datos.payer?.identification?.number,
      }),
    }).catch(() => null);

    const resultado = respuesta ? await respuesta.json().catch(() => null) : null;

    if (resultado?.resultado === 'APROBADO' || resultado?.resultado === 'PENDIENTE') {
      setMensaje(resultado.mensaje);
      setEstado(resultado.resultado === 'APROBADO' ? 'aprobado' : 'pendiente');
      // Se quita el formulario después de que el Brick termine su animación
      setTimeout(() => {
        controlador.current?.unmount();
        controlador.current = null;
      }, 0);
      return;
    }
    setEstado('listo');
    setError(resultado?.mensaje ?? resultado?.error ?? 'No se pudo procesar el pago. Intenta de nuevo.');
    throw new Error('pago rechazado'); // el Brick vuelve a habilitar el botón
  }

  const terminado = estado === 'aprobado' || estado === 'pendiente';
  const aprobado = estado === 'aprobado';

  return (
    <div className="pago-tarjeta">
      {terminado && (
        <section
          className={`pago-resultado ${aprobado ? 'pago-resultado--aprobado' : 'pago-resultado--pendiente'}`}
          role="status"
        >
          <p className="pago-resultado__estado">{aprobado ? 'Pago aprobado' : 'Pago en revisión'}</p>
          <h2>{aprobado ? '¡Gracias por tu compra!' : 'Estamos confirmando tu pago'}</h2>
          <p>{mensaje}</p>
          <div className="pago-acciones">
            <a className="btn btn-primary" href="/mi-cuenta">
              Ver mis pedidos
            </a>
            <a className="btn btn-secondary" href="/">
              Seguir comprando
            </a>
          </div>
        </section>
      )}
      {estado === 'cargando' && <p className="pago-nota">Cargando el formulario de pago…</p>}
      {estado === 'procesando' && <p className="pago-nota">Procesando el pago, no cierres esta página…</p>}
      {error && !terminado && (
        <div className="aviso aviso--error" role="alert">
          {error}
        </div>
      )}
      {/* Aquí Mercado Pago dibuja el formulario de tarjeta */}
      <div id="brick-tarjeta" hidden={terminado} />

      {/* Otra opción: PayPal (redirección a la página de PayPal) */}
      {!terminado && estado !== 'procesando' && (
        <form className="pago-otro" method="post" action="/api/pago/iniciar">
          <input type="hidden" name="pedidoId" value={pedidoId} />
          <span>¿Prefieres PayPal?</span>
          <button className="btn btn-secondary" type="submit" name="metodo" value="PAYPAL">
            Pagar con PayPal
          </button>
        </form>
      )}
    </div>
  );
}