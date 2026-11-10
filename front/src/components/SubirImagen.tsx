// front/src/components/SubirImagen.tsx
// API externa de imágenes: Cloudinary.
// Botón "Subir foto": el admin elige una imagen de su computadora, se sube DIRECTO
// a Cloudinary (con una firma que genera el backend) y se devuelve la URL ya
// optimizada (formato y calidad automáticos), lista para guardarse en el producto.
import { useRef, useState } from 'react';

interface Firma {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  carpeta: string;
  firma: string;
  urlSubida: string;
}

const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB

/** Agrega a la URL de Cloudinary: formato y calidad automáticos y máximo 1200 px de ancho. */
const optimizar = (url: string) => url.replace('/image/upload/', '/image/upload/f_auto,q_auto,c_limit,w_1200/');

interface Props {
  /** Se llama con la URL de la imagen ya subida. */
  onSubida: (url: string) => void;
  /** Texto accesible del botón, por ejemplo "Subir foto del tono Rojo". */
  etiqueta?: string;
}

export default function SubirImagen({ onSubida, etiqueta = 'Subir foto' }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(archivo: File) {
    setError(null);
    if (!archivo.type.startsWith('image/')) return setError('El archivo debe ser una imagen (JPG, PNG o WebP).');
    if (archivo.size > TAMANO_MAXIMO) return setError('La imagen pesa más de 5 MB.');

    setSubiendo(true);
    try {
      // 1. El backend firma la subida (solo ADMIN)
      const r = await fetch('/api/admin/firma-imagen', { method: 'POST' });
      const firma = (await r.json()) as Firma & { error?: string };
      if (!r.ok || firma.error) throw new Error(firma.error ?? 'No se pudo preparar la subida.');

      // 2. El navegador sube el archivo a Cloudinary
      const datos = new FormData();
      datos.append('file', archivo);
      datos.append('api_key', firma.apiKey);
      datos.append('timestamp', String(firma.timestamp));
      datos.append('folder', firma.carpeta);
      datos.append('signature', firma.firma);
      const subida = await fetch(firma.urlSubida, { method: 'POST', body: datos });
      const resultado = await subida.json();
      if (!subida.ok || !resultado.secure_url) {
        throw new Error(resultado.error?.message ?? 'Cloudinary no aceptó la imagen.');
      }

      // 3. Se usa la URL optimizada
      onSubida(optimizar(resultado.secure_url));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.');
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = '';
    }
  }

  return (
    <span className="subir-imagen">
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) void subir(archivo);
        }}
      />
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => entrada.current?.click()}
        disabled={subiendo}
        aria-label={etiqueta}
      >
        {subiendo ? 'Subiendo...' : 'Subir foto'}
      </button>
      {error && (
        <span className="pf__ayuda" role="alert" style={{ margin: 0, color: 'var(--color-warning)' }}>
          {error}
        </span>
      )}
    </span>
  );
}
