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

// 573012516681 → "301 251 6681"
export function telefonoVisible(telefono: string): string {
  const d = telefono.length === 12 && telefono.startsWith('57') ? telefono.slice(2) : telefono;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

// Igual que en el backend: celular colombiano → 57XXXXXXXXXX, o null si no es válido
export function normalizarTelefono(valor: string): string | null {
  let d = (valor ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
  return /^3\d{9}$/.test(d) ? `57${d}` : null;
}

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
