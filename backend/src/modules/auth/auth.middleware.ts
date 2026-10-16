import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../config/env';
import { prisma } from '../../config/database';

// Exige un JWT válido (Authorization: Bearer <token>) de un usuario activo.
// El usuario se consulta en cada petición para que una desactivación aplique de inmediato.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Debe iniciar sesión para acceder a este recurso.' });
    }

    try {
        const payload = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
        const usuario = await prisma.usuario.findUnique({
            where: { id: String(payload.sub) },
            select: { id: true, nombre: true, email: true, activo: true },
        });
        if (!usuario || !usuario.activo) {
            return res.status(401).json({ success: false, error: 'Su usuario está inactivo.' });
        }
        req.usuario = { id: usuario.id, nombre: usuario.nombre, email: usuario.email };
        next();
    } catch {
        res.status(401).json({ success: false, error: 'Su sesión expiró o no es válida. Inicie sesión nuevamente.' });
    }
}
