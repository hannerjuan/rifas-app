import { EstadoBoleta, Rifa } from '@prisma/client';
import { AppError } from '../../lib/errores';
import { formatoFecha } from '../../lib/formato';

// Cambios manuales permitidos. Una boleta DISPONIBLE solo sale de ese estado mediante una venta
// (que exige nombre y WhatsApp del comprador).
export const TRANSICIONES: Record<EstadoBoleta, EstadoBoleta[]> = {
    DISPONIBLE: [],
    RESERVADA: ['PAGADA', 'DISPONIBLE'],
    PAGADA: ['RESERVADA', 'DISPONIBLE'],
};

// Ventas y cambios de estado solo con la rifa activa y antes de la hora del sorteo:
// así nadie puede marcar como pagada una boleta después de conocer el resultado.
export function verificarRifaAbierta(rifa: Pick<Rifa, 'estado' | 'fechaSorteo'>) {
    if (rifa.estado !== 'ACTIVA') {
        throw new AppError(409, `La rifa está ${rifa.estado === 'FINALIZADA' ? 'finalizada' : 'cancelada'} y no admite cambios.`);
    }
    if (new Date() >= rifa.fechaSorteo) {
        throw new AppError(
            409,
            `El sorteo ya se jugó (${formatoFecha(rifa.fechaSorteo)}). No se pueden vender ni cambiar boletas; registre el resultado.`
        );
    }
}

export function verificarRifaActiva(rifa: Pick<Rifa, 'estado'>) {
    if (rifa.estado !== 'ACTIVA') {
        throw new AppError(409, `La rifa está ${rifa.estado === 'FINALIZADA' ? 'finalizada' : 'cancelada'} y no admite cambios.`);
    }
}
