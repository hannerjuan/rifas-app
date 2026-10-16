import jwt from 'jsonwebtoken';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../../config/env';
import { prisma } from '../../config/database';
import { AppError } from '../../lib/errores';
import { CambiarPasswordDTO, LoginDTO } from './auth.schema';
import { hashPassword, verifyPassword } from './password';

export const USUARIO_PUBLICO = { id: true, nombre: true, email: true, activo: true, createdAt: true } as const;

export class AuthService {
    // Inicio de sesión: devuelve el JWT y los datos del usuario (sin el hash)
    async login({ email, password }: LoginDTO) {
        const usuario = await prisma.usuario.findUnique({
            where: { email },
            select: { ...USUARIO_PUBLICO, passwordHash: true },
        });

        // Se verifica siempre la contraseña (aunque el usuario no exista) para no revelar qué correos existen
        const valida = await verifyPassword(password, usuario?.passwordHash);
        if (!usuario || !valida) throw new AppError(401, 'Correo o contraseña incorrectos.');
        if (!usuario.activo) throw new AppError(401, 'Su usuario está inactivo.');

        const token = jwt.sign({}, JWT_SECRET, { subject: usuario.id, expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' });
        const { passwordHash: _omitido, ...datos } = usuario;
        return { token, usuario: datos };
    }

    async me(usuarioId: string) {
        return prisma.usuario.findUnique({ where: { id: usuarioId }, select: USUARIO_PUBLICO });
    }

    async cambiarPassword(usuarioId: string, { actual, nueva }: CambiarPasswordDTO) {
        const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { passwordHash: true } });
        if (!usuario || !(await verifyPassword(actual, usuario.passwordHash))) {
            throw new AppError(400, 'La contraseña actual no es correcta.');
        }
        await prisma.usuario.update({ where: { id: usuarioId }, data: { passwordHash: await hashPassword(nueva) } });
    }
}
