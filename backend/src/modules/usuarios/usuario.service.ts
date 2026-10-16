import { prisma } from '../../config/database';
import { AppError } from '../../lib/errores';
import { USUARIO_PUBLICO } from '../auth/auth.service';
import { hashPassword } from '../auth/password';
import { UsuarioActualizarDTO, UsuarioCrearDTO } from './usuario.schema';

export class UsuarioService {
    listar() {
        return prisma.usuario.findMany({ select: USUARIO_PUBLICO, orderBy: { nombre: 'asc' } });
    }

    async crear({ nombre, email, password }: UsuarioCrearDTO) {
        const existe = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
        if (existe) throw new AppError(409, 'Ya existe un usuario con ese correo.');
        return prisma.usuario.create({
            data: { nombre, email, passwordHash: await hashPassword(password) },
            select: USUARIO_PUBLICO,
        });
    }

    async actualizar(id: string, dto: UsuarioActualizarDTO, usuarioSesionId: string) {
        const usuario = await prisma.usuario.findUnique({ where: { id }, select: { id: true, activo: true } });
        if (!usuario) throw new AppError(404, 'Usuario no encontrado.');

        if (dto.activo === false && usuario.activo) {
            if (id === usuarioSesionId) throw new AppError(409, 'No puede desactivar su propio usuario.');
            const activos = await prisma.usuario.count({ where: { activo: true } });
            if (activos <= 1) throw new AppError(409, 'Debe quedar al menos un administrador activo.');
        }

        return prisma.usuario.update({
            where: { id },
            data: {
                nombre: dto.nombre,
                activo: dto.activo,
                ...(dto.password ? { passwordHash: await hashPassword(dto.password) } : {}),
            },
            select: USUARIO_PUBLICO,
        });
    }
}
