// front/src/components/BuscadorDireccion.tsx
// API de ubicación con OpenStreetMap (sin cuenta ni llave):
//  - Photon (photon.komoot.io): autocompletado de direcciones con datos de OpenStreetMap.
//  - Leaflet + mosaicos de OpenStreetMap: mapa con un marcador que se puede mover.
// Al elegir una sugerencia se llenan los campos del formulario de dirección
// (calle, número, colonia, CP, ciudad, estado) y se guardan latitud y longitud.
import { useEffect, useRef, useState } from 'react';
import type { Map as MapaLeaflet, Marker } from 'leaflet';
import { ESTADOS_MX } from '../lib/estadosMx';
import 'leaflet/dist/leaflet.css';

const PHOTON_URL = 'https://photon.komoot.io';
// Rectángulo que cubre México (oeste, sur, este, norte) para no sugerir otros países
const BBOX_MEXICO = '-118.6,14.4,-86.5,32.8';
// Centro de México para el mapa vacío
const CENTRO_MX: [number, number] = [23.6, -102.5];

interface Lugar {
  etiqueta: string;
  calle: string;
  numero: string;
  colonia: string;
  codigoPostal: string;
  ciudad: string;
  estado: string;
  lat: number;
  lon: number;
}

interface PropiedadesPhoton {
  name?: string;
  street?: string;
  housenumber?: string;
  district?: string;
  locality?: string;
  postcode?: string;
  city?: string;
  county?: string;
  state?: string;
  countrycode?: string;
  osm_value?: string;
}

const normal = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Convierte el estado de OpenStreetMap ("Jalisco", "CDMX", "México") a la lista que valida el backend. */
function estadoValido(estado: string | undefined): string {
  if (!estado) return '';
  const e = normal(estado);
  if (e === 'mexico' || e === 'estado de mexico') return 'Estado de México';
  if (e.includes('ciudad de mexico') || e === 'cdmx' || e === 'distrito federal') return 'Ciudad de México';
  if (e.startsWith('coahuila')) return 'Coahuila';
  if (e.startsWith('michoacan')) return 'Michoacán';
  if (e.startsWith('veracruz')) return 'Veracruz';
  return ESTADOS_MX.find((x) => normal(x) === e) ?? '';
}

function aLugar(f: { geometry: { coordinates: [number, number] }; properties: PropiedadesPhoton }): Lugar | null {
  const p = f.properties;
  if (p.countrycode && p.countrycode !== 'MX') return null;
  const [lon, lat] = f.geometry.coordinates;
  // Si el resultado es una calle, el nombre ES la calle; si es un lugar, la calle viene aparte
  const esCalle = !!p.osm_value && /road|street|residential|primary|secondary|tertiary|living_street/.test(p.osm_value);
  const calle = p.street ?? (esCalle ? p.name ?? '' : '');
  const ciudad = p.city ?? p.county ?? p.locality ?? '';
  const colonia = p.district ?? p.locality ?? '';
  const partes = [
    p.name && p.name !== calle ? p.name : null,
    calle ? `${calle}${p.housenumber ? ' ' + p.housenumber : ''}` : null,
    colonia || null,
    p.postcode ? `CP ${p.postcode}` : null,
    ciudad || null,
    p.state ?? null,
  ].filter(Boolean);
  return {
    etiqueta: partes.join(', '),
    calle: calle ?? '',
    numero: p.housenumber ?? '',
    colonia: colonia === ciudad ? '' : colonia,
    codigoPostal: /^\d{5}$/.test(p.postcode ?? '') ? (p.postcode as string) : '',
    ciudad,
    estado: estadoValido(p.state),
    lat,
    lon,
  };
}

interface Props {
  /** Formulario de dirección cuyos campos se llenan al elegir una sugerencia. */
  formulario: () => HTMLFormElement | null;
}

export default function BuscadorDireccion({ formulario }: Props) {
  const [texto, setTexto] = useState('');
  const [sugerencias, setSugerencias] = useState<Lugar[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lon: number } | null>(null);
  const [activo, setActivo] = useState(-1);

  const contenedorMapa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const marcador = useRef<Marker | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  // Al elegir una sugerencia el texto cambia, pero no hay que volver a buscar
  const omitirBusqueda = useRef(false);

  // Crea el mapa (Leaflet solo funciona en el navegador, por eso se importa aquí)
  useEffect(() => {
    let cancelado = false;
    import('leaflet').then((L) => {
      if (cancelado || !contenedorMapa.current || mapa.current) return;
      leaflet.current = L;
      const m = L.map(contenedorMapa.current, { scrollWheelZoom: false }).setView(CENTRO_MX, 4);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      // Clic en el mapa: mueve el marcador a ese punto (para ajustar la ubicación exacta)
      m.on('click', (e) => colocarMarcador(e.latlng.lat, e.latlng.lng, false));
      mapa.current = m;
    });
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  function colocarMarcador(lat: number, lon: number, centrar = true) {
    const L = leaflet.current;
    const m = mapa.current;
    if (!L || !m) return;
    if (!marcador.current) {
      const icono = L.divIcon({ className: 'mapa-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] });
      marcador.current = L.marker([lat, lon], { draggable: true, icon: icono, keyboard: true, title: 'Ubicación de entrega' }).addTo(m);
      marcador.current.on('dragend', () => {
        const p = marcador.current!.getLatLng();
        setCoordenadas({ lat: p.lat, lon: p.lng });
      });
    } else {
      marcador.current.setLatLng([lat, lon]);
    }
    if (centrar) m.setView([lat, lon], 17);
    setCoordenadas({ lat, lon });
  }

  // Autocompletado: espera a que la persona deje de escribir 400 ms antes de consultar
  useEffect(() => {
    if (omitirBusqueda.current) {
      omitirBusqueda.current = false;
      return;
    }
    const q = texto.trim();
    if (q.length < 4) {
      setSugerencias([]);
      return;
    }
    const control = new AbortController();
    const t = setTimeout(async () => {
      setBuscando(true);
      setAviso(null);
      try {
        const url = `${PHOTON_URL}/api/?q=${encodeURIComponent(q)}&limit=6&bbox=${BBOX_MEXICO}`;
        const r = await fetch(url, { signal: control.signal });
        if (!r.ok) throw new Error();
        const datos = await r.json();
        const lista = (datos.features ?? []).map(aLugar).filter(Boolean) as Lugar[];
        setSugerencias(lista);
        setAbierto(true);
        setActivo(-1);
        if (lista.length === 0) setAviso('No encontramos esa dirección. Prueba con calle, número y ciudad, o llena los campos a mano.');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setAviso('El buscador de direcciones no responde. Puedes llenar los campos a mano.');
        }
      } finally {
        setBuscando(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      control.abort();
    };
  }, [texto]);

  function elegir(lugar: Lugar) {
    const f = formulario();
    if (f) {
      const poner = (nombre: string, valor: string) => {
        const campo = f.elements.namedItem(nombre) as HTMLInputElement | HTMLSelectElement | null;
        if (campo && valor) campo.value = valor;
      };
      poner('calle', lugar.calle);
      poner('numero', lugar.numero);
      poner('colonia', lugar.colonia);
      poner('codigoPostal', lugar.codigoPostal);
      poner('ciudad', lugar.ciudad);
      poner('estado', lugar.estado);
    }
    omitirBusqueda.current = true;
    setTexto(lugar.etiqueta);
    setAbierto(false);
    setSugerencias([]);
    colocarMarcador(lugar.lat, lugar.lon);
    const faltan = [!lugar.numero && 'número', !lugar.colonia && 'colonia', !lugar.codigoPostal && 'código postal'].filter(Boolean);
    setAviso(
      faltan.length
        ? `Revisa y completa: ${faltan.join(', ')}. Puedes mover el marcador si la ubicación no es exacta.`
        : 'Revisa los datos. Puedes mover el marcador si la ubicación no es exacta.'
    );
  }

  return (
    <div className="buscador-dir">
      <label htmlFor="dir-buscar">Busca tu dirección (opcional)</label>
      <div className="buscador-dir__campo">
        <input
          id="dir-buscar"
          className="input"
          type="search"
          role="combobox"
          aria-expanded={abierto && sugerencias.length > 0}
          aria-controls="dir-sugerencias"
          aria-autocomplete="list"
          aria-activedescendant={activo >= 0 ? `dir-sug-${activo}` : undefined}
          autoComplete="off"
          placeholder="Ej. Av. Vallarta 1500, Guadalajara"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => sugerencias.length && setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={(e) => {
            if (!abierto || sugerencias.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActivo((i) => (i + 1) % sugerencias.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActivo((i) => (i <= 0 ? sugerencias.length - 1 : i - 1));
            } else if (e.key === 'Enter' && activo >= 0) {
              e.preventDefault();
              elegir(sugerencias[activo]);
            } else if (e.key === 'Escape') {
              setAbierto(false);
            }
          }}
        />
        {buscando && <span className="buscador-dir__cargando">Buscando...</span>}
        {abierto && sugerencias.length > 0 && (
          <ul id="dir-sugerencias" role="listbox" className="buscador-dir__lista">
            {sugerencias.map((s, i) => (
              <li
                key={`${s.lat},${s.lon},${i}`}
                id={`dir-sug-${i}`}
                role="option"
                aria-selected={i === activo}
                className={i === activo ? 'activo' : undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(s);
                }}
              >
                {s.etiqueta}
              </li>
            ))}
          </ul>
        )}
      </div>
      {aviso && (
        <p className="buscador-dir__aviso" role="status">
          {aviso}
        </p>
      )}

      <div ref={contenedorMapa} className="buscador-dir__mapa" aria-label="Mapa de la ubicación de entrega" />
      <p className="buscador-dir__nota">
        {coordenadas
          ? `Ubicación: ${coordenadas.lat.toFixed(5)}, ${coordenadas.lon.toFixed(5)}. Haz clic en el mapa o arrastra el marcador para ajustarla.`
          : 'También puedes hacer clic en el mapa para marcar dónde entregar.'}{' '}
        Búsqueda: Photon · Datos: OpenStreetMap.
      </p>

      {/* Se envían con el formulario y se guardan en la dirección */}
      <input type="hidden" name="latitud" value={coordenadas ? coordenadas.lat.toFixed(6) : ''} />
      <input type="hidden" name="longitud" value={coordenadas ? coordenadas.lon.toFixed(6) : ''} />
    </div>
  );
}
