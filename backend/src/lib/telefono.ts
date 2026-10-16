import { z } from 'zod';

// Convierte "301 251-6681", "+57 3012516681", "573012516681"... al formato 573012516681.
// Solo se aceptan celulares colombianos (10 dígitos que empiezan por 3), que es lo que usa WhatsApp.
export function normalizarTelefono(valor: string): string | null {
    let digitos = valor.replace(/\D/g, '');
    if (digitos.length === 12 && digitos.startsWith('57')) digitos = digitos.slice(2);
    if (!/^3\d{9}$/.test(digitos)) return null;
    return `57${digitos}`;
}

// 573012516681 → "301 251 6681"
export function formatoTelefono(telefono: string): string {
    const d = telefono.startsWith('57') ? telefono.slice(2) : telefono;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export const TelefonoSchema = z
    .string({ error: 'Ingrese el número de WhatsApp' })
    .trim()
    .transform((valor, ctx) => {
        const normalizado = normalizarTelefono(valor);
        if (!normalizado) {
            ctx.addIssue({ code: 'custom', message: 'Ingrese un celular colombiano válido (10 dígitos, empieza por 3)' });
            return z.NEVER;
        }
        return normalizado;
    });
