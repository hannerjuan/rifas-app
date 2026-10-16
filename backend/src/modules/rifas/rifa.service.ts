import { EstadoBoleta, Prisma, Rifa } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../lib/errores';
import { notificarCambio } from '../../lib/eventos';
import { formatoFecha, formatoNumero } from '../../lib/formato';
import { verificarRifaActiva } from './boleta-estado';
import { RifaActualizarDTO, RifaCrearDTO } from './rifa.schema';

export const TOTAL_BOLETAS = 100;

export interface Metricas {
    disponibles: number;
    reservadas: number;
    pagadas: number;
    recaudado: number; // pagadas × valor
    porCobrar: number; // reservadas × valor
    potencial: number; // 100 × valor
}

export function calcularMetricas(conteo: Partial<Record<EstadoBoleta, number>>, valorBoleta: number): Metricas {
    const reservadas = conteo.RESERVADA ?? 0;
    const pagadas = conteo.PAGADA ?? 0;
    return {
        disponibles: conteo.DISPONIBLE ?? 0,
        reservadas,
        pagadas,
        recaudado: pagadas * valorBoleta,
        porCobrar: reservadas * valorBoleta,
        potencial: TOTAL_BOLETAS * valorBoleta,
    };
}

// Conteo de boletas por estado de varias rifas en una sola consulta
export async function conteoPorRifa(rifaIds: string[]) {
    const grupos = await prisma.boleta.groupBy({
        by: ['rifaId', 'estado'],
        where: { rifaId: { in: rifaIds } },
        _count: { _all: true },
    });
    const mapa = new Map<string, Partial<Record<EstadoBoleta, number>>>();
    for (const g of grupos) {
        const conteo = mapa.get(g.rifaId) ?? {};
        conteo[g.estado] = g._count._all;
        mapa.set(g.rifaId, conteo);
    }
    return mapa;
}

export async function buscarRifa(id: string): Promise<Rifa> {
    const rifa = await prisma.rifa.findUnique({ where: { id } });
    if (!rifa) throw new AppError(404, 'Rifa no encontrada.');
    return rifa;
}

export class RifaService {
    // Activas (próximo sorteo primero) o historial (finalizadas y canceladas, la más reciente primero)
    async listar(vista: 'activas' | 'historial') {
        const rifas = await prisma.rifa.findMany({
            where: vista === 'activas' ? { estado: 'ACTIVA' } : { estado: { in: ['FINALIZADA', 'CANCELADA'] } },
            orderBy: { fechaSorteo: vista === 'activas' ? 'asc' : 'desc' },
        });
        const conteos = await conteoPorRifa(rifas.map((r) => r.id));
        return rifas.map((r) => ({ ...r, metricas: calcularMetricas(conteos.get(r.id) ?? {}, r.valorBoleta) }));
    }

    async obtener(id: string) {
        const rifa = await buscarRifa(id);
        const conteos = await conteoPorRifa([id]);
        return { ...rifa, metricas: calcularMetricas(conteos.get(id) ?? {}, rifa.valorBoleta) };
    }

    async metricas(id: string) {
        const rifa = await buscarRifa(id);
        const conteos = await conteoPorRifa([id]);
        return calcularMetricas(conteos.get(id) ?? {}, rifa.valorBoleta);
    }

    // Crea la rifa con sus 100 boletas disponibles
    async crear(dto: RifaCrearDTO, usuarioId: string) {
        if (dto.fechaSorteo <= new Date()) throw new AppError(400, 'La fecha del sorteo debe ser posterior a hoy.');

        const rifa = await prisma.$transaction(async (tx) => {
            const nueva = await tx.rifa.create({ data: { ...dto, creadaPorId: usuarioId } });
            await tx.boleta.createMany({
                data: Array.from({ length: TOTAL_BOLETAS }, (_, numero) => ({ rifaId: nueva.id, numero })),
            });
            return nueva;
        });
        return this.obtener(rifa.id);
    }

    async actualizar(id: string, dto: RifaActualizarDTO) {
        const rifa = await buscarRifa(id);
        verificarRifaActiva(rifa);

        // El valor de la boleta queda fijo desde la primera venta
        if (dto.valorBoleta !== undefined && dto.valorBoleta !== rifa.valorBoleta) {
            const vendidas = await prisma.boleta.count({ where: { rifaId: id, estado: { not: 'DISPONIBLE' } } });
            if (vendidas > 0) {
                throw new AppError(409, 'El valor de la boleta no se puede cambiar porque ya hay boletas vendidas.');
            }
        }
        if (dto.fechaSorteo && dto.fechaSorteo.getTime() !== rifa.fechaSorteo.getTime() && dto.fechaSorteo <= new Date()) {
            throw new AppError(400, 'La fecha del sorteo debe ser posterior a hoy.');
        }

        await prisma.rifa.update({ where: { id }, data: dto });
        notificarCambio(id);
        return this.obtener(id);
    }

    async cancelar(id: string) {
        const rifa = await buscarRifa(id);
        verificarRifaActiva(rifa);
        await prisma.rifa.update({ where: { id }, data: { estado: 'CANCELADA', canceladaEn: new Date() } });
        notificarCambio(id);
        return this.obtener(id);
    }

    // Matriz completa 00-99 con los datos del comprador
    async boletas(id: string) {
        await buscarRifa(id);
        return prisma.boleta.findMany({
            where: { rifaId: id },
            orderBy: { numero: 'asc' },
            select: {
                id: true,
                numero: true,
                estado: true,
                reservadaEn: true,
                pagadaEn: true,
                venta: { select: { id: true, nombre: true, telefono: true } },
            },
        });
    }

    // Registra el resultado de la lotería: gana la boleta con las dos últimas cifras.
    // Si esa boleta no está pagada, el premio queda para el vendedor (resultado CASA).
    async finalizar(id: string, resultadoLoteria: string) {
        const rifa = await buscarRifa(id);
        verificarRifaActiva(rifa);
        if (new Date() < rifa.fechaSorteo) {
            throw new AppError(409, `El sorteo aún no se ha jugado (${formatoFecha(rifa.fechaSorteo)}).`);
        }

        const numeroGanador = Number(resultadoLoteria.slice(-2));
        const boleta = await prisma.boleta.findUnique({
            where: { rifaId_numero: { rifaId: id, numero: numeroGanador } },
            include: { venta: true },
        });
        const pagada = boleta?.estado === 'PAGADA' && boleta.venta;

        const data: Prisma.RifaUpdateManyMutationInput = {
            estado: 'FINALIZADA',
            resultadoLoteria,
            numeroGanador,
            resultado: pagada ? 'GANADOR' : 'CASA',
            ganadorNombre: pagada ? boleta.venta!.nombre : null,
            ganadorTelefono: pagada ? boleta.venta!.telefono : null,
            finalizadaEn: new Date(),
        };
        // Condición sobre el estado para que dos cierres simultáneos no se pisen
        const { count } = await prisma.rifa.updateMany({ where: { id, estado: 'ACTIVA' }, data });
        if (count === 0) throw new AppError(409, 'La rifa ya fue finalizada.');

        notificarCambio(id);
        console.log(`[RIFAS] Rifa ${rifa.nombre} finalizada: ${resultadoLoteria} → ${formatoNumero(numeroGanador)}`);
        return this.obtener(id);
    }
}
