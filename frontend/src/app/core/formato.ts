const ZONA = 'America/Bogota';

// 7 → "07"
export function dosCifras(numero: number): string {
  return String(numero).padStart(2, '0');
}

export function listaNumeros(numeros: number[]): string {
  return [...numeros].sort((a, b) => a - b).map(dosCifras).join(', ');
}

export function pesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

// 573012516681 → "301 251 6681" · 34612345678 → "+34 612 345 678"
export function telefonoVisible(telefono: string): string {
  if (telefono.length === 11 && telefono.startsWith('34')) {
    const d = telefono.slice(2);
    return `+34 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  const d = telefono.length === 12 && telefono.startsWith('57') ? telefono.slice(2) : telefono;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

// Igual que en el backend: celular de Colombia (→ 57XXXXXXXXXX) o de España (→ 34XXXXXXXXX); null si no es válido.
// El país se reconoce por la cantidad de dígitos: Colombia 10 (empieza por 3), España 9 (empieza por 6 o 7).
export function normalizarTelefono(valor: string): string | null {
  let d = (valor ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (/^573\d{9}$/.test(d) || /^34[67]\d{8}$/.test(d)) return d;
  if (/^3\d{9}$/.test(d)) return `57${d}`;
  if (/^[67]\d{8}$/.test(d)) return `34${d}`;
  return null;
}

export type PaisTelefono = 'CO' | 'ES';

export const PAISES_TELEFONO: { codigo: PaisTelefono; etiqueta: string; placeholder: string }[] = [
  { codigo: 'CO', etiqueta: '🇨🇴 +57', placeholder: '300 123 4567' },
  { codigo: 'ES', etiqueta: '🇪🇸 +34', placeholder: '612 345 678' },
];

// Une el país elegido con lo escrito. Si se escribió el indicativo (+57, +34, 0034…) se respeta tal cual.
export function componerTelefono(pais: PaisTelefono, valor: string): string {
  const texto = (valor ?? '').trim();
  if (texto.startsWith('+') || texto.startsWith('00')) return texto;
  return `${pais === 'ES' ? '+34' : '+57'} ${texto}`;
}

// Separa un número guardado (573…, 34…) en país + número local para mostrarlo en el formulario
export function separarTelefono(telefono: string): { pais: PaisTelefono; numero: string } {
  return telefono.startsWith('34') && telefono.length === 11
    ? { pais: 'ES', numero: telefono.slice(2) }
    : { pais: 'CO', numero: telefono.startsWith('57') ? telefono.slice(2) : telefono };
}

export const ERROR_TELEFONO = 'Celular de Colombia (10 dígitos) o de España (+34, 9 dígitos).';

// "viernes, 31 de octubre de 2026, 11:00 p. m."
export function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeStyle: 'short', timeZone: ZONA }).format(
    new Date(iso),
  );
}

export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: ZONA }).format(
    new Date(iso),
  );
}

export const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
