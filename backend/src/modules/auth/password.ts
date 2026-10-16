import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { BCRYPT_ROUNDS } from '../../config/env';

// Política mínima de contraseñas
export const PasswordSchema = z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede superar 72 caracteres') // límite de bcrypt
    .regex(/[A-Za-z]/, 'La contraseña debe contener al menos una letra')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número');

export function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Hash de referencia cuando el usuario no existe: el login tarda lo mismo y no revela qué correos existen
const HASH_FICTICIO = bcrypt.hashSync('usuario-inexistente-rifas', BCRYPT_ROUNDS);

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
    try {
        return await bcrypt.compare(password, hash ?? HASH_FICTICIO);
    } catch {
        return false;
    }
}
