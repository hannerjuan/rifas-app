import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

// Error de negocio con código HTTP: el manejador global lo convierte en { success: false, error }
export class AppError extends Error {
    constructor(
        public readonly status: number,
        message: string
    ) {
        super(message);
    }
}

// Express 5 envía aquí los errores lanzados (también los de funciones async)
export function manejadorErrores(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            error: 'Datos de validación inválidos',
            detalles: err.issues.map((e) => ({ campo: e.path.join('.'), mensaje: e.message })),
        });
    }
    if (err instanceof AppError) {
        return res.status(err.status).json({ success: false, error: err.message });
    }
    if ((err as { type?: string })?.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, error: 'El cuerpo de la petición no es un JSON válido' });
    }
    console.error('[RIFAS]', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
}
