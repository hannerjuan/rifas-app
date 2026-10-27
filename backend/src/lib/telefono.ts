import { z } from 'zod';

// Celulares aceptados (los que se usan con WhatsApp), guardados con el indicativo y sin "+":
//   Colombia: 10 dígitos que empiezan por 3          → 57XXXXXXXXXX
//   España:   9 dígitos que empiezan por 6 o 7        → 34XXXXXXXXX
// Acepta espacios, guiones, "+57", "+34" o "0034". Como un número colombiano tiene 10 dígitos y uno
// español 9, el país se reconoce sin ambigüedad aunque se escriba sin indicativo.
export function normalizarTelefono(valor: string): string | null {
    let d = valor.replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (/^573\d{9}$/.test(d) || /^34[67]\d{8}$/.test(d)) return d;
    if (/^3\d{9}$/.test(d)) return `57${d}`;
    if (/^[67]\d{8}$/.test(d)) return `34${d}`;
    return null;
}

// 573012516681 → "301 251 6681" · 34612345678 → "+34 612 345 678"
export function formatoTelefono(telefono: string): string {
    if (telefono.length === 11 && telefono.startsWith('34')) {
        const d = telefono.slice(2);
        return `+34 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    }
    const d = telefono.startsWith('57') ? telefono.slice(2) : telefono;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export const MENSAJE_TELEFONO = 'Ingrese un celular válido de Colombia (10 dígitos, empieza por 3) o de España (9 dígitos, empieza por 6 o 7)';

export const TelefonoSchema = z
    .string({ error: 'Ingrese el número de WhatsApp' })
    .trim()
    .transform((valor, ctx) => {
        const normalizado = normalizarTelefono(valor);
        if (!normalizado) {
            ctx.addIssue({ code: 'custom', message: MENSAJE_TELEFONO });
            return z.NEVER;
        }
        return normalizado;
    });
