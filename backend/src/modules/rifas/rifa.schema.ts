import { z } from 'zod';
import { TelefonoSchema } from '../../lib/telefono';

const textoOpcional = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .nullish()
        .transform((v) => v || null);

const urlOpcional = z
    .union([z.literal(''), z.url('Ingrese una URL válida (https://...)')])
    .nullish()
    .transform((v) => v || null);

export const RifaCrearSchema = z.object({
    nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(120),
    premioNombre: z.string().trim().min(2, 'Ingrese el premio').max(120),
    premioDescripcion: textoOpcional(1000),
    premioUrl: urlOpcional,
    premioImagenUrl: urlOpcional,
    valorBoleta: z.coerce
        .number({ error: 'Ingrese el valor de la boleta' })
        .int('El valor debe ser un número entero')
        .min(100, 'El valor mínimo es $100')
        .max(100_000_000, 'Valor demasiado alto'),
    fechaSorteo: z.coerce.date({ error: 'Ingrese una fecha válida' }),
    loteria: z.string().trim().min(3, 'Seleccione la lotería').max(80),
    responsableNombre: z.string().trim().min(3, 'Ingrese el nombre del responsable').max(80),
    responsableTelefono: TelefonoSchema,
    cuentasPago: textoOpcional(500),
});

export const RifaActualizarSchema = RifaCrearSchema.partial();

const NombreCompradorSchema = z
    .string({ error: 'Ingrese el nombre completo' })
    .trim()
    .min(3, 'Ingrese el nombre completo')
    .max(100);

const NumerosSchema = z
    .array(z.number().int().min(0).max(99), { error: 'Seleccione los números' })
    .min(1, 'Seleccione al menos un número')
    .max(100)
    .refine((a) => new Set(a).size === a.length, 'Hay números repetidos');

export const VentaCrearSchema = z.object({
    numeros: NumerosSchema,
    nombre: NombreCompradorSchema,
    telefono: TelefonoSchema,
    estado: z.enum(['RESERVADA', 'PAGADA'], { error: 'Indique si las boletas quedan reservadas o pagadas' }),
});

export const VentaEditarSchema = z.object({
    nombre: NombreCompradorSchema,
    telefono: TelefonoSchema,
});

export const CambioEstadoSchema = z.object({
    numeros: NumerosSchema,
    estado: z.enum(['DISPONIBLE', 'RESERVADA', 'PAGADA']),
    motivo: textoOpcional(200),
});

export const FinalizarSchema = z.object({
    resultadoLoteria: z
        .string({ error: 'Ingrese el resultado de la lotería' })
        .trim()
        .regex(/^\d{4}$/, 'El resultado debe tener exactamente 4 cifras'),
});

export type RifaCrearDTO = z.infer<typeof RifaCrearSchema>;
export type RifaActualizarDTO = z.infer<typeof RifaActualizarSchema>;
export type VentaCrearDTO = z.infer<typeof VentaCrearSchema>;
export type VentaEditarDTO = z.infer<typeof VentaEditarSchema>;
export type CambioEstadoDTO = z.infer<typeof CambioEstadoSchema>;
