import { z } from 'zod';
import { PasswordSchema } from './password';

export const LoginSchema = z.object({
    email: z.string().trim().toLowerCase().email('Ingrese un correo válido'),
    password: z.string().min(1, 'Ingrese su contraseña'),
});

export const CambiarPasswordSchema = z.object({
    actual: z.string().min(1, 'Ingrese su contraseña actual'),
    nueva: PasswordSchema,
});

export type LoginDTO = z.infer<typeof LoginSchema>;
export type CambiarPasswordDTO = z.infer<typeof CambiarPasswordSchema>;
