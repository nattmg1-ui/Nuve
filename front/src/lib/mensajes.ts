// Redirecciones con mensaje (?ok=... / ?error=...) para los formularios del panel.
// Soporta rutas con ancla (/operador#inventario): el query va ANTES del "#".
export function conMensaje(ruta: string, tipo: 'ok' | 'error', texto: string) {
  const [base, ancla] = ruta.split('#');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${tipo}=${encodeURIComponent(texto)}${ancla ? `#${ancla}` : ''}`;
}
