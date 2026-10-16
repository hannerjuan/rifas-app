import { z } from 'zod';
import { PasswordSchema } from '../auth/password';

const NombreSchema = z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(80);

export const UsuarioCrearSchema = z.object({
    nombre: NombreSchema,
    email: z.string().trim().toLowerCase().email('Ingrese un correo válido'),
    password: PasswordSchema,
});

export const UsuarioActualizarSchema = z.object({
    nombre: NombreSchema.optional(),
    activo: z.boolean().optional(),
    password: PasswordSchema.optional(), // restablecer la contraseña de otro administrador
});

export type UsuarioCrearDTO = z.infer<typeof UsuarioCrearSchema>;
export type UsuarioActualizarDTO = z.infer<typeof UsuarioActualizarSchema>;
