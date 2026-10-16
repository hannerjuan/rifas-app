import { EstadoBoleta } from '@prisma/client';
import { ZONA_HORARIA } from '../config/env';

// 7 → "07"
export function formatoNumero(numero: number): string {
    return String(numero).padStart(2, '0');
}

export function formatoPesos(valor: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
}

export function formatoFecha(fecha: Date, conHora = true): string {
    return new Intl.DateTimeFormat('es-CO', {
        timeZone: ZONA_HORARIA,
        dateStyle: 'long',
        ...(conHora ? { timeStyle: 'short' } : {}),
    }).format(fecha);
}

export const ETIQUETA_ESTADO: Record<EstadoBoleta, string> = {
    DISPONIBLE: 'Disponible',
    RESERVADA: 'Reservada',
    PAGADA: 'Pagada',
};
